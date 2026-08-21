import { createEngine } from '@/lib/chess/engine';
import type { ChessEngine } from '@/lib/chess/engine';
import type { PositionAnalysis } from '@/lib/chess/opponent-engine';
import type { ChessMove, Color, Square, PieceType } from '@/lib/chess/types';
import { explainMove } from './explanations';

/**
 * Post-game analysis for RnS KnightSchool
 *
 * Replays a finished (or in-progress) game, evaluates every position at
 * full engine strength, and classifies each move by how much evaluation
 * the mover threw away - the same idea as lichess/chess.com game review.
 *
 * The "why" behind each bad move comes from explainMove(), which runs the
 * app's existing tactic/safety detectors on the engine's best move and on
 * the opponent's refutation to turn raw eval swings into concrete advice
 * ("Qe5+ forks king and rook") instead of just numbers.
 */

export type MoveClassification = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface AnalyzedMove {
  index: number; // ply index (0 = white's first move)
  move: ChessMove;
  color: Color; // who moved
  fenBefore: string;
  fenAfter: string;
  evalBefore: PositionAnalysis; // white's perspective
  evalAfter: PositionAnalysis; // white's perspective
  cpLoss: number; // centipawns the mover gave away (>= 0)
  classification: MoveClassification;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  bestLineSan: string[]; // engine's best line from the position before the move
  explanation: string | null; // concrete advice, null for fine moves
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  counts: Record<Color, Record<MoveClassification, number>>;
  /** Joined SAN of the analyzed moves - used to detect stale analyses */
  signature: string;
}

export type PositionAnalyzer = (fen: string) => Promise<PositionAnalysis | null>;

// Centipawn-loss thresholds. Tuned for club-level review (~1000-1500):
// half-pawn drift is normal play there, the lessons live in the big swings.
const THRESHOLDS: { limit: number; classification: MoveClassification }[] = [
  { limit: 50, classification: 'good' },
  { limit: 150, classification: 'inaccuracy' },
  { limit: 300, classification: 'mistake' },
  { limit: Infinity, classification: 'blunder' },
];

const CLASSIFICATION_ORDER: MoveClassification[] = [
  'best',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

const atLeast = (
  a: MoveClassification,
  b: MoveClassification
): MoveClassification =>
  CLASSIFICATION_ORDER.indexOf(a) >= CLASSIFICATION_ORDER.indexOf(b) ? a : b;

/** Score from the mover's perspective, mate-aware (mate ≈ ±10000). */
const moverScore = (analysis: PositionAnalysis, mover: Color): number =>
  mover === 'w' ? analysis.score : -analysis.score;

/** Is there a forced mate in favor of `color`? */
export const hasMateFor = (analysis: PositionAnalysis, color: Color): boolean =>
  analysis.mate !== null &&
  ((color === 'w' && analysis.mate > 0) || (color === 'b' && analysis.mate < 0));

const uciOf = (move: ChessMove): string =>
  `${move.from}${move.to}${move.promotion ?? ''}`;

export const classifyMove = (
  cpLoss: number,
  playedEngineMove: boolean,
  context: { missedMate: boolean; allowedMate: boolean }
): MoveClassification => {
  if (playedEngineMove) return 'best';

  let classification: MoveClassification = 'blunder';
  for (const { limit, classification: c } of THRESHOLDS) {
    if (cpLoss < limit) {
      classification = c;
      break;
    }
  }

  // Mate-aware floors: eval alone can undersell these (e.g. dropping a
  // forced mate while still up material barely moves the centipawn score)
  if (context.missedMate) classification = atLeast(classification, 'mistake');
  if (context.allowedMate) classification = atLeast(classification, 'blunder');

  return classification;
};

/** Convert a UCI line into SANs by replaying it (stops at the first illegal move). */
export const pvToSan = (fen: string, pv: string[], maxPlies = 6): string[] => {
  const engine = createEngine(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, maxPlies)) {
    const move = engine.move(
      uci.slice(0, 2) as Square,
      uci.slice(2, 4) as Square,
      uci.length > 4 ? (uci[4] as PieceType) : undefined
    );
    if (!move) break;
    sans.push(move.san);
  }
  return sans;
};

