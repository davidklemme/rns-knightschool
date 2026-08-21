'use client';

import { Square } from './Square';
import { cn } from '@/lib/utils';
import type { Square as SquareType, PieceType, Color, HighlightMap, PieceVisualStatus, ChessMove } from '@/lib/chess/types';

interface BoardProps {
  board: ({ type: PieceType; color: Color } | null)[][];
  highlights: HighlightMap;
  pieceStatuses?: Map<SquareType, PieceVisualStatus>;
  lastMove?: ChessMove | null;
  onSquareClick: (square: SquareType) => void;
  isFlipped?: boolean;
  showCoordinates?: boolean;
  className?: string;
}

/**
 * Chess board component - 8x8 grid of squares
 */
export function Board({
  board,
  highlights,
  pieceStatuses,
  lastMove,
  onSquareClick,
  isFlipped = false,
  showCoordinates = true,
  className,
}: BoardProps) {
  // Generate squares in correct order based on board orientation
  const rows = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Ghost piece for the square the last move started from. ChessMove doesn't
  // carry the mover's color, so read it off the piece now on the destination.
  const ghostPiece = (() => {
    if (!lastMove) return null;
    const toCol = lastMove.to.charCodeAt(0) - 97;
    const toRank = parseInt(lastMove.to[1], 10);
    const movedPiece = board[8 - toRank]?.[toCol];
    return movedPiece ? { type: lastMove.piece, color: movedPiece.color } : null;
  })();

  return (
    <div
      className={cn(
        'aspect-square w-full h-full',
        'rounded-lg overflow-hidden shadow-lg',
'p-1 bg-neutral-800', // Dark border wrapper
        className
      )}
    >
      <div
        className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-sm overflow-hidden"
      >
      {rows.map((row) =>
        cols.map((col) => {
          const file = String.fromCharCode(97 + col); // a-h
          const rank = row + 1; // 1-8
          const square = `${file}${rank}` as SquareType;
          const piece = board[7 - row][col];
          const isLight = (row + col) % 2 === 0;
          const highlight = highlights.get(square) || 'none';

          const pieceStatus = pieceStatuses?.get(square);

          return (
            <Square
              key={square}
              square={square}
              piece={piece}
              isLight={isLight}
              highlight={highlight}
              pieceStatus={pieceStatus}
              ghostPiece={lastMove?.from === square ? ghostPiece : null}
              onClick={() => onSquareClick(square)}
              showCoordinates={showCoordinates}
              isFlipped={isFlipped}
            />
          );
        })
      )}
      </div>
    </div>
  );
}
