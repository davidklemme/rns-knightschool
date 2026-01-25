import { describe, it, expect } from 'vitest';
import { createEngine } from '@/lib/chess/engine';
import {
  analyzePieceThreat,
  findThreatenedPieces,
  findHangingPieces,
  analyzeDanger,
  getDangerMessage,
  getDangerSquares,
} from '@/lib/chess/danger';

describe('Danger Detection', () => {
  describe('analyzePieceThreat', () => {
    it('detects undefended piece under attack', () => {
      // Position where a pawn is attacked but not defended
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2';
      const engine = createEngine(fen);
      // Black's e5 pawn is attacked by white's d4 pawn
      const threat = analyzePieceThreat(engine, 'e5', 'b');
      expect(threat?.isThreatened).toBe(true);
    });

    it('returns null for square with no piece', () => {
      const engine = createEngine();
      const threat = analyzePieceThreat(engine, 'e4', 'w');
      expect(threat).toBeNull();
    });

    it('returns null for opponent piece', () => {
      const engine = createEngine();
      const threat = analyzePieceThreat(engine, 'e7', 'w'); // Black pawn
      expect(threat).toBeNull();
    });
  });

  describe('findThreatenedPieces', () => {
    it('returns empty array at starting position', () => {
      const engine = createEngine();
      const threatened = findThreatenedPieces(engine, 'w');
      expect(threatened.length).toBe(0);
    });

    it('finds threatened pieces after pawn tension', () => {
      // Position with pawn tension
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2';
      const engine = createEngine(fen);
      const threatenedBlack = findThreatenedPieces(engine, 'b');
      expect(threatenedBlack.length).toBeGreaterThan(0);
    });
  });

  describe('findHangingPieces', () => {
    it('identifies hanging (undefended attacked) pieces', () => {
      // Position where knight is hanging
      const fen = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2';
      const engine = createEngine(fen);
      // After e5, the knight on f6 would be attacked
      engine.move('e4', 'e5');
      const hanging = findHangingPieces(engine, 'b');
      // Knight on f6 is attacked by e5 pawn
      const knight = hanging.find((h) => h.square === 'f6');
      expect(knight).toBeDefined();
    });
  });

  describe('analyzeDanger', () => {
    it('provides complete danger analysis', () => {
      const engine = createEngine();
      const analysis = analyzeDanger(engine, 'w');

      expect(analysis).toHaveProperty('threatenedPieces');
      expect(analysis).toHaveProperty('hangingPieces');
      expect(analysis).toHaveProperty('isInCheck');
      expect(analysis).toHaveProperty('checkingPieces');
      expect(analysis).toHaveProperty('mostValuableThreat');
    });

    it('detects when king is in check', () => {
      // Position with black in check
      const fen = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
      const engine = createEngine(fen);
      const analysis = analyzeDanger(engine, 'b');
      expect(analysis.isInCheck).toBe(true);
      expect(analysis.checkingPieces.length).toBeGreaterThan(0);
    });
  });

  describe('getDangerMessage', () => {
    it('returns check message when in check', () => {
      const analysis = {
        threatenedPieces: [],
        hangingPieces: [],
        isInCheck: true,
        checkingPieces: ['h5' as const],
        mostValuableThreat: null,
      };
      const message = getDangerMessage(analysis, 'Ruby');
      expect(message).toContain('check');
    });

    it('returns hanging piece message', () => {
      const analysis = {
        threatenedPieces: [
          {
            square: 'e5' as const,
            piece: 'q' as const,
            color: 'w' as const,
            attackers: ['d4' as const],
            defenders: [],
            isHanging: true,
            isThreatened: true,
          },
        ],
        hangingPieces: [
          {
            square: 'e5' as const,
            piece: 'q' as const,
            color: 'w' as const,
            attackers: ['d4' as const],
            defenders: [],
            isHanging: true,
            isThreatened: true,
          },
        ],
        isInCheck: false,
        checkingPieces: [],
        mostValuableThreat: null,
      };
      const message = getDangerMessage(analysis);
      expect(message).toContain('queen');
      expect(message).toContain('danger');
    });

    it('returns null when no danger', () => {
      const analysis = {
        threatenedPieces: [],
        hangingPieces: [],
        isInCheck: false,
        checkingPieces: [],
        mostValuableThreat: null,
      };
      const message = getDangerMessage(analysis);
      expect(message).toBeNull();
    });
  });

  describe('getDangerSquares', () => {
    it('returns set of squares with threatened pieces', () => {
      // Position with threatened pieces
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2';
      const engine = createEngine(fen);
      const dangerSquares = getDangerSquares(engine, 'b');
      expect(dangerSquares instanceof Set).toBe(true);
    });

    it('includes king square when in check', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
      const engine = createEngine(fen);
      const dangerSquares = getDangerSquares(engine, 'b');
      expect(dangerSquares.has('e8')).toBe(true);
    });
  });
});
