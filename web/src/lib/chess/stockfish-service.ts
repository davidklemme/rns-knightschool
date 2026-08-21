/**
 * Stockfish Service for AI opponent
 *
 * Philosophy: "Anti-Stockfish" - the AI should make learning opportunities,
 * not crush kids. Lower skill levels get artificial delays and weaker play.
 *
 * Uses real Stockfish WASM loaded directly from public folder.
 *
 * Strength model (see SKILL_CONFIGS):
 * - Below 1320 elo: UCI_LimitStrength off, "Skill Level" 0-20 + shallow
 *   depth. (Stockfish ignores "Skill Level" when UCI_LimitStrength is on,
 *   so the two must never be combined.)
 * - 1320+ elo: UCI_LimitStrength on with UCI_Elo, think time per level.
 *
 * All engine access is serialized through a queue: the worker is a single
 * UCI session, so a position evaluation (eval bar) and a move search must
 * never interleave - otherwise one search's "bestmove" resolves the other
 * request and the AI ends up playing fallback random moves.
 */

import type { SkillLevel, SkillConfig } from './types';
import type { OpponentEngine, PositionAnalysis } from './opponent-engine';
import { SKILL_CONFIGS } from './types';

// --- Utility functions ---

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate artificial "thinking" delay based on skill level
 * Lower skill = longer delay to simulate human-like thinking
 */
const getThinkingDelay = (config: SkillConfig): number => {
  // Base delay of 500ms + random variation
  const baseDelay = 500;
  const randomVariation = Math.random() * 800;

  // Higher mistake rate = longer thinking time (simulates uncertainty)
  const skillMultiplier = 1 + config.aiMistakeRate * 2;

  return Math.floor((baseDelay + randomVariation) * skillMultiplier);
};

// Multi-threaded Stockfish needs SharedArrayBuffer, which only exists in
// cross-origin isolated contexts (COOP/COEP headers). If it's unavailable
// we must use the single-threaded build - otherwise the worker dies and
// every "strong" game silently degrades to random fallback moves.
const supportsMultiThreaded = (): boolean =>
  typeof SharedArrayBuffer !== 'undefined' &&
  (typeof crossOriginIsolated === 'undefined' || crossOriginIsolated);

// --- Service implementation ---

export interface EvalInfo {
  score: number; // Centipawns from white's perspective (positive = white winning)
  mate: number | null; // Mate in X moves (positive = white mating, negative = black mating)
  depth: number;
}

// Stockfish is one OpponentEngine implementation; the app depends on the
// interface (see opponent-engine.ts), not on this service directly.
export type StockfishService = OpponentEngine;

