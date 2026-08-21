import type { ChessEngine } from './engine';
import type { Square, Color, ChessMove, TacticResult, TacticType } from './types';

/**
 * Tactics detection module for RnS KnightSchool
 *
 * Detects chess tactics after moves:
 * - Fork: One piece attacking two+ valuable pieces
 * - Pin: Piece pinned to king/queen
 * - Skewer: Attack through a valuable piece to one behind
 * - Discovered attack: Moving piece reveals attack by another
 * - Check/Checkmate: King attacks
 *
 * Philosophy: Make kids feel like geniuses when they find tactics!
 */

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

/**
 * Kid-friendly celebration messages for tactics
 */
const TACTIC_MESSAGES: Record<TacticType, string[]> = {
  fork: [
    "Wow! You got them with a FORK! Two pieces, one attack!",
    "Amazing FORK! They can't save both pieces!",
    "FORK! Your piece is attacking two things at once!",
    "Double attack! That's called a FORK!",
  ],
  pin: [
    "Nice PIN! That piece is stuck!",
    "You've got them PINNED! They can't move without losing something big!",
    "Perfect PIN! That piece is frozen!",
    "Sneaky PIN! They're stuck!",
  ],
  skewer: [
    "SKEWER! You're poking right through!",
    "That's a SKEWER! Attack in a line!",
    "Great SKEWER! They have to move and lose the piece behind!",
  ],
  discovered_attack: [
    "DISCOVERED ATTACK! Surprise!",
    "You revealed a hidden attack! Sneaky!",
    "Your piece moved and revealed danger behind it!",
  ],
  check: [
    "Check! The king must move!",
    "You've got their king in CHECK!",
    "Check! Watch out for that king!",
  ],
  checkmate: [
    "CHECKMATE!! You WON! Great job!",
    "CHECKMATE!! The king has nowhere to go! VICTORY!",
    "CHECKMATE!! You're a chess champion!",
    "CHECKMATE!! Incredible! You trapped the king!",
  ],
};

const TACTIC_EMOJIS: Record<TacticType, string> = {
  fork: '🍴',
  pin: '📌',
  skewer: '🗡️',
  discovered_attack: '💥',
  check: '⚡',
  checkmate: '🏆',
};

