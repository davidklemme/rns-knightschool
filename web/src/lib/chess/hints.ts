import type { ChessEngine } from './engine';
import type { Square, Color, ChessMove, PieceType } from './types';
import { PIECE_VALUES } from './types';
import { analyzeMoveSafety } from './move-safety';
import { getPieceStatuses } from './move-safety';
import { detectFork, detectPin, detectSkewer } from './tactics';

/**
 * Teaching hints for RnS KnightSchool
 *
 * The hint is a coaching tool, not a "best move" oracle. It picks a move
 * the child can learn from and explains the CONCEPT behind it - including
 * the second-level impact of the move (what it attacks, what it protects,
 * what it walks into), not just "this piece can capture".
 *
 * Concept ladder (what we look for, in order):
 * 1. checkmate     - win the game
 * 2. rescue        - a valuable piece is hanging: save it first!
 * 3. fork/pin/skewer - create a tactic (the "higher level" concepts)
 * 4. freePiece/goodTrade - win material with a SAFE capture
 * 5. check         - safe check to pressure the king
 * 6. develop       - a safe move that doesn't hang anything
 *
 * Every suggested move is safety-checked so the hint never teaches the
 * child to drop a piece.
 */

export type HintConcept =
  | 'checkmate'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'freePiece'
  | 'goodTrade'
  | 'rescue'
  | 'check'
  | 'develop';

export interface TeachingHint {
  from: Square;
  to: Square;
  concept: HintConcept;
  /** Second-level impact: squares this move affects (tactic targets, the
   *  piece being rescued, the piece being captured, the enemy king...) */
  impactSquares: Square[];
  message: string;
}

const PIECE_NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const pieceName = (type: PieceType): string => PIECE_NAMES[type];

const enemyOf = (color: Color): Color => (color === 'w' ? 'b' : 'w');

interface MoveCandidate {
  move: ChessMove;
  /** Net material the move risks (0 = safe) */
  risk: number;
  leavesHanging: Square[];
}

/**
 * Find the best teaching hint for the player.
 * Returns null only when there are no legal moves.
 */
export function getTeachingHint(
  engine: ChessEngine,
  playerColor: Color
): TeachingHint | null {
  if (engine.turn !== playerColor) return null;

  const legalMoves = engine.getAllLegalMoves();
  if (legalMoves.length === 0) return null;

  // Precompute safety for every legal move
  const candidates: MoveCandidate[] = legalMoves.map((move) => {
    const safety = analyzeMoveSafety(engine, move.from, move.to, playerColor);
    return {
      move,
      risk: safety.materialRisk,
      leavesHanging: safety.leavesHanging,
    };
  });

  // 1. Checkmate in one always wins
  const mate = findCheckmate(engine, legalMoves);
  if (mate) return mate;

  // 2. If a valuable piece is hanging, rescuing it comes before anything fancy
  const hanging = findMostValuableHangingPiece(engine, playerColor);
  if (hanging && PIECE_VALUES[hanging.type] >= 3) {
    const rescue = findRescue(engine, playerColor, hanging, candidates);
    if (rescue) return rescue;
  }

  // 3. Create a tactic - the "second level" concepts (fork, pin, skewer)
  const tactic = findTacticMove(engine, playerColor, candidates);
  if (tactic) return tactic;

  // 4. Win material with a safe capture
  const capture = findWinningCapture(engine, candidates);
  if (capture) return capture;

  // 2b. A small hanging piece is still worth saving once nothing wins material
  if (hanging) {
    const rescue = findRescue(engine, playerColor, hanging, candidates);
    if (rescue) return rescue;
  }

  // 5. A safe check keeps the pressure on
  const check = findSafeCheck(engine, candidates);
  if (check) return check;

  // 6. Fall back to a safe developing move
  return findDevelopingMove(engine, playerColor, candidates);
}

// --- Concept finders ---

const findCheckmate = (
  engine: ChessEngine,
  legalMoves: ChessMove[]
): TeachingHint | null => {
  for (const move of legalMoves) {
    const test = engine.clone();
    test.move(move.from, move.to, move.promotion);
    if (test.isCheckmate) {
      const kingSquare = test.getKingSquare(test.turn);
      return {
        from: move.from,
        to: move.to,
        concept: 'checkmate',
        impactSquares: kingSquare ? [kingSquare] : [],
        message: `Look closely... your ${pieceName(move.piece)} can trap their king. CHECKMATE is one move away!`,
      };
    }
  }
  return null;
};

const findMostValuableHangingPiece = (
  engine: ChessEngine,
  playerColor: Color
): { square: Square; type: PieceType } | null => {
  const statuses = getPieceStatuses(engine, playerColor);
  let best: { square: Square; type: PieceType } | null = null;

  for (const [square, status] of statuses) {
    if (status.status !== 'hanging') continue;
    const piece = engine.get(square);
    if (!piece || piece.type === 'k') continue;
    if (!best || PIECE_VALUES[piece.type] > PIECE_VALUES[best.type]) {
      best = { square, type: piece.type };
    }
  }

  return best;
};

