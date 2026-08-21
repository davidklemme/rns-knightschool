import { describe, it, expect } from 'vitest';
import { createEngine } from '@/lib/chess/engine';
import {
  detectFork,
  detectCheck,
  detectTactics,
  getTacticExplanation,
} from '@/lib/chess/tactics';

describe('Tactics Detection', () => {
  describe('detectFork', () => {
    it('detects knight fork on king and queen', () => {
      // Nc7+ forks the queen on a8 and the king on e8
      const engine = createEngine('q3k3/8/8/3N4/8/8/8/4K3 w - - 0 1');
      const move = engine.move('d5', 'c7');
      expect(move).not.toBeNull();

      const result = detectFork(engine, move!);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('fork');
      expect(result?.targets).toContain('a8');
      expect(result?.targets).toContain('e8');
    });

    it('detects a fork right after the move is played (opponent to move)', () => {
      // Regression: fork detection used legal-move generation, which
      // returns nothing for the side that just moved - so the app never
      // celebrated the player's forks.
      const engine = createEngine('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1');
      const move = engine.move('d5', 'c7');
      expect(move).not.toBeNull();

      const result = detectFork(engine, move!);
      expect(result).not.toBeNull();
      expect(result?.targets).toContain('a8');
      expect(result?.targets).toContain('e8');
    });

    it('returns null when no fork exists', () => {
      const engine = createEngine();
      engine.move('e2', 'e4');
      const lastMove = engine.historyVerbose()[0];
      const result = detectFork(engine, lastMove);
      expect(result).toBeNull();
    });
  });

  describe('detectCheck', () => {
    it('detects check', () => {
      // White giving check after 1.e4 f5 2.Qh5+
      const fen = 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
      const engine = createEngine(fen);
      const move = {
        from: 'd1' as const,
        to: 'h5' as const,
        piece: 'q' as const,
        san: 'Qh5+',
        flags: '',
      };
      const result = detectCheck(engine, move);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('check');
    });

    it('detects checkmate', () => {
      // Fool's mate
      const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      const engine = createEngine(fen);
      const move = {
        from: 'd8' as const,
        to: 'h4' as const,
        piece: 'q' as const,
        san: 'Qh4#',
        flags: '',
      };
      const result = detectCheck(engine, move);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('checkmate');
    });

    it('returns null when not in check', () => {
      const engine = createEngine();
      const move = {
        from: 'e2' as const,
        to: 'e4' as const,
        piece: 'p' as const,
        san: 'e4',
        flags: '',
      };
      const result = detectCheck(engine, move);
      expect(result).toBeNull();
    });
  });

  describe('getTacticExplanation', () => {
    const tacticTypes = ['fork', 'pin', 'skewer', 'discovered_attack', 'check', 'checkmate'] as const;

    tacticTypes.forEach((type) => {
      it(`returns explanation for ${type}`, () => {
        const explanation = getTacticExplanation(type);
        expect(explanation).toBeTruthy();
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(20);
      });
    });
  });

  describe('detectTactics', () => {
    it('prioritizes checkmate over other tactics', () => {
      // Checkmate position
      const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      const engine = createEngine(fen);
      const move = {
        from: 'd8' as const,
        to: 'h4' as const,
        piece: 'q' as const,
        san: 'Qh4#',
        flags: '',
      };
      const result = detectTactics(engine, move);
      expect(result?.type).toBe('checkmate');
    });
  });
});