function getRandomMessage(type: TacticType): string {
  const messages = TACTIC_MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Squares of enemy pieces attacked by our piece on `fromSquare`.
 * Turn-independent (works right after our own move, when it's the
 * opponent's turn and legal move generation returns nothing for us).
 */
function getAttackedEnemySquares(
  engine: ChessEngine,
  fromSquare: Square,
  ourColor: Color
): Square[] {
  const enemyColor: Color = ourColor === 'w' ? 'b' : 'w';
  return engine
    .getPieces(enemyColor)
    .filter((p) => engine.getAttackers(p.square, ourColor).includes(fromSquare))
    .map((p) => p.square);
}

/**
 * Detect if a move creates a fork (attacking 2+ valuable pieces)
 */
export function detectFork(engine: ChessEngine, move: ChessMove): TacticResult | null {
  const piece = engine.get(move.to);
  if (!piece) return null;

  // Find valuable enemy pieces our moved piece now attacks.
  // (Attack detection must be turn-independent - after our move it's the
  // opponent's turn, so we can't use legal move generation here.)
  const attackedPieces: Square[] = getAttackedEnemySquares(engine, move.to, piece.color).filter(
    (sq) => {
      const target = engine.get(sq);
      return target !== null && (PIECE_VALUES[target.type] >= 3 || target.type === 'k');
    }
  );

  // Need at least 2 valuable pieces for a fork
  if (attackedPieces.length >= 2) {
    return {
      type: 'fork',
      move,
      targets: attackedPieces,
      message: getRandomMessage('fork'),
      celebrationEmoji: TACTIC_EMOJIS.fork,
    };
  }

  return null;
}

/**
 * Detect if a move creates a pin
 */
export function detectPin(engine: ChessEngine, move: ChessMove): TacticResult | null {
  const piece = engine.get(move.to);
  if (!piece) return null;

  // Pins are typically created by bishops, rooks, and queens
  if (!['b', 'r', 'q'].includes(piece.type)) return null;

  const enemyColor = piece.color === 'w' ? 'b' : 'w';
  const enemyKingSquare = engine.getKingSquare(enemyColor);
  if (!enemyKingSquare) return null;

  // Check if we're attacking along a line that includes the king
  const attackedSquares = getAttackedEnemySquares(engine, move.to, piece.color);

  for (const attackedSquare of attackedSquares) {
    const target = engine.get(attackedSquare);
    if (!target) continue;

    // Check if this piece is between our piece and the enemy king
    const isOnLine = isSquareOnLine(move.to, attackedSquare, enemyKingSquare);
    if (isOnLine && PIECE_VALUES[target.type] < PIECE_VALUES['k']) {
      return {
        type: 'pin',
        move,
        targets: [attackedSquare, enemyKingSquare],
        message: getRandomMessage('pin'),
        celebrationEmoji: TACTIC_EMOJIS.pin,
      };
    }
  }

  return null;
}

/**
 * Detect if a move creates a skewer
 */
export function detectSkewer(engine: ChessEngine, move: ChessMove): TacticResult | null {
  const piece = engine.get(move.to);
  if (!piece) return null;

  // Skewers are typically created by bishops, rooks, and queens
  if (!['b', 'r', 'q'].includes(piece.type)) return null;

  const enemyColor = piece.color === 'w' ? 'b' : 'w';
  const enemyKingSquare = engine.getKingSquare(enemyColor);

  // Check if we're attacking the king and there's a valuable piece behind
  if (enemyKingSquare) {
    const isAttackingKing = engine
      .getAttackers(enemyKingSquare, piece.color)
      .includes(move.to);

    if (isAttackingKing) {
      // Look for pieces behind the king along the attack line
      const direction = getDirection(move.to, enemyKingSquare);
      if (direction) {
        const behindKing = getSquareBehind(enemyKingSquare, direction);
        if (behindKing) {
          const pieceBehind = engine.get(behindKing);
          if (pieceBehind && pieceBehind.color === enemyColor && PIECE_VALUES[pieceBehind.type] >= 3) {
            return {
              type: 'skewer',
              move,
              targets: [enemyKingSquare, behindKing],
              message: getRandomMessage('skewer'),
              celebrationEmoji: TACTIC_EMOJIS.skewer,
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Detect check or checkmate
 */
export function detectCheck(engine: ChessEngine, move: ChessMove): TacticResult | null {
  if (engine.isCheckmate) {
    const enemyColor = engine.turn;
    const kingSquare = engine.getKingSquare(enemyColor);
    return {
      type: 'checkmate',
      move,
      targets: kingSquare ? [kingSquare] : [],
      message: getRandomMessage('checkmate'),
      celebrationEmoji: TACTIC_EMOJIS.checkmate,
    };
  }

  if (engine.isCheck) {
    const enemyColor = engine.turn;
    const kingSquare = engine.getKingSquare(enemyColor);
    return {
      type: 'check',
      move,
      targets: kingSquare ? [kingSquare] : [],
      message: getRandomMessage('check'),
      celebrationEmoji: TACTIC_EMOJIS.check,
    };
  }

  return null;
}

/**
 * Detect all tactics for a move (returns the most impressive one)
 */
export function detectTactics(engine: ChessEngine, move: ChessMove): TacticResult | null {
  // Priority: Checkmate > Fork > Pin > Skewer > Check
  const checkResult = detectCheck(engine, move);
  if (checkResult?.type === 'checkmate') return checkResult;

  const forkResult = detectFork(engine, move);
  if (forkResult) return forkResult;

  const pinResult = detectPin(engine, move);
  if (pinResult) return pinResult;

  const skewerResult = detectSkewer(engine, move);
  if (skewerResult) return skewerResult;

  if (checkResult) return checkResult;

  return null;
}

// --- Helper functions ---

function isSquareOnLine(from: Square, through: Square, to: Square): boolean {
  const [fx, fy] = squareToCoords(from);
  const [tx, ty] = squareToCoords(through);
  const [ex, ey] = squareToCoords(to);

  // Check if all three are on the same line (horizontal, vertical, or diagonal)
  const dx1 = tx - fx;
  const dy1 = ty - fy;
  const dx2 = ex - fx;
  const dy2 = ey - fy;

  // Cross product should be 0 for collinear points
  if (dx1 * dy2 !== dy1 * dx2) return false;

  // Check that 'through' is between 'from' and 'to'
  return (
    Math.min(fx, ex) <= tx &&
    tx <= Math.max(fx, ex) &&
    Math.min(fy, ey) <= ty &&
    ty <= Math.max(fy, ey)
  );
}

function squareToCoords(square: Square): [number, number] {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]) - 1; // 1=0, 8=7
  return [file, rank];
}

function coordsToSquare(x: number, y: number): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  const file = String.fromCharCode(97 + x);
  const rank = y + 1;
  return `${file}${rank}` as Square;
}

function getDirection(from: Square, to: Square): [number, number] | null {
  const [fx, fy] = squareToCoords(from);
  const [tx, ty] = squareToCoords(to);

  const dx = tx - fx;
  const dy = ty - fy;

  if (dx === 0 && dy === 0) return null;

  // Normalize to unit direction
  const len = Math.max(Math.abs(dx), Math.abs(dy));
  return [dx / len, dy / len];
}

function getSquareBehind(square: Square, direction: [number, number]): Square | null {
  const [x, y] = squareToCoords(square);
  const newX = x + direction[0];
  const newY = y + direction[1];
  return coordsToSquare(newX, newY);
}

/**
 * Tactic explanations for kids (using object lookup instead of switch)
 */
const TACTIC_EXPLANATIONS: Record<TacticType, string> = {
  fork: 'A FORK is when one piece attacks two enemy pieces at the same time. They can only save one!',
  pin: "A PIN is when a piece can't move because it would expose a more valuable piece behind it.",
  skewer: 'A SKEWER is like a reverse pin - you attack a valuable piece, and when it moves, you capture what was behind it!',
  discovered_attack: 'A DISCOVERED ATTACK is when you move one piece and reveal an attack from another piece behind it. Surprise!',
  check: "CHECK means the king is being attacked! It must get to safety or block the attack.",
  checkmate: "CHECKMATE means the king is trapped and can't escape. Game over - you win!",
};

/**
 * Get a kid-friendly explanation of a tactic type
 */
export const getTacticExplanation = (type: TacticType): string =>
  TACTIC_EXPLANATIONS[type];
