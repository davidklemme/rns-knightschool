import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * User-centric store tests: what the player experiences when they start a
 * game, change the difficulty, or press the hint button.
 */

// Track what the store tells the AI engine, without spinning up a worker
const engineCalls = vi.hoisted(() => ({
  skillLevels: [] as string[],
}));

vi.mock('@/lib/chess/stockfish-service', () => ({
  getStockfishService: () => ({
    init: async () => {},
    setSkillLevel: async (level: string) => {
      engineCalls.skillLevels.push(level);
    },
    getBestMove: async () => null,
    getEvaluation: async () => null,
    terminate: () => {},
    isReady: () => false,
  }),
  resetStockfishService: () => {},
}));

import { useChessStore } from '@/store/chessStore';

describe('Chess store', () => {
  beforeEach(() => {
    engineCalls.skillLevels.length = 0;
    useChessStore.getState().startNewGame('w', 'learning');
  });

  it('configures the AI opponent for the level chosen at game start', () => {
    useChessStore.getState().startNewGame('w', 'challenge');
    expect(engineCalls.skillLevels).toContain('challenge');
  });

  it('re-configures the AI when the player changes difficulty mid-game', () => {
    // Regression: this used to only change UI toggles - the engine kept
    // playing at the old strength, so "harder" levels never got harder.
    useChessStore.getState().setSkillLevel('grandmaster');

    expect(useChessStore.getState().skillLevel).toBe('grandmaster');
    expect(engineCalls.skillLevels[engineCalls.skillLevels.length - 1]).toBe('grandmaster');
  });

  it('hint explains the idea and highlights the move on the board', () => {
    useChessStore.getState().useHint();
    const state = useChessStore.getState();

    expect(state.activeHint).not.toBeNull();
    // The coach speaks the hint's teaching message, not a generic line
    expect(state.coachMessage).toBe(state.activeHint!.message);
    expect(state.hintsUsed).toBe(1);
    // The player sees where to move from AND where to move to
    expect(state.highlights.get(state.activeHint!.from)).toBe('hint');
    expect(state.highlights.get(state.activeHint!.to)).toBe('hint');
  });

  it('hint stays visible while the player picks up the suggested piece', () => {
    useChessStore.getState().useHint();
    const hint = useChessStore.getState().activeHint!;

    useChessStore.getState().selectSquare(hint.from);

    const state = useChessStore.getState();
    expect(state.activeHint).not.toBeNull();
    // Destination still marked so the child can follow through
    expect(state.highlights.get(hint.to)).toBe('hint');
  });

  it('hint is cleared once the player moves', () => {
    useChessStore.getState().useHint();
    const hint = useChessStore.getState().activeHint!;

    useChessStore.getState().makeMove(hint.from, hint.to);

    expect(useChessStore.getState().activeHint).toBeNull();
  });
});
