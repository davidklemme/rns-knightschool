'use client';

import { motion } from 'framer-motion';
import type { PieceType, Color, PieceVisualStatus } from '@/lib/chess/types';
import { cn } from '@/lib/utils';
import { ANIMATION_DURATIONS } from '@/lib/colors/chess-colors';

interface PieceProps {
  type: PieceType;
  color: Color;
  isAnimating?: boolean;
  status?: PieceVisualStatus;
  className?: string;
}

// --- Piece status visual styles ---
const PIECE_STATUS_STYLES: Record<PieceVisualStatus, string> = {
  none: '',
  hanging: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-piece-danger-glow',
  threatened: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.7)]',
  wouldAbandon: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.6)] animate-piece-warning-glow',
};

// --- Piece character mapping ---
// White pieces: outline characters (♔♕♖♗♘♙ U+2654-2659)
// Black pieces: solid characters (♚♛♜♝♞♟ U+265A-265F)
// This is the standard Unicode mapping and works reliably on iOS

const PIECE_CHARS: Record<PieceType, Record<Color, string>> = {
  k: { w: '\u2654', b: '\u265A' },  // ♔ / ♚
  q: { w: '\u2655', b: '\u265B' },  // ♕ / ♛
  r: { w: '\u2656', b: '\u265C' },  // ♖ / ♜
  b: { w: '\u2657', b: '\u265D' },  // ♗ / ♝
  n: { w: '\u2658', b: '\u265E' },  // ♘ / ♞
  p: { w: '\u2659', b: '\u265F' },  // ♙ / ♟
};

const PIECE_NAMES: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
};

/**
 * Chess piece component with Unicode characters
 * Larger size for better visibility, longer animation for move tracking
 * Supports status indicators (hanging, threatened, wouldAbandon)
 */
export function Piece({ type, color, isAnimating, status = 'none', className }: PieceProps) {
  const isWhite = color === 'w';
  const char = PIECE_CHARS[type][color];
  const statusStyle = PIECE_STATUS_STYLES[status];

  // Animation variants
  const variants = {
    initial: isAnimating ? { scale: 0.5, opacity: 0, y: -10 } : {},
    animate: { scale: 1, opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        duration: ANIMATION_DURATIONS.pieceMove,
      }}
      className={cn(
        'w-full h-full flex items-center justify-center select-none pointer-events-none relative',
        className
      )}
    >
      <span
        className={cn(
          // Much larger pieces - 85% of square size
          'text-[min(11vw,4rem)] leading-none',
          'landscape:text-[min(13vh,4rem)]',
          'lg:text-6xl xl:text-7xl',
          // Add depth
          'drop-shadow-lg',
          // Status-based styling
          statusStyle
        )}
        style={{
          // Prefer symbol fonts over emoji rendering
          fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", Arial, sans-serif',
          // White pieces use outline chars - just need dark color for the outline
          // Black pieces use solid chars - dark fill
          color: isWhite ? '#1a1a1a' : '#1a1a1a',
          // Shadow for depth and visibility on all square colors
          textShadow: isWhite
            ? '0 2px 4px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.3)',
          lineHeight: 1,
        }}
      >
        {char}
      </span>

      {/* Warning badge for pieces that would be abandoned */}
      {status === 'wouldAbandon' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow-md z-10">
          <span className="text-white text-xs font-bold leading-none">!</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Get piece display name for accessibility
 */
export const getPieceName = (type: PieceType): string => PIECE_NAMES[type];
