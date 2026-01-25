import type { ChessEngine } from './engine';
import type { Square, Color, ThreatInfo } from './types';

/**
 * Danger detection module for RnS KnightSchool
 *
 * Analyzes the board to find pieces that are:
 * - Threatened (attacked by enemy pieces)
 * - Hanging (attacked but not defended)
 * - In danger of capture
 */

// --- Constants ---

const PIECE_VALUES: Record<string, number> = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1,
  k: 100,
};

const PIECE_NAMES: Record<string, string> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
  k: 'king',
};

// --- Helper functions ---

const getEnemyColor = (color: Color): Color => (color === 'w' ? 'b' : 'w');

const sortByPieceValue = (a: ThreatInfo, b: ThreatInfo): number =>
  PIECE_VALUES[b.piece] - PIECE_VALUES[a.piece];

// --- Core analysis functions ---

/**
 * Get threat information for a specific piece
 */
export const analyzePieceThreat = (
  engine: ChessEngine,
  square: Square,
  color: Color
): ThreatInfo | null => {
  const piece = engine.get(square);
  if (!piece || piece.color !== color) return null;

  const enemyColor = getEnemyColor(color);
  const attackers = engine.getAttackers(square, enemyColor);
  const defenders = engine.getDefenders(square, color);
  const isThreatened = attackers.length > 0;
  const isHanging = isThreatened && defenders.length === 0;

  return {
    square,
    piece: piece.type,
    color,
    attackers,
    defenders,
    isHanging,
    isThreatened,
  };
};

/**
 * Find all threatened pieces for a color
 */
export const findThreatenedPieces = (engine: ChessEngine, color: Color): ThreatInfo[] =>
  engine
    .getPieces(color)
    .map((piece) => analyzePieceThreat(engine, piece.square, color))
    .filter((threat): threat is ThreatInfo => threat?.isThreatened === true);

/**
 * Find all hanging pieces for a color (attacked but not defended)
 */
export const findHangingPieces = (engine: ChessEngine, color: Color): ThreatInfo[] =>
  findThreatenedPieces(engine, color).filter((t) => t.isHanging);

/**
 * Get the most valuable piece in danger
 */
export const findMostValuableThreat = (engine: ChessEngine, color: Color): ThreatInfo | null => {
  const threatened = findThreatenedPieces(engine, color);
  return threatened.length > 0
    ? [...threatened].sort(sortByPieceValue)[0]
    : null;
};

/**
 * Check if the king is in check
 */
export const isKingInCheck = (engine: ChessEngine, color: Color): boolean =>
  engine.turn === color && engine.isCheck;

/**
 * Get squares of pieces threatening the king
 */
export const getCheckingPieces = (engine: ChessEngine, color: Color): Square[] => {
  const kingSquare = engine.getKingSquare(color);
  return kingSquare ? engine.getAttackers(kingSquare, getEnemyColor(color)) : [];
};

// --- Full danger analysis ---

export interface DangerAnalysis {
  threatenedPieces: ThreatInfo[];
  hangingPieces: ThreatInfo[];
  isInCheck: boolean;
  checkingPieces: Square[];
  mostValuableThreat: ThreatInfo | null;
}

export const analyzeDanger = (engine: ChessEngine, color: Color): DangerAnalysis => {
  const threatenedPieces = findThreatenedPieces(engine, color);
  const isInCheck = isKingInCheck(engine, color);

  return {
    threatenedPieces,
    hangingPieces: threatenedPieces.filter((t) => t.isHanging),
    isInCheck,
    checkingPieces: isInCheck ? getCheckingPieces(engine, color) : [],
    mostValuableThreat: findMostValuableThreat(engine, color),
  };
};

// --- Message generation using array pattern ---

type DangerMessageRule = {
  condition: (analysis: DangerAnalysis) => boolean;
  message: (analysis: DangerAnalysis, playerName: string) => string;
};

const DANGER_MESSAGE_RULES: DangerMessageRule[] = [
  {
    condition: (a) => a.isInCheck,
    message: (_, name) => `${name}'re in check! Move your king to safety!`,
  },
  {
    condition: (a) => a.hangingPieces.length > 0,
    message: (a) => {
      const pieceName = PIECE_NAMES[a.hangingPieces[0].piece] ?? 'piece';
      return `Watch out! Your ${pieceName} is in danger!`;
    },
  },
  {
    condition: (a) => a.mostValuableThreat !== null,
    message: (a) => {
      const pieceName = PIECE_NAMES[a.mostValuableThreat!.piece] ?? 'piece';
      return `Be careful! Your ${pieceName} is being attacked.`;
    },
  },
];

/**
 * Get kid-friendly danger messages
 */
export const getDangerMessage = (
  analysis: DangerAnalysis,
  playerName?: string
): string | null => {
  const name = playerName ?? 'You';
  const matchingRule = DANGER_MESSAGE_RULES.find((rule) => rule.condition(analysis));
  return matchingRule ? matchingRule.message(analysis, name) : null;
};

/**
 * Get danger squares to highlight
 */
export const getDangerSquares = (engine: ChessEngine, color: Color): Set<Square> => {
  const analysis = analyzeDanger(engine, color);
  const squares = analysis.threatenedPieces.map((t) => t.square);

  // Add king square if in check
  const kingSquare = analysis.isInCheck ? engine.getKingSquare(color) : null;
  return new Set(kingSquare ? [...squares, kingSquare] : squares);
};
