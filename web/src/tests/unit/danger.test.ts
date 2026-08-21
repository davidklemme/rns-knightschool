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
    it('shows danger on the player pieces when it is their own turn', () => {
      // Regression: attack detection used move generation, which only works
      // for the side to move - so danger glow vanished exactly when the
      // player needed it (on their turn, right after the AI attacked).
      const fen = '4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1';
      const engine = createEngine(fen);
      const threatened = findThreatenedPieces(engine, 'w');
      expect(threatened.some((t) => t.square === 'd2')).toBe(true);
    });

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
      // Black knight on d5 is attacked by the e4 pawn and defended by nothing
      const fen = 'rnbqkb1r/pppppppp/8/3n4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const engine = createEngine(fen);
      const hanging = findHangingPieces(engine, 'b');
      const knight = hanging.find((h) => h.square === 'd5');
      expect(knight).toBeDefined();
    });

    it('does NOT report a defended piece as hanging', () => {
      // Black knight on f6 is attacked by the e5 pawn but defended by the g7 pawn
      const fen = 'rnbqkb1r/pppppppp/5n2/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const engine = createEngine(fen);
      const hanging = findHangingPieces(engine, 'b');
      expect(hanging.find((h) => h.square === 'f6')).toBeUndefined();
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
      // Black in check after 1.e4 f5 2.Qh5+ (the h5-e8 diagonal is open)
      const fen = 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
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
      // Black in check after 1.e4 f5 2.Qh5+
      const fen = 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
      const engine = createEngine(fen);
      const dangerSquares = getDangerSquares(engine, 'b');
      expect(dangerSquares.has('e8')).toBe(true);
    });
  });
});
