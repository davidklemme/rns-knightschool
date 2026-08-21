import type { ChessEngine } from './engine';
import type {
  Square,
  Color,
  MoveSafetyInfo,
  PieceStatusMap,
  AbandonmentWarning,
} from './types';
import { PIECE_VALUES } from './types';

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
  playerColor: Color
): MoveSafetyInfo => {
  const enemyColor = getEnemyColor(playerColor);

  // Clone engine and make the move
  const testEngine = engine.clone();
  const move = testEngine.move(from, to);

  if (!move) {
    // Invalid move - return default unsafe info
    return {
      from,
      to,
      isSafe: false,
      isRisky: true,
      wouldBeDefended: false,
      leavesHanging: [],
      materialRisk: 0,
    };
  }

  // Check if destination is attacked after move
  const attackersAtDest = testEngine.getAttackers(to, enemyColor);
  const defendersAtDest = testEngine.getDefenders(to, playerColor);
  const isRisky = attackersAtDest.length > 0;
  const wouldBeDefended = defendersAtDest.length > 0;

  // Find pieces we leave hanging by this move
  const leavesHanging = findPiecesLeftHanging(engine, testEngine, from, playerColor);

  // Calculate material risk
  const movedPiece = engine.get(from);
  const pieceValue = movedPiece ? PIECE_VALUES[movedPiece.type] : 0;
  let materialRisk = 0;

  if (isRisky && !wouldBeDefended) {
    materialRisk = pieceValue;
  } else if (isRisky && wouldBeDefended) {
    // Defended, but a cheaper attacker can still win material by trading
    // (e.g. a pawn capturing a defended knight nets 2). One-ply estimate:
    // our piece value minus the cheapest attacker's value.
    const cheapestAttacker = Math.min(
      ...attackersAtDest.map((sq) => {
        const attacker = testEngine.get(sq);
        return attacker ? PIECE_VALUES[attacker.type] : Infinity;
      })
    );
    materialRisk = Math.max(0, pieceValue - cheapestAttacker);
  }

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
  movedFrom: Square,
  playerColor: Color
): Square[] => {
  const enemyColor = getEnemyColor(playerColor);
  const hanging: Square[] = [];

  // Get all our pieces (excluding the one we just moved)
  const ourPieces = afterEngine.getPieces(playerColor);

  for (const piece of ourPieces) {
    // Skip kings - they can't be "hanging" in the traditional sense
    if (piece.type === 'k') continue;

    // Check if this piece was defended by the piece that moved
    const defendedBefore = beforeEngine.getDefenders(piece.square, playerColor);
    const wasDefendedByMover = defendedBefore.includes(movedFrom);

    if (wasDefendedByMover) {
      // Check if it's now attacked and undefended
      const attackersNow = afterEngine.getAttackers(piece.square, enemyColor);
      const defendersNow = afterEngine.getDefenders(piece.square, playerColor);

      if (attackersNow.length > 0 && defendersNow.length === 0) {
        hanging.push(piece.square);
      }
    }
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
    const safety = analyzeMoveSafety(engine, from, move.to, playerColor);
    result.set(move.to, safety);
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
    const attackers = engine.getAttackers(piece.square, enemyColor);
    const defenders = engine.getDefenders(piece.square, color);
    const isThreatened = attackers.length > 0;
    const isHanging = isThreatened && defenders.length === 0;

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
  const warnings: AbandonmentWarning[] = [];
  const enemyColor = getEnemyColor(playerColor);
  const movingPiece = engine.get(from);

  if (!movingPiece) return warnings;

  // Get all our pieces (excluding the one we're moving and king)
  const ourPieces = engine.getPieces(playerColor).filter(
    (p) => p.square !== from && p.type !== 'k'
  );

  // For each piece, check if we're currently defending it
  for (const piece of ourPieces) {
    const defenders = engine.getDefenders(piece.square, playerColor);

    // Check if the piece being moved is one of the defenders
    if (defenders.includes(from)) {
      // Check if this would leave the piece hanging
      const otherDefenders = defenders.filter((d) => d !== from);
      const attackers = engine.getAttackers(piece.square, enemyColor);

      // Would become hanging if attacked and no other defenders
      if (attackers.length > 0 && otherDefenders.length === 0) {
        warnings.push({
          abandonedSquare: piece.square,
          pieceType: piece.type,
          defenderSquare: from,
        });
      }
    }
  }

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