/** Eval for a game-over position where the engine has nothing to search. */
const terminalAnalysis = (engine: ChessEngine): PositionAnalysis => {
  if (engine.isCheckmate) {
    const whiteIsMated = engine.turn === 'w';
    return {
      score: whiteIsMated ? -10000 : 10000,
      mate: 0,
      depth: 0,
      bestMove: null,
      pv: [],
    };
  }
  return { score: 0, mate: null, depth: 0, bestMove: null, pv: [] };
};

/**
 * Analyze a full game.
 *
 * Evaluates moves.length + 1 positions sequentially (the engine queue is
 * serial anyway). onProgress fires after each position; shouldCancel is
 * checked between positions and makes the function return null.
 */
export async function analyzeGame(
  moves: ChessMove[],
  analyze: PositionAnalyzer,
  onProgress?: (done: number, total: number) => void,
  shouldCancel?: () => boolean
): Promise<GameAnalysis | null> {
  const engine = createEngine();
  const total = moves.length + 1;

  // Pass 1: replay the game, evaluating every position
  const fens: string[] = [];
  const evals: PositionAnalysis[] = [];

  for (let i = 0; i <= moves.length; i++) {
    if (shouldCancel?.()) return null;

    fens.push(engine.fen);

    let analysis: PositionAnalysis | null = null;
    if (engine.isGameOver) {
      analysis = terminalAnalysis(engine);
    } else {
      analysis = (await analyze(engine.fen)) ?? (await analyze(engine.fen));
    }
    // Engine hiccup: carry the previous eval so one bad search doesn't
    // produce a phantom blunder
    if (!analysis) {
      analysis = evals[i - 1]
        ? { ...evals[i - 1], bestMove: null, pv: [] }
        : { score: 0, mate: null, depth: 0, bestMove: null, pv: [] };
    }
    evals.push(analysis);
    onProgress?.(i + 1, total);

    if (i < moves.length) {
      const applied = engine.move(moves[i].from, moves[i].to, moves[i].promotion);
      if (!applied) {
        // History doesn't replay - analysis would be garbage from here on
        return null;
      }
    }
  }

  // Pass 2: classify and explain each move
  const analyzed: AnalyzedMove[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const mover: Color = i % 2 === 0 ? 'w' : 'b';
    const opponent: Color = mover === 'w' ? 'b' : 'w';
    const evalBefore = evals[i];
    const evalAfter = evals[i + 1];

    const cpLoss = Math.max(
      0,
      moverScore(evalBefore, mover) - moverScore(evalAfter, mover)
    );

    const missedMate = hasMateFor(evalBefore, mover) && !hasMateFor(evalAfter, mover);
    const allowedMate =
      hasMateFor(evalAfter, opponent) && !hasMateFor(evalBefore, opponent);

    const playedEngineMove = evalBefore.bestMove === uciOf(move);
    const classification = classifyMove(cpLoss, playedEngineMove, {
      missedMate,
      allowedMate,
    });

    const bestLineSan = pvToSan(fens[i], evalBefore.pv);
    const bestMoveSan = bestLineSan[0] ?? null;

    const explanation = explainMove({
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      move,
      mover,
      classification,
      evalBefore,
      evalAfter,
      bestMoveUci: evalBefore.bestMove,
      bestMoveSan,
      bestLineSan,
      refutationUci: evalAfter.bestMove,
      missedMate,
      allowedMate,
    });

    analyzed.push({
      index: i,
      move,
      color: mover,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      evalBefore,
      evalAfter,
      cpLoss,
      classification,
      bestMoveUci: evalBefore.bestMove,
      bestMoveSan,
      bestLineSan,
      explanation,
    });
  }

  const counts: GameAnalysis['counts'] = {
    w: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    b: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  };
  for (const m of analyzed) {
    counts[m.color][m.classification]++;
  }

  return {
    moves: analyzed,
    counts,
    signature: moves.map((m) => m.san).join(' '),
  };
}