export const createStockfishService = (
  skillLevel: SkillLevel = 'learning'
): StockfishService => {
  let stockfish: Worker | null = null;
  let isEngineReady = false;
  let currentConfig = SKILL_CONFIGS[skillLevel];
  let currentEngineType: 'single' | 'multi' | null = null;
  let pendingReady: (() => void) | null = null;
  let pendingBestmove: ((move: string | null) => void) | null = null;
  let lastEvalInfo: EvalInfo | null = null;
  let lastPv: string[] = [];

  // Serialize all engine operations - one UCI search at a time.
  let queueTail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(op: () => Promise<T>): Promise<T> => {
    const run = queueTail.then(op, op);
    queueTail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  // Parse info line for evaluation
  const parseInfoLine = (line: string): Partial<EvalInfo> | null => {
    if (!line.startsWith('info') || !line.includes('score')) return null;

    const result: Partial<EvalInfo> = {};

    // Parse depth
    const depthMatch = line.match(/depth (\d+)/);
    if (depthMatch) result.depth = parseInt(depthMatch[1], 10);

    // Parse score (centipawns or mate)
    const cpMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);

    if (cpMatch) {
      result.score = parseInt(cpMatch[1], 10);
      result.mate = null;
    } else if (mateMatch) {
      result.mate = parseInt(mateMatch[1], 10);
      result.score = result.mate > 0 ? 10000 : -10000; // Large value for mate
    }

    return result.score !== undefined ? result : null;
  };

  // Handle Stockfish messages
  const handleStockfishMessage = (event: MessageEvent) => {
    const line = typeof event.data === 'string' ? event.data : String(event.data);

    if (line === 'uciok' || line === 'readyok') {
      if (pendingReady) {
        pendingReady();
        pendingReady = null;
      }
    } else if (line.startsWith('info')) {
      const evalData = parseInfoLine(line);
      if (evalData && evalData.depth !== undefined) {
        lastEvalInfo = {
          score: evalData.score ?? 0,
          mate: evalData.mate ?? null,
          depth: evalData.depth,
        };
        // Keep the principal variation from the same info line, so eval
        // and line always describe the same search iteration
        const pvMatch = line.match(/ pv (.+)$/);
        if (pvMatch) {
          lastPv = pvMatch[1].trim().split(/\s+/);
        }
      }
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1] && parts[1] !== '(none)' ? parts[1] : null;

      if (pendingBestmove) {
        pendingBestmove(move);
        pendingBestmove = null;
      }
    }
  };

  // Send command to Stockfish
  const sendCommand = (command: string): void => {
    if (stockfish) {
      stockfish.postMessage(command);
    }
  };

  // Wait for ready response
  const waitForReady = (command: 'uci' | 'isready'): Promise<void> => {
    return new Promise((resolve, reject) => {
      pendingReady = resolve;

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingReady === resolve) {
          pendingReady = null;
          reject(new Error(`Timeout waiting for ${command}`));
        }
      }, 10000);

      sendCommand(command);
    });
  };

  // Configure engine strength for playing against the child.
  // Applied before every move search so an eval request (which needs full
  // strength) can never leak its settings into game play.
  const applyPlayOptions = (): void => {
    const targetElo = currentConfig.elo;

    if (targetElo >= 1320) {
      // Stockfish handles its own strength limiting via UCI_Elo
      const uciElo = Math.min(3190, targetElo);
      sendCommand('setoption name UCI_LimitStrength value true');
      sendCommand(`setoption name UCI_Elo value ${uciElo}`);
    } else {
      // Sub-1320: UCI_Elo can't go this low. Use "Skill Level" instead -
      // it is ignored while UCI_LimitStrength is on, so turn that off.
      sendCommand('setoption name UCI_LimitStrength value false');
      sendCommand(`setoption name Skill Level value ${currentConfig.stockfishSkillLevel}`);
    }
  };

  // Full-strength settings for the eval bar - a strength-limited engine
  // produces noisy, misleading evaluations.
  const applyAnalysisOptions = (): void => {
    sendCommand('setoption name UCI_LimitStrength value false');
    sendCommand('setoption name Skill Level value 20');
  };

  /**
   * Run a single search and wait for its "bestmove".
   * On timeout, sends "stop" and waits for the forced bestmove so a
   * still-running search can never resolve the NEXT queued request.
   */
  const runSearch = (goCommand: string, timeoutMs: number): Promise<string | null> => {
    return new Promise((resolve) => {
      let stopTimer: ReturnType<typeof setTimeout> | null = null;
      let graceTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (move: string | null) => {
        if (stopTimer) clearTimeout(stopTimer);
        if (graceTimer) clearTimeout(graceTimer);
        resolve(move);
      };

      pendingBestmove = finish;

      stopTimer = setTimeout(() => {
        // Ask the engine to wrap up; it will emit bestmove promptly
        sendCommand('stop');
        graceTimer = setTimeout(() => {
          if (pendingBestmove === finish) {
            pendingBestmove = null;
            console.warn('Search did not respond to stop');
            finish(null);
          }
        }, 2000);
      }, timeoutMs);

      sendCommand(goCommand);
    });
  };

  // Load a specific Stockfish build
  const loadEngineType = async (engineType: 'single' | 'multi'): Promise<void> => {
    // If same engine is already loaded, skip
    if (isEngineReady && currentEngineType === engineType) {
      return;
    }

    // Terminate existing engine
    if (stockfish) {
      stockfish.terminate();
      stockfish = null;
      isEngineReady = false;
    }

    // Select engine URL
    const engineUrl =
      engineType === 'multi'
        ? '/stockfish/stockfish-17.1-lite-51f59da.js'
        : '/stockfish/stockfish-17.1-lite-single-03e3232.js';

    // Create worker
    stockfish = new Worker(engineUrl);
    currentEngineType = engineType;

    stockfish.onmessage = handleStockfishMessage;
    stockfish.onerror = (error) => {
      console.error('Stockfish error:', error);
    };

    // Initialize UCI
    await waitForReady('uci');
    await waitForReady('isready');

    isEngineReady = true;
  };

  // Load the best available engine for the current config, falling back to
  // the single-threaded build if the multi-threaded one can't run/start.
  const loadEngine = async (): Promise<void> => {
    const wantMulti = currentConfig.useMultiThreaded && supportsMultiThreaded();

    if (wantMulti) {
      try {
        await loadEngineType('multi');
        return;
      } catch (error) {
        console.warn('Multi-threaded Stockfish failed, falling back to single-threaded:', error);
      }
    }

    await loadEngineType('single');
  };

  // Ensure an engine is running (queued operations call this first)
  const ensureEngine = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      console.warn('Web Workers not available, Stockfish disabled');
      return false;
    }

    // The right engine type may have changed with the skill level
    const wantMulti = currentConfig.useMultiThreaded && supportsMultiThreaded();
    const wantType: 'single' | 'multi' = wantMulti ? 'multi' : 'single';

    if (isEngineReady && stockfish && currentEngineType === wantType) {
      return true;
    }

    try {
      await loadEngine();
      return isEngineReady;
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      isEngineReady = false;
      return false;
    }
  };

  // Public API

  const init = async (): Promise<void> => {
    await enqueue(async () => {
      await ensureEngine();
    });
  };

  const setSkillLevel = async (level: SkillLevel): Promise<void> => {
    await enqueue(async () => {
      currentConfig = SKILL_CONFIGS[level];
      // Reload if the preferred engine type changed; ensureEngine is a
      // no-op when the right engine is already running.
      if (isEngineReady || stockfish) {
        await ensureEngine();
      }
    });
  };

  const getBestMove = async (
    fen: string,
    thinkingTime?: number
  ): Promise<string | null> => {
    // Add artificial delay for "Anti-Stockfish" philosophy
    // (outside the queue - it's UX pacing, not engine work)
    const artificialDelay = getThinkingDelay(currentConfig);
    await delay(artificialDelay);

    // For sub-1320 ELO levels, use aiMistakeRate to sometimes skip Stockfish entirely
    // This is indicated by returning null, which tells the caller to pick a random move
    if (currentConfig.elo < 1320 && Math.random() < currentConfig.aiMistakeRate) {
      return null;
    }

    return enqueue(async () => {
      if (!(await ensureEngine())) {
        console.warn('Stockfish not ready, returning null');
        return null;
      }

      applyPlayOptions();
      sendCommand(`position fen ${fen}`);

      if (currentConfig.elo < 1320) {
        // Weak play: very shallow, skill-limited search
        return runSearch(`go depth ${Math.min(currentConfig.depth, 8)}`, 10000);
      }

      // Elo-limited play: think time scales with the level
      const moveTime = thinkingTime ?? currentConfig.moveTimeMs;
      return runSearch(`go movetime ${moveTime}`, moveTime + 5000);
    });
  };

  const getEvaluation = async (
    fen: string,
    depth: number = 12
  ): Promise<EvalInfo | null> => {
    return enqueue(async () => {
      if (!(await ensureEngine())) {
        return null;
      }

      // Determine whose turn it is from FEN (second field after first space)
      // FEN format: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      const fenParts = fen.split(' ');
      const sideToMove = fenParts[1] || 'w';
      const isBlackToMove = sideToMove === 'b';

      // Reset last eval
      lastEvalInfo = null;

      applyAnalysisOptions();
      sendCommand(`position fen ${fen}`);
      await runSearch(`go depth ${depth}`, 5000);

      const result = lastEvalInfo as EvalInfo | null;
      if (!result) return null;

      if (isBlackToMove) {
        // Stockfish returns score from side-to-move perspective
        // Negate to always show from White's perspective
        return {
          score: -result.score,
          mate: result.mate !== null ? -result.mate : null,
          depth: result.depth,
        };
      }

      return result;
    });
  };

  const analyzePosition = async (
    fen: string,
    depth: number = 12
  ): Promise<PositionAnalysis | null> => {
    return enqueue(async () => {
      if (!(await ensureEngine())) {
        return null;
      }

      const isBlackToMove = (fen.split(' ')[1] || 'w') === 'b';

      lastEvalInfo = null;
      lastPv = [];

      applyAnalysisOptions();
      sendCommand(`position fen ${fen}`);
      const bestMove = await runSearch(`go depth ${depth}`, 8000);

      const result = lastEvalInfo as EvalInfo | null;
      if (!result) return null;

      // Stockfish scores from the side to move - normalize to white's view
      const sign = isBlackToMove ? -1 : 1;
      return {
        score: sign * result.score,
        mate: result.mate !== null ? sign * result.mate : null,
        depth: result.depth,
        bestMove,
        pv: [...lastPv],
      };
    });
  };

  const terminate = (): void => {
    if (stockfish) {
      sendCommand('stop');
      sendCommand('quit');
      stockfish.terminate();
      stockfish = null;
    }
    isEngineReady = false;
    currentEngineType = null;
    pendingReady = null;
    pendingBestmove = null;
  };

  const isReady = (): boolean => isEngineReady;

  return {
    init,
    setSkillLevel,
    getBestMove,
    getEvaluation,
    analyzePosition,
    terminate,
    isReady,
  };
};

// Singleton instance
let serviceInstance: StockfishService | null = null;

export const getStockfishService = (): StockfishService => {
  if (!serviceInstance) {
    serviceInstance = createStockfishService();
  }
  return serviceInstance;
};

export const resetStockfishService = (): void => {
  if (serviceInstance) {
    serviceInstance.terminate();
    serviceInstance = null;
  }
};
