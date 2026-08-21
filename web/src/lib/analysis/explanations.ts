import { createEngine } from '@/lib/chess/engine';
import type { ChessEngine } from '@/lib/chess/engine';
import { detectTactics } from '@/lib/chess/tactics';
import { analyzeMoveSafety } from '@/lib/chess/move-safety';
import type { PositionAnalysis } from '@/lib/chess/opponent-engine';
import type { ChessMove, Color, Square, PieceType, TacticResult } from '@/lib/chess/types';
import type { MoveClassification } from './game-analysis';

/**
 * Turns an eval swing into concrete advice by running the app's tactic and
 * safety detectors on two moves the engine already found for us:
 *
 * - the BEST move in the position (what was missed): fork/pin/skewer/mate,
 *   or a free capture
 * - the REFUTATION (the engine's reply to the played move): what the
 *   opponent now gets - a tactic, or simply taking the hanging piece
 *
 * Everything else falls back to naming the better move plus the engine
 * line, so no flagged move is ever left unexplained.
 */

export interface ExplainContext {
  fenBefore: string;
  fenAfter: string;
  move: ChessMove;
  mover: Color;
  classification: MoveClassification;
  evalBefore: PositionAnalysis;
  evalAfter: PositionAnalysis;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  bestLineSan: string[];
  refutationUci: string | null;
  missedMate: boolean;
  allowedMate: boolean;
}

const PIECE_NAMES: Record<PieceType, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const pieceName = (type: PieceType): string => PIECE_NAMES[type];

/** Apply a UCI move to a fresh engine at `fen`. */
const applyUci = (
  fen: string,
  uci: string
): { engine: ChessEngine; move: ChessMove } | null => {
  const engine = createEngine(fen);
  const move = engine.move(
    uci.slice(0, 2) as Square,
    uci.slice(2, 4) as Square,
    uci.length > 4 ? (uci[4] as PieceType) : undefined
  );
  return move ? { engine, move } : null;
};

const listNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

// Tactic type → phrase builders (plain checks aren't worth calling out)
type TacticDescriber = (
  targetNames: string[],
  possessive: 'your' | 'their'
) => string | null;

const TACTIC_DESCRIBERS: Partial<Record<TacticResult['type'], TacticDescriber>> = {
  fork: (names, possessive) =>
    names.length >= 2 ? `forks ${possessive} ${listNames(names)}` : null,
  pin: (names, possessive) =>
    names.length >= 1 ? `pins ${possessive} ${names[0]} to the king` : null,
  skewer: (_, possessive) => `skewers ${possessive} king`,
  checkmate: () => 'is checkmate',
};

/** "forks your king and rook" / "pins their knight to the king" ... */
const describeTactic = (
  tactic: TacticResult,
  engine: ChessEngine,
  possessive: 'your' | 'their'
): string | null => {
  const targetNames = tactic.targets
    .map((sq) => engine.get(sq))
    .filter((p): p is { type: PieceType; color: Color } => p !== null)
    .map((p) => pieceName(p.type));

  return TACTIC_DESCRIBERS[tactic.type]?.(targetNames, possessive) ?? null;
};

/** SAN of a UCI move in the given position, or null. */
const uciToSan = (fen: string, uci: string | null): string | null =>
  uci ? (applyUci(fen, uci)?.move.san ?? null) : null;

// --- Individual explanation rules, first match wins ---

type ExplanationRule = (ctx: ExplainContext) => string | null;

const missedMateRule: ExplanationRule = (ctx) => {
  if (!ctx.missedMate) return null;
  const n = ctx.evalBefore.mate !== null ? Math.abs(ctx.evalBefore.mate) : null;
  const mateIn = n ? ` in ${n}` : '';
  const start = ctx.bestMoveSan ? `, starting with ${ctx.bestMoveSan}` : '';
  return `You had a forced mate${mateIn}${start}.`;
};

const allowedMateRule: ExplanationRule = (ctx) => {
  if (!ctx.allowedMate) return null;
  const n = ctx.evalAfter.mate !== null ? Math.abs(ctx.evalAfter.mate) : null;
  const mateIn = n ? ` in ${n}` : '';
  const refutationSan = uciToSan(ctx.fenAfter, ctx.refutationUci);
  const start = refutationSan ? `, beginning with ${refutationSan}` : '';
  return `This allows a forced mate${mateIn}${start}.`;
};

