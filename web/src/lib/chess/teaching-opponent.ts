import { createEngine } from './engine';
import { exchangeGain } from './exchange';
import { analyzeMoveSafety } from './move-safety';
import { PIECE_VALUES } from './types';

/** Deliberate beginner opportunities: offer a pawn/minor piece, not random
 * queen blunders or an immediate game ending. Fall back to ordinary engine play. */
export function chooseTeachingMove(fen: string): string | null {
  const engine = createEngine(fen);
  const candidates = engine.getAllLegalMoves();
  const opportunities: string[] = [];
  for (const move of candidates) {
    if (move.piece === 'k' || move.piece === 'q' || move.piece === 'r') continue;
    const after = engine.clone();
    after.move(move.from, move.to, move.promotion);
    if (after.isGameOver || after.isCheck) continue;
    const gain = exchangeGain(after, move.to);
    if (gain > 0 && gain <= PIECE_VALUES.n &&
      analyzeMoveSafety(engine, move.from, move.to, engine.turn, move.promotion).leavesHanging.length === 0) {
      opportunities.push(`${move.from}${move.to}${move.promotion || ''}`);
    }
  }
  return opportunities.length ? opportunities[Math.floor(Math.random() * opportunities.length)] : null;
}
