import type { ChessEngine } from './engine';
import type {
  Square,
  Color,
  MoveSafetyInfo,
  PieceStatusMap,
  PieceType,
  AbandonmentWarning,
} from './types';
import { PIECE_VALUES } from './types';
import { exchangeGain, legalCapturers, positionForTurn } from './exchange';

/**
 * Move Safety Analysis Module for RnS KnightSchool
 *
 * Provides lookahead analysis to help kids understand:
 * - Which destinations are safe vs risky
 * - Which pieces would be left hanging
 * - Current piece danger status
 */

// --- Constants ---

const getEnemyColor = (color: Color): Color => (color === 'w' ? 'b' : 'w');

// --- Core analysis functions ---

/**
 * Analyze a single move's safety
 */
export const analyzeMoveSafety = (
  engine: ChessEngine,
  from: Square,
  to: Square,
  playerColor: Color,
  promotion?: PieceType
): MoveSafetyInfo => {
  const enemyColor = getEnemyColor(playerColor);

  // Clone engine and make the move
  const testEngine = engine.clone();
  const move = testEngine.move(from, to, promotion);

  if (!move) {
    // Invalid move - return default unsafe info
    return {
      from,
      to,
      isSafe: false,
      isRisky: true,
      wouldBeDefended: false,
      leavesHanging: [],
      materialRisk: Infinity,
    };
  }

  // Check if destination is attacked after move
  const attackersAtDest = legalCapturers(testEngine, to, enemyColor);
  const defendersAtDest = testEngine.getDefenders(to, playerColor);
  const isRisky = attackersAtDest.length > 0;
  const wouldBeDefended = defendersAtDest.length > 0;

  // Find pieces we leave hanging by this move
  const leavesHanging = findPiecesLeftHanging(engine, testEngine, to, playerColor);

  // Legal recapture sequences exclude pinned defenders and handle x-rays.
  let materialRisk = exchangeGain(testEngine, to);

  // Add value of pieces left hanging
  for (const sq of leavesHanging) {
    const hangingPiece = testEngine.get(sq);
    if (hangingPiece) {
      materialRisk += PIECE_VALUES[hangingPiece.type];
    }
  }

  return {
    from,
    to,
    isSafe: !isRisky,
    isRisky,
    wouldBeDefended,
    leavesHanging,
    materialRisk,
  };
};

/**
 * Find pieces that become hanging after a move
 */
const findPiecesLeftHanging = (
  beforeEngine: ChessEngine,
  afterEngine: ChessEngine,
  movedTo: Square,
  playerColor: Color
): Square[] => {
  const enemyColor = getEnemyColor(playerColor);
  const hanging: Square[] = [];

  // Get all our pieces (excluding the one we just moved)
  const ourPieces = afterEngine.getPieces(playerColor);

  for (const piece of ourPieces) {
    // Skip kings - they can't be "hanging" in the traditional sense
    if (piece.type === 'k') continue;

    if (piece.square === movedTo) continue;
    const beforeRisk = exchangeGain(positionForTurn(beforeEngine, enemyColor), piece.square);
    const afterRisk = exchangeGain(positionForTurn(afterEngine, enemyColor), piece.square);
    if (afterRisk > beforeRisk) hanging.push(piece.square);
  }

  return hanging;
};

/**
 * Analyze all moves from a square (for highlight calculation)
 */
export const analyzeAllMoves = (
  engine: ChessEngine,
  from: Square,
  playerColor: Color
): Map<Square, MoveSafetyInfo> => {
  const result = new Map<Square, MoveSafetyInfo>();
  const legalMoves = engine.getLegalMoves(from);

  for (const move of legalMoves) {
    const safety = analyzeMoveSafety(engine, from, move.to, playerColor, move.promotion);
    const previous = result.get(move.to);
    // One destination may offer four promotions; don't mark it safe only
    // because the last underpromotion examined happened to be cheaper.
    if (!previous || safety.materialRisk > previous.materialRisk) result.set(move.to, safety);
  }

  return result;
};

/**
 * Get status of all pieces for a color (for glow indicators)
 */
export const getPieceStatuses = (
  engine: ChessEngine,
  color: Color
): PieceStatusMap => {
  const statuses: PieceStatusMap = new Map();
  const enemyColor = getEnemyColor(color);
  const pieces = engine.getPieces(color);

  for (const piece of pieces) {
    const attackers = piece.type === 'k' ? engine.getAttackers(piece.square, enemyColor) : legalCapturers(engine, piece.square, enemyColor);
    const defenders = engine.getDefenders(piece.square, color);
    const isThreatened = attackers.length > 0;
    const isHanging = isThreatened && exchangeGain(positionForTurn(engine, enemyColor), piece.square) > 0;

    let status: 'safe' | 'threatened' | 'hanging';
    if (isHanging) {
      status = 'hanging';
    } else if (isThreatened) {
      status = 'threatened';
    } else {
      status = 'safe';
    }

    statuses.set(piece.square, {
      square: piece.square,
      status,
      attackers,
      defenders,
    });
  }

  return statuses;
};

/**
 * Find abandonment warnings (pieces that would become undefended if we move)
 */
export const findAbandonmentWarnings = (
  engine: ChessEngine,
  from: Square,
  playerColor: Color
): AbandonmentWarning[] => {
  const warned = new Map<Square, AbandonmentWarning>();
  if (engine.turn !== playerColor) return [];
  for (const move of engine.getLegalMoves(from)) {
    const after = engine.clone();
    after.move(from, move.to, move.promotion);
    for (const square of findPiecesLeftHanging(engine, after, move.to, playerColor)) {
      const piece = after.get(square)!;
      warned.set(square, {abandonedSquare:square, pieceType:piece.type, defenderSquare:from});
    }
  }
  const warnings = [...warned.values()];
  return warnings;
};

/**
 * Get all pieces that are currently being defended by a specific square
 */
export const getDefendedPieces = (
  engine: ChessEngine,
  defenderSquare: Square,
  color: Color
): Square[] => {
  const defended: Square[] = [];
  const pieces = engine.getPieces(color);

  for (const piece of pieces) {
    if (piece.square === defenderSquare) continue;

    const defenders = engine.getDefenders(piece.square, color);
    if (defenders.includes(defenderSquare)) {
      defended.push(piece.square);
    }
  }

  return defended;
};
