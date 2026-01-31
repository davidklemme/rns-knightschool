/**
 * Stockfish Service for AI opponent
 *
 * Philosophy: "Anti-Stockfish" - the AI should make learning opportunities,
 * not crush kids. Lower skill levels get artificial delays and weaker play.
 *
 * Uses real Stockfish WASM loaded directly from public folder.
 */

import type { SkillLevel, SkillConfig } from './types';
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

// --- Service implementation ---

export interface EvalInfo {
  score: number; // Centipawns from white's perspective (positive = white winning)
  mate: number | null; // Mate in X moves (positive = white mating, negative = black mating)
  depth: number;
}

export interface StockfishService {
  init: () => Promise<void>;
  setSkillLevel: (level: SkillLevel) => Promise<void>;
  getBestMove: (fen: string, thinkingTime?: number) => Promise<string | null>;
  getEvaluation: (fen: string, depth?: number) => Promise<EvalInfo | null>;
  terminate: () => void;
  isReady: () => boolean;
}

export const createStockfishService = (
  skillLevel: SkillLevel = 'learning'
): StockfishService => {
  let stockfish: Worker | null = null;
  let isEngineReady = false;
  let isInitializing = false;
  let currentConfig = SKILL_CONFIGS[skillLevel];
  let currentEngineType: 'single' | 'multi' | null = null;
  let pendingReady: (() => void) | null = null;
  let pendingMove: ((move: string | null) => void) | null = null;
  let pendingEval: ((evalInfo: EvalInfo | null) => void) | null = null;
  let lastEvalInfo: EvalInfo | null = null;

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
      }
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1] || null;

      if (pendingMove) {
        pendingMove(move);
        pendingMove = null;
      }

      if (pendingEval) {
        pendingEval(lastEvalInfo);
        pendingEval = null;
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

  // Configure engine strength based on target ELO
  // Stockfish UCI_Elo range is 1320-3190, so for lower ELOs we use minimum + skill level
  const configureStrength = (): void => {
    const targetElo = currentConfig.elo;

    // For grandmaster/master: disable UCI_LimitStrength and let the WASM engine
    // play at full strength. The WASM Lite build is already significantly weaker
    // than desktop Stockfish, so UCI_LimitStrength calibrated for desktop makes
    // the engine far weaker than intended.
    if (currentConfig.stockfishSkillLevel >= 10) {
      sendCommand('setoption name UCI_LimitStrength value false');
      sendCommand(`setoption name Skill Level value ${currentConfig.stockfishSkillLevel}`);
      return;
    }

    // For ELOs >= 1320, use UCI_Elo directly
    // For ELOs < 1320, use minimum UCI_Elo (1320) + lowest skill level (0)
    // The artificial weakening for sub-1320 is handled by random move selection in getBestMove
    const uciElo = Math.max(1320, Math.min(3190, targetElo));

    sendCommand('setoption name UCI_LimitStrength value true');
    sendCommand(`setoption name UCI_Elo value ${uciElo}`);
    sendCommand(`setoption name Skill Level value ${currentConfig.stockfishSkillLevel}`);
  };

  // Load Stockfish engine
  const loadEngine = async (useMultiThreaded: boolean): Promise<void> => {
    const engineType = useMultiThreaded ? 'multi' : 'single';

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
    const engineUrl = useMultiThreaded
      ? '/stockfish/stockfish-17.1-lite-51f59da.js'
      : '/stockfish/stockfish-17.1-lite-single-03e3232.js';

    // Create worker
    stockfish = new Worker(engineUrl);
    currentEngineType = engineType;

    stockfish.onmessage = handleStockfishMessage;
    stockfish.onerror = (error) => {
      console.error('Stockfish error:', error);
      isEngineReady = false;
    };

    // Initialize UCI
    await waitForReady('uci');

    // Configure engine strength
    configureStrength();

    await waitForReady('isready');

    isEngineReady = true;
  };

  // Public API

  const init = async (): Promise<void> => {
    if (isEngineReady || isInitializing) return;

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      console.warn('Web Workers not available, Stockfish disabled');
      return;
    }

    isInitializing = true;

    try {
      await loadEngine(currentConfig.useMultiThreaded);
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      isEngineReady = false;
    } finally {
      isInitializing = false;
    }
  };

  const setSkillLevel = async (level: SkillLevel): Promise<void> => {
    const newConfig = SKILL_CONFIGS[level];

    // Check if we need to switch engine type
    if (stockfish && newConfig.useMultiThreaded !== currentConfig.useMultiThreaded) {
      currentConfig = newConfig;
      await loadEngine(newConfig.useMultiThreaded);
    } else if (stockfish && isEngineReady) {
      currentConfig = newConfig;
      configureStrength();
    } else {
      currentConfig = newConfig;
    }
  };

  const getBestMove = async (
    fen: string,
    thinkingTime?: number
  ): Promise<string | null> => {
    // Initialize on first use (lazy loading)
    if (!isEngineReady) {
      await init();
    }

    if (!stockfish || !isEngineReady) {
      console.warn('Stockfish not ready, returning null');
      return null;
    }

    // Add artificial delay for "Anti-Stockfish" philosophy
    const artificialDelay = getThinkingDelay(currentConfig);
    await delay(artificialDelay);

    // For sub-1320 ELO levels, use aiMistakeRate to sometimes skip Stockfish entirely
    // This is indicated by returning null, which tells the caller to pick a random move
    if (currentConfig.elo < 1320 && Math.random() < currentConfig.aiMistakeRate) {
      // Return null to signal "make a random move" to the caller
      return null;
    }

    // Set position
    sendCommand(`position fen ${fen}`);

    // Request move
    return new Promise((resolve) => {
      pendingMove = resolve;

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingMove === resolve) {
          pendingMove = null;
          console.warn('Move calculation timeout');
          resolve(null);
        }
      }, 10000);

      // For sub-1320 ELO: use very limited depth (Stockfish can't play this weak)
      // For 1320+ ELO: let Stockfish use UCI_Elo to limit strength, use configured depth
      const depth = currentConfig.depth;

      if (currentConfig.elo < 1320) {
        // Very limited search for sub-Stockfish-minimum play
        sendCommand(`go depth ${Math.min(depth, 6)}`);
      } else if (currentConfig.elo < 1800) {
        // Use depth-limited search for mid-range
        sendCommand(`go depth ${depth}`);
      } else {
        // For master/grandmaster: give WASM engine more time to find strong moves.
        // WASM is slower than native, so it needs more time to reach comparable depth.
        const moveTime = thinkingTime ?? (currentConfig.elo >= 2500 ? 5000 : 3000);
        sendCommand(`go movetime ${moveTime}`);
      }
    });
  };

  const getEvaluation = async (
    fen: string,
    depth: number = 12
  ): Promise<EvalInfo | null> => {
    // Initialize on first use
    if (!isEngineReady) {
      await init();
    }

    if (!stockfish || !isEngineReady) {
      return null;
    }

    // Determine whose turn it is from FEN (second field after first space)
    // FEN format: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    const fenParts = fen.split(' ');
    const sideToMove = fenParts[1] || 'w';
    const isBlackToMove = sideToMove === 'b';

    // Reset last eval
    lastEvalInfo = null;

    // Set position
    sendCommand(`position fen ${fen}`);

    // Request evaluation
    return new Promise((resolve) => {
      pendingEval = (evalInfo) => {
        if (evalInfo && isBlackToMove) {
          // Stockfish returns score from side-to-move perspective
          // Negate to always show from White's perspective
          resolve({
            score: -evalInfo.score,
            mate: evalInfo.mate !== null ? -evalInfo.mate : null,
            depth: evalInfo.depth,
          });
        } else {
          resolve(evalInfo);
        }
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingEval) {
          const result = lastEvalInfo;
          pendingEval = null;
          if (result && isBlackToMove) {
            resolve({
              score: -result.score,
              mate: result.mate !== null ? -result.mate : null,
              depth: result.depth,
            });
          } else {
            resolve(result);
          }
        }
      }, 5000);

      sendCommand(`go depth ${depth}`);
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
    isInitializing = false;
    currentEngineType = null;
    pendingReady = null;
    pendingMove = null;
  };

  const isReady = (): boolean => isEngineReady;

  return {
    init,
    setSkillLevel,
    getBestMove,
    getEvaluation,
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
