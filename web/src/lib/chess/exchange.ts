import { createEngine, type ChessEngine } from './engine';
import type { Color, Square, ChessMove } from './types';
import { PIECE_VALUES } from './types';

function capturedSquare(move: ChessMove): Square {
  return move.flags.includes('e')
    ? `${move.to[0]}${move.from[1]}` as Square : move.to;
}

/** Legal captures on one square, including pins, king safety and promotions.
 * This is local exchange analysis, not a proof about other tactical replies. */
export function positionForTurn(engine: ChessEngine, color: Color): ChessEngine {
  const fields = engine.fen.split(' ');
  if (fields[1] !== color) fields[3] = '-';
  fields[1] = color;
  return createEngine(fields.join(' '));
}

export function exchangeGain(engine: ChessEngine, target: Square): number {
  const memo = new Map<string, number>();
  const search = (position: ChessEngine, square: Square): number => {
    const piece = position.get(square);
    if (!piece || piece.color === position.turn ||
      (position.getAttackers(square, position.turn).length === 0 &&
        !(piece.type === 'p' && position.fen.split(' ')[3] !== '-'))) return 0;
    const key = `${position.fen} ${square}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let best = 0; // A player can choose not to continue this exchange.
    for (const move of position.getAllLegalMoves()) {
      if (capturedSquare(move) !== square || !move.captured) continue;
      const next = position.clone();
      next.move(move.from, move.to, move.promotion);
      const promotionGain = move.promotion ? PIECE_VALUES[move.promotion] - 1 : 0;
      best = Math.max(best, PIECE_VALUES[move.captured] + promotionGain - search(next, move.to));
    }
    memo.set(key, best);
    return best;
  };
  // Each recursive step captures a piece, so recursion is bounded by material.
  return search(engine, target);
}

export function legalCapturers(engine: ChessEngine, target: Square, color: Color): Square[] {
  if (!engine.get(target) || (engine.getAttackers(target, color).length === 0 && engine.fen.split(' ')[3] === '-')) return [];
  return positionForTurn(engine, color).getAllLegalMoves()
    .filter(move => capturedSquare(move) === target && move.captured)
    .map(move => move.from);
}
