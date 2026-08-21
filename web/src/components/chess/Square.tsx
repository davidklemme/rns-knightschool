'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Piece, GhostPiece, getPieceName } from './Piece';
import { BOARD_COLORS, getHighlightClass } from '@/lib/colors/chess-colors';
import type { Square as SquareType, PieceType, Color, HighlightType, PieceVisualStatus } from '@/lib/chess/types';

interface SquareProps {
  square: SquareType;
  piece: { type: PieceType; color: Color } | null;
  isLight: boolean;
  highlight: HighlightType;
  pieceStatus?: PieceVisualStatus;
  /** Faded grey echo of the piece that just moved away from this square */
  ghostPiece?: { type: PieceType; color: Color } | null;
  onClick: () => void;
  showCoordinates?: boolean;
  isFlipped?: boolean;
}

// --- Aria label generators (using arrays for extensibility) ---

type AriaModifier = {
  condition: (piece: { type: PieceType; color: Color } | null, highlight: HighlightType) => boolean;
  label: (piece: { type: PieceType; color: Color } | null, square: SquareType) => string;
};

const ARIA_MODIFIERS: AriaModifier[] = [
  {
    condition: (piece) => piece !== null,
    label: (piece, square) => `${getPieceName(piece!.type)} on ${square}`,
  },
  {
    condition: (_, highlight) => highlight === 'legalMove' || highlight === 'legalCapture',
    label: () => ', can move here',
  },
  {
    condition: (_, highlight) => highlight === 'danger' || highlight === 'inCheck',
    label: () => ', in danger',
  },
  {
    condition: (_, highlight) => highlight === 'hint',
    label: () => ', suggested move',
  },
  {
    condition: (_, highlight) => highlight === 'lastMoveFrom',
    label: () => ', last move started here',
  },
  {
    condition: (_, highlight) => highlight === 'lastMoveTo',
    label: () => ', last move ended here',
  },
];

const buildAriaLabel = (
  square: SquareType,
  piece: { type: PieceType; color: Color } | null,
  highlight: HighlightType
): string => {
  const baseLabel = piece ? '' : square;
  const modifiers = ARIA_MODIFIERS
    .filter((mod) => mod.condition(piece, highlight))
    .map((mod) => mod.label(piece, square));

  return [baseLabel, ...modifiers].filter(Boolean).join('');
};

/**
 * Single chess board square with piece and highlighting
 */
export function Square({
  square,
  piece,
  isLight,
  highlight,
  pieceStatus,
  ghostPiece,
  onClick,
  showCoordinates = false,
  isFlipped = false,
}: SquareProps) {
  const file = square[0];
  const rank = square[1];

  // Coordinate visibility using ternary (simpler than array for boolean pairs)
  const showFile = isFlipped ? rank === '8' : rank === '1';
  const showRank = isFlipped ? file === 'h' : file === 'a';
  const coordTextColor = isLight ? 'text-amber-800/70' : 'text-amber-200/70';

  const highlightClass = getHighlightClass(highlight);
  const ariaLabel = buildAriaLabel(square, piece, highlight);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'relative aspect-square w-full',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset',
        highlightClass
      )}
      style={{
        backgroundColor: isLight ? BOARD_COLORS.light : BOARD_COLORS.dark,
      }}
    >
      {/* Piece */}
      {piece && (
        <Piece
          type={piece.type}
          color={piece.color}
          isAnimating={highlight === 'lastMoveTo'}
          status={pieceStatus}
        />
      )}

      {/* Ghost of the piece that just left this square (hidden while move dots are shown) */}
      {!piece && ghostPiece && highlight === 'lastMoveFrom' && (
        <GhostPiece type={ghostPiece.type} color={ghostPiece.color} />
      )}

      {/* Move indicators (colored dots for empty squares) */}
      {!piece && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Safe move - green dot */}
          {highlight === 'legalMove' && (
            <div className="w-1/4 h-1/4 rounded-full bg-green-500/60" />
          )}
          {/* Risky move - red dot */}
          {highlight === 'riskyMove' && (
            <div className="w-1/4 h-1/4 rounded-full bg-red-500/70 ring-2 ring-red-400/50" />
          )}
          {/* Leaves piece hanging - orange dot */}
          {highlight === 'leavesHanging' && (
            <div className="w-1/4 h-1/4 rounded-full bg-orange-500/70 ring-2 ring-orange-400/50" />
          )}
        </div>
      )}

      {/* Coordinates */}
      {showCoordinates && showFile && (
        <span className={cn('absolute bottom-0.5 right-1 text-xs font-medium pointer-events-none', coordTextColor)}>
          {file}
        </span>
      )}
      {showCoordinates && showRank && (
        <span className={cn('absolute top-0.5 left-1 text-xs font-medium pointer-events-none', coordTextColor)}>
          {rank}
        </span>
      )}
    </motion.button>
  );
}
