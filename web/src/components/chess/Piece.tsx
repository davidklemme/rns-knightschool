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
// Use filled/solid characters (♚♛♜♝♞♟ U+265A-265F) for BOTH colors
// CSS styling differentiates white vs black pieces
// This ensures solid appearance on all platforms including iOS

const PIECE_CHARS: Record<PieceType, Record<Color, string>> = {
  k: { w: '\u265A', b: '\u265A' },  // ♚ solid king
  q: { w: '\u265B', b: '\u265B' },  // ♛ solid queen
  r: { w: '\u265C', b: '\u265C' },  // ♜ solid rook
  b: { w: '\u265D', b: '\u265D' },  // ♝ solid bishop
  n: { w: '\u265E', b: '\u265E' },  // ♞ solid knight
  p: { w: '\u265F', b: '\u265F' },  // ♟ solid pawn
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
          // Force text rendering (not emoji) - critical for iOS
          // "text" tells the browser to prefer text glyphs over emoji
          fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", Arial, sans-serif',
          // White pieces: solid white fill with dark outline for visibility
          // Black pieces: solid dark fill
          color: isWhite ? '#ffffff' : '#1a1a1a',
          // Dark stroke around white pieces for definition, subtle stroke on black
          WebkitTextStroke: isWhite ? '1.5px #2a2a2a' : '0.5px #000000',
          // Paint order: fill first, then stroke (so stroke is outside)
          paintOrder: 'fill stroke',
          // Shadow for depth and visibility on all square colors
          textShadow: isWhite
            ? '0 2px 4px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.8)'
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
