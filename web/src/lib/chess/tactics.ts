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
    "Amazing FORK! Look at both targets!",
    "FORK! Your piece is attacking two things at once!",
    "Double attack! That's called a FORK!",
  ],
  pin: [
    "Nice PIN! Moving that piece could expose the one behind!",
    "You've got a PIN! Look at the two pieces in that line.",
    "PIN! A more valuable piece is behind that target.",
    "Sneaky PIN! Those pieces are connected by your attack.",
  ],
  skewer: [
    "SKEWER! You're poking right through!",
    "That's a SKEWER! Attack in a line!",
    "Great SKEWER! Look for the target behind the valuable piece!",
  ],
  discovered_attack: [
    "DISCOVERED ATTACK! Surprise!",
    "You revealed a hidden attack! Sneaky!",
    "Your piece moved and revealed danger behind it!",
  ],
  check: [
    "Check! They must answer the attack on their king!",
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

/** First two occupied squares along each ray, stopping at every blocker. */
function rayTargets(engine: ChessEngine, from: Square): Square[][] {
  const piece = engine.get(from);
  if (!piece || !['b', 'r', 'q'].includes(piece.type)) return [];
  const directions: [number, number][] = [];
  if (piece.type !== 'b') directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  if (piece.type !== 'r') directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  const [x, y] = squareToCoords(from);
  return directions.map(([dx, dy]) => {
    const targets: Square[] = [];
    for (let i = 1; i < 8; i++) {
      const square = coordsToSquare(x + dx * i, y + dy * i);
      if (!square) break;
      if (engine.get(square)) {
        if (engine.get(square)!.color === piece.color) break;
        targets.push(square);
        if (targets.length === 2) break;
      }
    }
    return targets;
  }).filter(targets => targets.length === 2);
}

export function detectPin(engine: ChessEngine, move: ChessMove): TacticResult | null {
  for (const [front, back] of rayTargets(engine, move.to)) {
    const a = engine.get(front)!;
    const b = engine.get(back)!;
    if (PIECE_VALUES[b.type] > PIECE_VALUES[a.type]) {
      return {type:'pin', move, targets:[front, back],
        message:getRandomMessage('pin'), celebrationEmoji:TACTIC_EMOJIS.pin};
    }
  }
  return null;
}

export function detectSkewer(engine: ChessEngine, move: ChessMove): TacticResult | null {
  for (const [front, back] of rayTargets(engine, move.to)) {
    const a = engine.get(front)!;
    const b = engine.get(back)!;
    if (PIECE_VALUES[a.type] > PIECE_VALUES[b.type] && PIECE_VALUES[b.type] >= 3) {
      return {type:'skewer', move, targets:[front, back],
        message:getRandomMessage('skewer'), celebrationEmoji:TACTIC_EMOJIS.skewer};
    }
  }
  return null;
}

export function detectDiscoveredAttack(
  engine: ChessEngine, move: ChessMove, before?: ChessEngine
): TacticResult | null {
  const mover = engine.get(move.to);
  if (!before || !mover) return null;
  for (const piece of engine.getPieces(mover.color)) {
    if (piece.square === move.to || !['b', 'r', 'q'].includes(piece.type) ||
      before.get(piece.square)?.type !== piece.type || before.get(piece.square)?.color !== mover.color) continue;
    const targets = getAttackedEnemySquares(engine, piece.square, mover.color)
      .filter(square => PIECE_VALUES[engine.get(square)!.type] >= 3 &&
        !before.getAttackers(square, mover.color).includes(piece.square));
    if (targets.length) return {type:'discovered_attack', move,
      targets:[piece.square, ...targets], message:getRandomMessage('discovered_attack'),
      celebrationEmoji:TACTIC_EMOJIS.discovered_attack};
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
export function detectTactics(engine: ChessEngine, move: ChessMove, before?: ChessEngine): TacticResult | null {
  // Priority: Checkmate > Fork > Pin > Skewer > Check
  const checkResult = detectCheck(engine, move);
  if (checkResult?.type === 'checkmate') return checkResult;

  const forkResult = detectFork(engine, move);
  if (forkResult) return forkResult;

  const pinResult = detectPin(engine, move);
  if (pinResult) return pinResult;

  const skewerResult = detectSkewer(engine, move);
  if (skewerResult) return skewerResult;

  const discovered = detectDiscoveredAttack(engine, move, before);
  if (discovered) return discovered;

  if (checkResult) return checkResult;

  return null;
}

// --- Helper functions ---

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

/**
 * Tactic explanations for kids (using object lookup instead of switch)
 */
const TACTIC_EXPLANATIONS: Record<TacticType, string> = {
  fork: 'A FORK is when one piece attacks two enemy pieces at the same time. Look at how your opponent might answer both threats.',
  pin: "A PIN attacks a piece with a more valuable piece behind it. Moving could expose that piece. A piece pinned to its king must keep the king safe.",
  skewer: 'A SKEWER is like a reverse pin - you attack a valuable piece, and when it moves, you may be able to capture what was behind it!',
  discovered_attack: 'A DISCOVERED ATTACK is when you move one piece and reveal an attack from another piece behind it. Surprise!',
  check: "CHECK means the king is being attacked! Answer by moving the king, capturing the attacker, or blocking the attack when possible.",
  checkmate: "CHECKMATE means the king is trapped and can't escape. Game over - you win!",
};

/**
 * Get a kid-friendly explanation of a tactic type
 */
export const getTacticExplanation = (type: TacticType): string =>
  TACTIC_EXPLANATIONS[type];
