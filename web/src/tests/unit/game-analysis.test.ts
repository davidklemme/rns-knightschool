import { describe, it, expect } from 'vitest';
import { createEngine } from '@/lib/chess/engine';
import {
  analyzeGame,
  classifyMove,
  pvToSan,
  type PositionAnalyzer,
} from '@/lib/analysis/game-analysis';
import { explainMove, type ExplainContext } from '@/lib/analysis/explanations';
import type { PositionAnalysis } from '@/lib/chess/opponent-engine';
import type { ChessMove } from '@/lib/chess/types';

/**
 * Game analysis tests: what the player learns from a review.
 *
 * The analyzer is a lookup table keyed by FEN - no Stockfish worker. The
 * evals are hand-written to mirror what the engine would say about the
 * scripted games, so the tests pin the classification and explanation
 * logic, not engine strength.
 */

const evalOf = (
  score: number,
  bestMove: string | null = null,
  pv: string[] = [],
  mate: number | null = null
): PositionAnalysis => ({ score, mate, depth: 12, bestMove, pv });

/** Replay SAN moves from the start, returning the moves and each position. */
const playGame = (sans: string[]): { moves: ChessMove[]; fens: string[] } => {
  const engine = createEngine();
  const moves: ChessMove[] = [];
  const fens: string[] = [engine.fen];
  for (const san of sans) {
    const move = engine.moveSan(san);
    if (!move) throw new Error(`Illegal test move: ${san}`);
    moves.push(move);
    fens.push(engine.fen);
  }
  return { moves, fens };
};

const analyzerFromTable = (table: Map<string, PositionAnalysis>): PositionAnalyzer =>
  async (fen) => table.get(fen) ?? null;

describe('classifyMove', () => {
  it('grades moves by how much evaluation the mover threw away', () => {
    const ctx = { missedMate: false, allowedMate: false };
    expect(classifyMove(0, false, ctx)).toBe('good');
    expect(classifyMove(49, false, ctx)).toBe('good');
    expect(classifyMove(50, false, ctx)).toBe('inaccuracy');
    expect(classifyMove(149, false, ctx)).toBe('inaccuracy');
    expect(classifyMove(150, false, ctx)).toBe('mistake');
    expect(classifyMove(299, false, ctx)).toBe('mistake');
    expect(classifyMove(300, false, ctx)).toBe('blunder');
  });

  it('marks the engine move as best regardless of eval noise', () => {
    expect(classifyMove(40, true, { missedMate: false, allowedMate: false })).toBe('best');
  });

  it('never grades a missed forced mate better than a mistake', () => {
    // Dropping a mate while still up a queen barely moves the centipawns
    expect(classifyMove(10, false, { missedMate: true, allowedMate: false })).toBe('mistake');
  });

  it('always grades a move that walks into forced mate as a blunder', () => {
    expect(classifyMove(10, false, { missedMate: false, allowedMate: true })).toBe('blunder');
  });
});