const hungPieceRule: ExplanationRule = (ctx) => {
  const after = createEngine(ctx.fenAfter);
  const piece = after.get(ctx.move.to);
  if (!piece || piece.type === 'k') return null;

  const enemy: Color = ctx.mover === 'w' ? 'b' : 'w';
  const attacked = after.getAttackers(ctx.move.to, enemy).length > 0;
  const defended = after.getDefenders(ctx.move.to, ctx.mover).length > 0;
  if (!attacked || defended) return null;

  // Name the capture only if the engine's reply really takes the piece
  const refutationTakes = ctx.refutationUci?.slice(2, 4) === ctx.move.to;
  const refutationSan = refutationTakes
    ? uciToSan(ctx.fenAfter, ctx.refutationUci)
    : null;
  const capture = refutationSan
    ? `${refutationSan} just takes it`
    : 'it can simply be captured';
  return `This hangs your ${pieceName(piece.type)} on ${ctx.move.to} - ${capture}.`;
};

const abandonedPieceRule: ExplanationRule = (ctx) => {
  const before = createEngine(ctx.fenBefore);
  const safety = analyzeMoveSafety(before, ctx.move.from, ctx.move.to, ctx.mover);
  const abandonedSq = safety.leavesHanging[0];
  if (!abandonedSq) return null;

  const after = createEngine(ctx.fenAfter);
  const abandoned = after.get(abandonedSq);
  if (!abandoned) return null;
  return `Moving away leaves your ${pieceName(abandoned.type)} on ${abandonedSq} undefended.`;
};

const refutationTacticRule: ExplanationRule = (ctx) => {
  if (!ctx.refutationUci) return null;
  const applied = applyUci(ctx.fenAfter, ctx.refutationUci);
  if (!applied) return null;

  const tactic = detectTactics(applied.engine, applied.move);
  if (!tactic) return null;
  const description = describeTactic(tactic, applied.engine, 'your');
  if (!description) return null;
  return `The problem: ${applied.move.san} ${description}.`;
};

const missedTacticRule: ExplanationRule = (ctx) => {
  if (!ctx.bestMoveUci || !ctx.bestMoveSan) return null;
  const applied = applyUci(ctx.fenBefore, ctx.bestMoveUci);
  if (!applied) return null;

  const tactic = detectTactics(applied.engine, applied.move);
  if (tactic) {
    const description = describeTactic(tactic, applied.engine, 'their');
    if (description) {
      return tactic.type === 'checkmate'
        ? `Better was ${ctx.bestMoveSan} - checkmate on the spot!`
        : `Better was ${ctx.bestMoveSan} - it ${description}.`;
    }
  }

  // Free capture: best move takes a piece nobody defends
  const before = createEngine(ctx.fenBefore);
  const targetSq = ctx.bestMoveUci.slice(2, 4) as Square;
  const target = before.get(targetSq);
  if (
    target &&
    target.color !== ctx.mover &&
    before.getDefenders(targetSq, target.color).length === 0
  ) {
    return `Better was ${ctx.bestMoveSan}, winning the ${pieceName(target.type)} on ${targetSq} for free.`;
  }

  return null;
};

const fallbackRule: ExplanationRule = (ctx) => {
  if (!ctx.bestMoveSan) return null;
  const line =
    ctx.bestLineSan.length > 1 ? ` (line: ${ctx.bestLineSan.join(' ')})` : '';
  return `Better was ${ctx.bestMoveSan}${line}.`;
};

const RULES: ExplanationRule[] = [
  missedMateRule,
  allowedMateRule,
  hungPieceRule,
  abandonedPieceRule,
  refutationTacticRule,
  missedTacticRule,
  fallbackRule,
];

/**
 * Explain a flagged move. Returns null for moves that don't need one
 * (best/good) or when nothing concrete can be said.
 */
export function explainMove(ctx: ExplainContext): string | null {
  if (ctx.classification === 'best' || ctx.classification === 'good') {
    return null;
  }

  for (const rule of RULES) {
    const explanation = rule(ctx);
    if (explanation) return explanation;
  }
  return null;
}
