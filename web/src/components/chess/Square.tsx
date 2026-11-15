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

const HIGHLIGHT_LABELS: Partial<Record<HighlightType, string>> = {
  selected:'selected', legalMove:'legal move, check for threats', legalCapture:'capture available',
  riskyMove:'risky destination', riskyCapture:'risky capture', leavesHanging:'move exposes another piece',
  danger:'under attack', inCheck:'king in check', hint:'suggested move',
  tacticSource:'tactical piece', tacticTarget:'tactical target',
  lastMoveFrom:'last move started here', lastMoveTo:'last move ended here',
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
  const ariaLabel = [piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${getPieceName(piece.type)} on ${square}` : square,
    HIGHLIGHT_LABELS[highlight], pieceStatus && pieceStatus !== 'none' ?
      ({hanging:'could lose material', threatened:'under attack', wouldAbandon:'moving the selected piece may expose this piece'}[pieceStatus]) : '']
    .filter(Boolean).join(', ');

  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'relative aspect-square w-full',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset'
      )}
      style={{
        backgroundColor: isLight ? BOARD_COLORS.light : BOARD_COLORS.dark,
      }}
    >
      {/* Keep the teaching tint above the base board color and below pieces. */}
      <div
        aria-hidden="true"
        className={cn('absolute inset-0 pointer-events-none ring-inset', highlightClass)}
      />
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

      {['riskyMove', 'riskyCapture', 'leavesHanging', 'danger', 'inCheck'].includes(highlight) &&
        <span aria-hidden="true" className="absolute top-0 right-0 rounded-full bg-white text-red-800 font-bold text-xs px-1 pointer-events-none">!</span>}
      {highlight === 'hint' && <span aria-hidden="true" className="absolute top-0 right-0 bg-purple-800 text-white text-xs px-1 pointer-events-none">?</span>}
      {highlight === 'tacticTarget' && <span aria-hidden="true" className="absolute top-0 right-0 bg-yellow-200 text-black text-xs px-1 pointer-events-none">★</span>}
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