const findRescue = (
  engine: ChessEngine,
  playerColor: Color,
  hanging: { square: Square; type: PieceType },
  candidates: MoveCandidate[]
): TeachingHint | null => {
  const enemyColor = enemyOf(playerColor);

  for (const { move, risk } of candidates) {
    if (risk > 0) continue;

    // Does this move leave the endangered piece safe?
    const test = engine.clone();
    const made = test.move(move.from, move.to, move.promotion);
    if (!made) continue;

    // Where is the endangered piece now? (It may be the one that moved)
    const pieceSquare = move.from === hanging.square ? move.to : hanging.square;
    const piece = test.get(pieceSquare);
    if (!piece || piece.color !== playerColor || piece.type !== hanging.type) continue;

    const attackers = test.getAttackers(pieceSquare, enemyColor);
    const defenders = test.getDefenders(pieceSquare, playerColor);
    const stillHanging = attackers.length > 0 && defenders.length === 0;
    if (stillHanging) continue;

    const name = pieceName(hanging.type);
    let message: string;

    if (move.from === hanging.square) {
      message = `Watch out - your ${name} is in danger! You can move it somewhere safe.`;
    } else if (move.captured && move.to !== hanging.square) {
      message = `Your ${name} is in danger! Your ${pieceName(move.piece)} can capture the attacker!`;
    } else {
      message = `Your ${name} is in danger! Your ${pieceName(move.piece)} can protect it - pieces that defend each other are strong.`;
    }

    return {
      from: move.from,
      to: move.to,
      concept: 'rescue',
      impactSquares: [hanging.square],
      message,
    };
  }

  return null;
};

const findTacticMove = (
  engine: ChessEngine,
  playerColor: Color,
  candidates: MoveCandidate[]
): TeachingHint | null => {
  let best: { hint: TeachingHint; score: number } | null = null;

  for (const { move, risk, leavesHanging } of candidates) {
    // A tactic hint must be safe - never teach a fork that drops the piece
    if (risk > 0 || leavesHanging.length > 0) continue;

    const test = engine.clone();
    const made = test.move(move.from, move.to, move.promotion);
    if (!made) continue;

    const tactic =
      detectFork(test, made) ?? detectPin(test, made) ?? detectSkewer(test, made);
    if (!tactic) continue;

    // Prefer the tactic hitting the most valuable targets
    const score = tactic.targets.reduce((sum, sq) => {
      const target = test.get(sq);
      return sum + (target ? PIECE_VALUES[target.type] || 10 : 0);
    }, 0);

    const name = pieceName(move.piece);
    const messages: Partial<Record<string, string>> = {
      fork: `Sneaky idea: your ${name} can attack TWO enemy pieces at once - that's a FORK! They can only save one.`,
      pin: `Your ${name} can PIN an enemy piece - it won't be able to move without losing something bigger behind it!`,
      skewer: `Your ${name} can SKEWER them - attack through one piece to win the one hiding behind it!`,
    };

    const hint: TeachingHint = {
      from: move.from,
      to: move.to,
      concept: tactic.type as HintConcept,
      impactSquares: tactic.targets,
      message: messages[tactic.type] ?? tactic.message,
    };

    if (!best || score > best.score) {
      best = { hint, score };
    }
  }

  return best?.hint ?? null;
};

const findWinningCapture = (
  engine: ChessEngine,
  candidates: MoveCandidate[]
): TeachingHint | null => {
  let best: { hint: TeachingHint; gain: number } | null = null;

  for (const { move, risk, leavesHanging } of candidates) {
    if (!move.captured || leavesHanging.length > 0) continue;

    const gain = PIECE_VALUES[move.captured] - risk;
    if (gain <= 0) continue;

    const capturedName = pieceName(move.captured);
    const isFree = risk === 0;
    const hint: TeachingHint = {
      from: move.from,
      to: move.to,
      concept: isFree ? 'freePiece' : 'goodTrade',
      impactSquares: [move.to],
      message: isFree
        ? `Free piece alert! Their ${capturedName} has nobody protecting it - your ${pieceName(move.piece)} can grab it safely.`
        : `Good trade! Your ${pieceName(move.piece)} can capture their ${capturedName} - you win more than you risk.`,
    };

    if (!best || gain > best.gain) {
      best = { hint, gain };
    }
  }

  return best?.hint ?? null;
};

const findSafeCheck = (
  engine: ChessEngine,
  candidates: MoveCandidate[]
): TeachingHint | null => {
  for (const { move, risk, leavesHanging } of candidates) {
    if (risk > 0 || leavesHanging.length > 0) continue;

    const test = engine.clone();
    test.move(move.from, move.to, move.promotion);
    if (!test.isCheck) continue;

    const kingSquare = test.getKingSquare(test.turn);
    return {
      from: move.from,
      to: move.to,
      concept: 'check',
      impactSquares: kingSquare ? [kingSquare] : [],
      message: `Your ${pieceName(move.piece)} can say CHECK! Their king will have to react - that keeps you in charge.`,
    };
  }
  return null;
};

const findDevelopingMove = (
  engine: ChessEngine,
  playerColor: Color,
  candidates: MoveCandidate[]
): TeachingHint | null => {
  const safeMoves = candidates.filter(
    (c) => c.risk === 0 && c.leavesHanging.length === 0
  );
  const pool = safeMoves.length > 0 ? safeMoves : candidates;
  if (pool.length === 0) return null;

  const homeRank = playerColor === 'w' ? '1' : '8';

  // Prefer bringing knights/bishops off the back rank, then center pawn
  // pushes - simple opening principles, still safety-checked.
  const development = pool.filter(
    (c) => ['n', 'b'].includes(c.move.piece) && c.move.from[1] === homeRank
  );
  const centerPawn = pool.filter(
    (c) => c.move.piece === 'p' && ['d', 'e'].includes(c.move.from[0])
  );

  const pickFrom = development.length > 0 ? development : centerPawn.length > 0 ? centerPawn : pool;
  const picked = pickFrom[Math.floor(Math.random() * pickFrom.length)];

  const message =
    development.length > 0
      ? `Try bringing your ${pieceName(picked.move.piece)} into the game - pieces in the middle control more squares!`
      : `Try moving your ${pieceName(picked.move.piece)} - it can go somewhere safe where nothing can capture it.`;

  return {
    from: picked.move.from,
    to: picked.move.to,
    concept: 'develop',
    impactSquares: [],
    message,
  };
};
