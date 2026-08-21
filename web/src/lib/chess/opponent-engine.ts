import type { SkillLevel } from './types';
import { getStockfishService, resetStockfishService } from './stockfish-service';

/**
 * OpponentEngine - the abstraction the app plays against.
 *
 * The game store depends on this interface, not on Stockfish directly
 * (pluggable-provider pattern). That keeps the store testable without a
 * WASM worker and leaves room for other opponents later (a scripted
 * "teaching" engine, a remote engine, a puzzle player) without touching
 * game logic.
 */

export interface EngineEvaluation {
  score: number; // Centipawns from white's perspective (positive = white winning)
  mate: number | null; // Mate in X moves (positive = white mating, negative = black mating)
  depth: number;
}

export interface OpponentEngine {
  init: () => Promise<void>;
  setSkillLevel: (level: SkillLevel) => Promise<void>;
  /** Best move in UCI format (e.g. "e2e4", "e7e8q"), or null to signal
   *  "no engine move - caller picks a fallback/teaching move". */
  getBestMove: (fen: string, thinkingTime?: number) => Promise<string | null>;
  getEvaluation: (fen: string, depth?: number) => Promise<EngineEvaluation | null>;
  terminate: () => void;
  isReady: () => boolean;
}

let override: OpponentEngine | null = null;

/**
 * Swap the opponent implementation (tests, alternative engines).
 * Pass null to restore the default Stockfish engine.
 */
export const setOpponentEngine = (engine: OpponentEngine | null): void => {
  override = engine;
};

/** The engine the app currently plays against (default: Stockfish). */
export const getOpponentEngine = (): OpponentEngine =>
  override ?? getStockfishService();

/** Tear down the current opponent (e.g. on app teardown). */
export const resetOpponentEngine = (): void => {
  if (override) {
    override.terminate();
    override = null;
  }
  resetStockfishService();
};
