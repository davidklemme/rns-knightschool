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
// U+FE0E is the text variation selector - forces text rendering on iOS

const VS = '\uFE0E'; // Variation Selector 15 - force text presentation

const PIECE_CHARS: Record<PieceType, Record<Color, string>> = {
  k: { w: `\u2654${VS}`, b: `\u265A${VS}` },  // ♔ / ♚
  q: { w: `\u2655${VS}`, b: `\u265B${VS}` },  // ♕ / ♛
  r: { w: `\u2656${VS}`, b: `\u265C${VS}` },  // ♖ / ♜
  b: { w: `\u2657${VS}`, b: `\u265D${VS}` },  // ♗ / ♝
  n: { w: `\u2658${VS}`, b: `\u265E${VS}` },  // ♘ / ♞
  p: { w: `\u2659${VS}`, b: `\u265F${VS}` },  // ♙ / ♟
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
          'text-4xl lg:text-6xl xl:text-7xl',
          // Add depth
          'drop-shadow-lg',
          // Status-based styling
          statusStyle
        )}
        style={{
          // Force text rendering, not emoji - critical for iOS Safari
          fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", "DejaVu Sans", sans-serif',
          fontVariantEmoji: 'text',
          // White outline chars need fill, black solid chars are already filled
          color: isWhite ? '#f9f9f9' : '#1a1a1a',
          // Shadow for depth
          textShadow: isWhite
            ? '0 2px 4px rgba(0,0,0,0.4)'
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
