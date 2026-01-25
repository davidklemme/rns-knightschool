/**
 * Stockfish Service for AI opponent - Functional Implementation
 *
 * Philosophy: "Anti-Stockfish" - the AI should make learning opportunities,
 * not crush kids. Higher mistake rates for lower skill levels.
 */

import { createEngine, type ChessEngine } from './engine';
import type { SkillLevel, SkillConfig, ChessMove } from './types';
import { SKILL_CONFIGS } from './types';

// --- Pure utility functions ---

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const pieceValue = (piece: string): number => PIECE_VALUES[piece] ?? 0;

const moveToUci = (move: ChessMove): string =>
  `${move.from}${move.to}${move.promotion ?? ''}`;

const randomItem = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// --- Move evaluation functions ---

const findCheckmates = (engine: ChessEngine, moves: ChessMove[]): ChessMove[] =>
  moves.filter((move) => {
    const testEngine = engine.clone();
    testEngine.move(move.from, move.to, move.promotion);
    return testEngine.isCheckmate;
  });

const findChecks = (engine: ChessEngine, moves: ChessMove[]): ChessMove[] =>
  moves.filter((move) => {
    const testEngine = engine.clone();
    testEngine.move(move.from, move.to, move.promotion);
    return testEngine.isCheck;
  });

const findCaptures = (moves: ChessMove[]): ChessMove[] =>
  moves
    .filter((m) => m.captured)
    .sort((a, b) => pieceValue(b.captured!) - pieceValue(a.captured!));

const findDevelopmentMoves = (moves: ChessMove[]): ChessMove[] =>
  moves.filter(
    (m) =>
      ['n', 'b'].includes(m.piece) && ['1', '8'].includes(m.from[1])
  );

const findTacticOpportunities = (
  engine: ChessEngine,
  moves: ChessMove[]
): ChessMove[] => {
  const ourColor = engine.turn;
  const theirColor = ourColor === 'w' ? 'b' : 'w';

  return moves.filter((move) => {
    const testEngine = engine.clone();
    testEngine.move(move.from, move.to, move.promotion);
    const ourPieces = testEngine.getPieces(ourColor);
    return ourPieces.some((piece) =>
      testEngine.isAttacked(piece.square, theirColor)
    );
  });
};

// --- Move selection strategies ---

type MoveStrategy = (
  engine: ChessEngine,
  moves: ChessMove[]
) => ChessMove | null;

const checkmateStrategy: MoveStrategy = (engine, moves) => {
  const checkmates = findCheckmates(engine, moves);
  return checkmates.length > 0 ? checkmates[0] : null;
};

const goodMoveStrategy: MoveStrategy = (engine, moves) => {
  const checks = findChecks(engine, moves);
  const captures = findCaptures(moves);
  const goodMoves = [...checks, ...captures];

  return goodMoves.length > 0 && Math.random() < 0.7 ? goodMoves[0] : null;
};

const developmentStrategy: MoveStrategy = (engine, moves) => {
  const devMoves = findDevelopmentMoves(moves);
  return devMoves.length > 0 && Math.random() < 0.5 ? randomItem(devMoves) : null;
};

const randomStrategy: MoveStrategy = (_, moves) => randomItem(moves);

// Ordered list of strategies to try
const MOVE_STRATEGIES: MoveStrategy[] = [
  checkmateStrategy,
  goodMoveStrategy,
  developmentStrategy,
  randomStrategy,
];

const selectGoodMove = (engine: ChessEngine, moves: ChessMove[]): ChessMove => {
  for (const strategy of MOVE_STRATEGIES) {
    const move = strategy(engine, moves);
    if (move) return move;
  }
  return moves[0]; // Fallback (should never reach here)
};

// --- State management using closure ---

interface StockfishState {
  isReady: boolean;
  config: SkillConfig;
}

const createState = (skillLevel: SkillLevel): StockfishState => ({
  isReady: false,
  config: SKILL_CONFIGS[skillLevel],
});

// --- Public API ---

export interface StockfishService {
  init: () => Promise<void>;
  setSkillLevel: (level: SkillLevel) => void;
  getBestMove: (fen: string, thinkingTime?: number) => Promise<string | null>;
  getTrainingMove: (fen: string) => Promise<string | null>;
  terminate: () => void;
}

export const createStockfishService = (
  skillLevel: SkillLevel = 'learning'
): StockfishService => {
  const state = createState(skillLevel);

  const init = async (): Promise<void> => {
    state.isReady = true;
  };

  const setSkillLevel = (level: SkillLevel): void => {
    state.config = SKILL_CONFIGS[level];
  };

  const getBestMove = async (
    fen: string,
    thinkingTime?: number
  ): Promise<string | null> => {
    if (!state.isReady) await init();

    const engine = createEngine(fen);
    const legalMoves = engine.getAllLegalMoves();

    if (legalMoves.length === 0) return null;

    await delay(thinkingTime ?? 500 + Math.random() * 1000);

    const shouldMistake = Math.random() < state.config.aiMistakeRate;
    const selectedMove = shouldMistake
      ? randomItem(legalMoves)
      : selectGoodMove(engine, legalMoves);

    return moveToUci(selectedMove);
  };

  const getTrainingMove = async (fen: string): Promise<string | null> => {
    if (!state.isReady) await init();

    const engine = createEngine(fen);
    const legalMoves = engine.getAllLegalMoves();

    if (legalMoves.length === 0) return null;

    const trainingMistakeRate = state.config.aiMistakeRate * 1.5;
    const shouldCreateOpportunity = Math.random() < trainingMistakeRate;

    if (shouldCreateOpportunity) {
      const tacticMoves = findTacticOpportunities(engine, legalMoves);
      if (tacticMoves.length > 0) {
        return moveToUci(randomItem(tacticMoves));
      }
    }

    return moveToUci(selectGoodMove(engine, legalMoves));
  };

  const terminate = (): void => {
    state.isReady = false;
  };

  return {
    init,
    setSkillLevel,
    getBestMove,
    getTrainingMove,
    terminate,
  };
};

// Singleton instance using closure
let serviceInstance: StockfishService | null = null;

export const getStockfishService = (): StockfishService => {
  if (!serviceInstance) {
    serviceInstance = createStockfishService();
  }
  return serviceInstance;
};