describe('pvToSan', () => {
  it('converts an engine line to readable notation', () => {
    const start = createEngine().fen;
    expect(pvToSan(start, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('stops at the first move that does not replay', () => {
    const start = createEngine().fen;
    expect(pvToSan(start, ['e2e4', 'e2e4'])).toEqual(['e4']);
  });
});

describe('analyzeGame', () => {
  // 1. e4 e5 2. Qh5 g6?? 3. Qxe5+ - the classic club-level disaster:
  // g6 attacks the queen but hangs the e5 pawn with a royal fork behind it
  const scriptedGame = () => {
    const { moves, fens } = playGame(['e4', 'e5', 'Qh5', 'g6', 'Qxe5+']);
    const table = new Map<string, PositionAnalysis>([
      [fens[0], evalOf(30, 'e2e4', ['e2e4', 'e7e5'])],
      [fens[1], evalOf(25, 'e7e5', ['e7e5'])],
      [fens[2], evalOf(30, 'g1f3', ['g1f3', 'b8c6'])],
      [fens[3], evalOf(-20, 'b8c6', ['b8c6'])],
      // After g6 white wins the e5 pawn with a fork on king and rook
      [fens[4], evalOf(320, 'h5e5', ['h5e5', 'd8e7'])],
      [fens[5], evalOf(310, 'd8e7', ['d8e7'])],
    ]);
    return { moves, analyze: analyzerFromTable(table) };
  };

  it('flags the losing move as a blunder and explains the tactic behind it', async () => {
    const { moves, analyze } = scriptedGame();
    const analysis = await analyzeGame(moves, analyze);

    expect(analysis).not.toBeNull();
    const g6 = analysis!.moves[3];
    expect(g6.move.san).toBe('g6');
    expect(g6.color).toBe('b');
    expect(g6.classification).toBe('blunder');
    expect(g6.cpLoss).toBe(340);
    // Not just "you lost 3.4 pawns" - the tactical implication
    expect(g6.explanation).toContain('Qxe5+');
    expect(g6.explanation).toContain('forks your king and rook');
  });

  it('recognizes when the player finds the engine move', async () => {
    const { moves, analyze } = scriptedGame();
    const analysis = await analyzeGame(moves, analyze);

    const qxe5 = analysis!.moves[4];
    expect(qxe5.move.san).toBe('Qxe5+');
    expect(qxe5.classification).toBe('best');
    expect(qxe5.explanation).toBeNull();
  });

  it('summarizes error counts per side and signs the analyzed game', async () => {
    const { moves, analyze } = scriptedGame();
    const analysis = await analyzeGame(moves, analyze);

    expect(analysis!.counts.b.blunder).toBe(1);
    expect(analysis!.counts.w.blunder).toBe(0);
    expect(analysis!.signature).toBe('e4 e5 Qh5 g6 Qxe5+');
  });

  it('names the better move for a flagged move without a detected tactic', async () => {
    const { moves, analyze } = scriptedGame();
    const analysis = await analyzeGame(moves, analyze);

    // Qh5 loses 50cp (30 -> -20): an inaccuracy, explained via the engine line
    const qh5 = analysis!.moves[2];
    expect(qh5.classification).toBe('inaccuracy');
    expect(qh5.bestMoveSan).toBe('Nf3');
    expect(qh5.explanation).toContain('Nf3');
  });

  it('returns null when cancelled instead of a half-finished review', async () => {
    const { moves, analyze } = scriptedGame();
    let calls = 0;
    const countingAnalyze: PositionAnalyzer = (fen) => {
      calls++;
      return analyze(fen);
    };

    const analysis = await analyzeGame(
      moves,
      countingAnalyze,
      undefined,
      () => calls >= 2
    );
    expect(analysis).toBeNull();
  });
});

describe('explainMove', () => {
  const baseContext = (over: Partial<ExplainContext>): ExplainContext => ({
    fenBefore: '',
    fenAfter: '',
    move: {} as ChessMove,
    mover: 'w',
    classification: 'blunder',
    evalBefore: evalOf(0),
    evalAfter: evalOf(0),
    bestMoveUci: null,
    bestMoveSan: null,
    bestLineSan: [],
    refutationUci: null,
    missedMate: false,
    allowedMate: false,
    ...over,
  });

  it('says nothing about fine moves', () => {
    expect(explainMove(baseContext({ classification: 'good' }))).toBeNull();
    expect(explainMove(baseContext({ classification: 'best' }))).toBeNull();
  });

  it('calls out a hung piece and the capture that punishes it', () => {
    // 1. e4 d5 2. Qg4?? - the queen walks into the c8 bishop's diagonal
    const { moves, fens } = playGame(['e4', 'd5', 'Qg4']);
    const explanation = explainMove(
      baseContext({
        fenBefore: fens[2],
        fenAfter: fens[3],
        move: moves[2],
        mover: 'w',
        refutationUci: 'c8g4',
      })
    );

    expect(explanation).toContain('hangs your queen on g4');
    expect(explanation).toContain('Bxg4');
  });

  it('calls out a missed free capture', () => {
    // Same position from black's side: instead of Bxg4, black plays h6??
    const { fens } = playGame(['e4', 'd5', 'Qg4']);
    const after = createEngine(fens[3]);
    const h6 = after.moveSan('h6')!;

    const explanation = explainMove(
      baseContext({
        fenBefore: fens[3],
        fenAfter: after.fen,
        move: h6,
        mover: 'b',
        classification: 'mistake',
        bestMoveUci: 'c8g4',
        bestMoveSan: 'Bxg4',
      })
    );

    expect(explanation).toContain('Bxg4');
    expect(explanation).toContain('winning the queen on g4 for free');
  });

  it('announces a missed forced mate with the move that starts it', () => {
    const explanation = explainMove(
      baseContext({
        missedMate: true,
        evalBefore: evalOf(10000, 'd1h5', [], 2),
        bestMoveSan: 'Qh5+',
      })
    );
    expect(explanation).toBe('You had a forced mate in 2, starting with Qh5+.');
  });
});
