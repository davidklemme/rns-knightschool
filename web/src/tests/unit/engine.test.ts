import { describe, it, expect } from 'vitest';
import { createEngine } from '@/lib/chess/engine';

describe('ChessEngine', () => {
  describe('createEngine', () => {
    it('creates engine with starting position', () => {
      const engine = createEngine();
      expect(engine.turn).toBe('w');
      expect(engine.isGameOver).toBe(false);
      expect(engine.isCheck).toBe(false);
    });

    it('creates engine from custom FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const engine = createEngine(fen);
      expect(engine.turn).toBe('b');
      expect(engine.fen).toBe(fen);
    });
  });

  describe('get', () => {
    it('returns piece at square', () => {
      const engine = createEngine();
      const piece = engine.get('e1');
      expect(piece).toEqual({ type: 'k', color: 'w' });
    });

    it('returns null for empty square', () => {
      const engine = createEngine();
      const piece = engine.get('e4');
      expect(piece).toBeNull();
    });
  });

  describe('getLegalMoves', () => {
    it('returns legal moves for a piece', () => {
      const engine = createEngine();
      const moves = engine.getLegalMoves('e2');
      expect(moves.length).toBe(2);
      expect(moves.map((m) => m.to)).toContain('e3');
      expect(moves.map((m) => m.to)).toContain('e4');
    });

    it('returns empty array for square with no piece', () => {
      const engine = createEngine();
      const moves = engine.getLegalMoves('e4');
      expect(moves.length).toBe(0);
    });
  });

  describe('move', () => {
    it('makes a valid move', () => {
      const engine = createEngine();
      const move = engine.move('e2', 'e4');
      expect(move).not.toBeNull();
      expect(move?.from).toBe('e2');
      expect(move?.to).toBe('e4');
      expect(engine.turn).toBe('b');
    });

    it('returns null for invalid move', () => {
      const engine = createEngine();
      const move = engine.move('e2', 'e5'); // Invalid - too far
      expect(move).toBeNull();
    });

    it('handles captures', () => {
      const engine = createEngine();
      engine.move('e2', 'e4');
      engine.move('d7', 'd5');
      const capture = engine.move('e4', 'd5');
      expect(capture?.captured).toBe('p');
    });
  });

  describe('undo', () => {
    it('undoes the last move', () => {
      const engine = createEngine();
      const initialFen = engine.fen;
      engine.move('e2', 'e4');
      engine.undo();
      expect(engine.fen).toBe(initialFen);
    });

    it('returns null when no moves to undo', () => {
      const engine = createEngine();
      const result = engine.undo();
      expect(result).toBeNull();
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      const engine = createEngine();
      engine.move('e2', 'e4');
      const clone = engine.clone();

      // Clone should have same position
      expect(clone.fen).toBe(engine.fen);

      // Modifying clone should not affect original
      clone.move('e7', 'e5');
      expect(clone.turn).toBe('w');
      expect(engine.turn).toBe('b');
    });
  });

  describe('check detection', () => {
    it('detects check', () => {
      // Position with black in check
      const fen = 'rnbqkbnr/ppppp1pp/5p2/6B1/4P3/8/PPPP1PPP/RN1QKBNR b KQkq - 1 2';
      const engine = createEngine(fen);
      // After Qh5+
      engine.load('rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2');
      expect(engine.isCheck).toBe(true);
    });

    it('detects checkmate', () => {
      // Fool's mate position
      const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      const engine = createEngine(fen);
      expect(engine.isCheckmate).toBe(true);
      expect(engine.isGameOver).toBe(true);
    });
  });

  describe('getPieces', () => {
    it('returns all pieces for a color', () => {
      const engine = createEngine();
      const whitePieces = engine.getPieces('w');
      expect(whitePieces.length).toBe(16);
    });

    it('returns correct piece types', () => {
      const engine = createEngine();
      const whitePieces = engine.getPieces('w');
      const pawns = whitePieces.filter((p) => p.type === 'p');
      const king = whitePieces.filter((p) => p.type === 'k');
      expect(pawns.length).toBe(8);
      expect(king.length).toBe(1);
    });
  });

  describe('getKingSquare', () => {
    it('returns king square for white', () => {
      const engine = createEngine();
      expect(engine.getKingSquare('w')).toBe('e1');
    });

    it('returns king square for black', () => {
      const engine = createEngine();
      expect(engine.getKingSquare('b')).toBe('e8');
    });
  });
});
