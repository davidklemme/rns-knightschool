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
// White pieces use outline characters (♔♕♖♗♘♙ U+2654-2659)
// Black pieces use filled characters (♚♛♜♝♞♟ U+265A-265F)
// This ensures correct rendering across all platforms including iOS

const PIECE_CHARS: Record<PieceType, Record<Color, string>> = {
  k: { w: '\u2654', b: '\u265A' },  // ♔ outline king / ♚ solid king
  q: { w: '\u2655', b: '\u265B' },  // ♕ outline queen / ♛ solid queen
  r: { w: '\u2656', b: '\u265C' },  // ♖ outline rook / ♜ solid rook
  b: { w: '\u2657', b: '\u265D' },  // ♗ outline bishop / ♝ solid bishop
  n: { w: '\u2658', b: '\u265E' },  // ♘ outline knight / ♞ solid knight
  p: { w: '\u2659', b: '\u265F' },  // ♙ outline pawn / ♟ solid pawn
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
          // Use serif font stack to ensure text rendering (not emoji) on iOS
          fontFamily: '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", "DejaVu Sans", sans-serif',
          // White pieces use outline chars - render in white with dark stroke for visibility
          // Black pieces use filled chars - render in dark color
          color: isWhite ? '#ffffff' : '#1a1a1a',
          // Stroke for better visibility on all board colors
          WebkitTextStroke: isWhite ? '1px #333333' : '0.5px #000000',
          // Shadow for depth and visibility
          textShadow: isWhite
            ? '0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.3)',
          // Ensure pieces fill the square better
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
