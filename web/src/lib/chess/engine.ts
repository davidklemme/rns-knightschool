import { Chess, Move } from 'chess.js';
import type { Square, Color, PieceType, ChessMove, PiecePosition } from './types';

/**
 * ChessEngine - Functional wrapper around chess.js
 *
 * Uses closure-based factory pattern - no classes, no 'this'.
 */

// --- Pure helper functions ---

const convertMove = (move: Move): ChessMove => ({
  from: move.from as Square,
  to: move.to as Square,
  piece: move.piece as PieceType,
  captured: move.captured as PieceType | undefined,
  promotion: move.promotion as PieceType | undefined,
  san: move.san,
  flags: move.flags,
});

const boardToPositions = (
  board: ({ type: PieceType; color: Color } | null)[][]
): PiecePosition[] =>
  board.flatMap((row, rowIdx) =>
    row
      .map((piece, colIdx) =>
        piece
          ? {
              square: `${String.fromCharCode(97 + colIdx)}${8 - rowIdx}` as Square,
              type: piece.type,
              color: piece.color,
            }
          : null
      )
      .filter((p): p is PiecePosition => p !== null)
  );

// --- Engine interface ---

export interface ChessEngine {
  // State accessors
  readonly fen: string;
  readonly turn: Color;
  readonly isGameOver: boolean;
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isStalemate: boolean;
  readonly isDraw: boolean;
  readonly halfMoves: number;

  // Board queries
  get: (square: Square) => { type: PieceType; color: Color } | null;
  getAllPieces: () => PiecePosition[];
  getPieces: (color: Color) => PiecePosition[];
  board: () => ({ type: PieceType; color: Color } | null)[][];

  // Move generation
  getLegalMoves: (square: Square) => ChessMove[];
  getAllLegalMoves: () => ChessMove[];
  getLegalDestinations: (square: Square) => Square[];
  isLegalMove: (from: Square, to: Square) => boolean;

  // Move execution
  move: (from: Square, to: Square, promotion?: PieceType) => ChessMove | null;
  moveSan: (san: string) => ChessMove | null;
  undo: () => ChessMove | null;
  reset: () => void;
  load: (fen: string) => boolean;

  // Attack detection
  isAttacked: (square: Square, byColor: Color) => boolean;
  getAttackers: (square: Square, byColor: Color) => Square[];
  getDefenders: (square: Square, color: Color) => Square[];
  getKingSquare: (color: Color) => Square | null;

  // History
  history: () => string[];
  historyVerbose: () => ChessMove[];

  // Cloning
  clone: () => ChessEngine;
}

/**
 * Create a chess engine instance
 */
export const createEngine = (fen?: string): ChessEngine => {
  const chess = fen ? new Chess(fen) : new Chess();

  const engine: ChessEngine = {
    // State accessors as getters
    get fen() {
      return chess.fen();
    },
    get turn() {
      return chess.turn();
    },
    get isGameOver() {
      return chess.isGameOver();
    },
    get isCheck() {
      return chess.isCheck();
    },
    get isCheckmate() {
      return chess.isCheckmate();
    },
    get isStalemate() {
      return chess.isStalemate();
    },
    get isDraw() {
      return chess.isDraw();
    },
    get halfMoves() {
      return chess.history().length;
    },

    // Board queries
    get: (square) => chess.get(square) ?? null,

    getAllPieces: () => boardToPositions(chess.board()),

    getPieces: (color) =>
      boardToPositions(chess.board()).filter((p) => p.color === color),

    board: () => chess.board(),

    // Move generation
    getLegalMoves: (square) =>
      chess.moves({ square, verbose: true }).map(convertMove),

    getAllLegalMoves: () => chess.moves({ verbose: true }).map(convertMove),

    getLegalDestinations: (square) =>
      chess.moves({ square, verbose: true }).map((m) => m.to as Square),

    isLegalMove: (from, to) =>
      chess.moves({ square: from, verbose: true }).some((m) => m.to === to),

    // Move execution
    move: (from, to, promotion) => {
      try {
        const result = chess.move({ from, to, promotion });
        return result ? convertMove(result) : null;
      } catch {
        return null;
      }
    },

    moveSan: (san) => {
      try {
        const result = chess.move(san);
        return result ? convertMove(result) : null;
      } catch {
        return null;
      }
    },

    undo: () => {
      const result = chess.undo();
      return result ? convertMove(result) : null;
    },

    reset: () => chess.reset(),

    load: (newFen) => {
      try {
        chess.load(newFen);
        return true;
      } catch {
        return false;
      }
    },

    // Attack detection
    //
    // Uses chess.js attackers() rather than generated moves: moves() only
    // exist for the side to move and never target own pieces, so a
    // moves()-based approach can't see attacks on the opponent's turn and
    // can't see defenders at all.
    isAttacked: (square, byColor) => chess.isAttacked(square, byColor),

    getAttackers: (square, byColor) => chess.attackers(square, byColor) as Square[],

    getDefenders: (square, color) => chess.attackers(square, color) as Square[],

    getKingSquare: (color) => {
      const king = boardToPositions(chess.board()).find(
        (p) => p.type === 'k' && p.color === color
      );
      return king?.square ?? null;
    },

    // History
    history: () => chess.history(),

    historyVerbose: () => chess.history({ verbose: true }).map(convertMove),

    // Cloning
    clone: () => createEngine(chess.fen()),
  };

  return engine;
};

// Alias for backward compatibility
export { createEngine as ChessEngine };
