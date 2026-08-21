'use client';

import { cn } from '@/lib/utils';
import type { PieceType, Color, ChessMove } from '@/lib/chess/types';
import { PIECE_VALUES } from '@/lib/chess/types';

interface CapturedPiecesProps {
  moveHistory: ChessMove[];
  playerColor: Color;
  className?: string;
}

/**
 * Display captured pieces for each side with material advantage
 */
export function CapturedPieces({
  moveHistory,
  playerColor,
  className,
}: CapturedPiecesProps) {
  // Calculate captured pieces
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];

  for (const move of moveHistory) {
    if (move.captured) {
      // If the move was by white, white captured a black piece
      if (moveHistory.indexOf(move) % 2 === 0) {
        // Even index = white's move
        capturedByWhite.push(move.captured);
      } else {
        capturedByBlack.push(move.captured);
      }
    }
  }

  // Calculate material advantage
  const whiteMaterial = capturedByWhite.reduce(
    (sum, p) => sum + PIECE_VALUES[p],
    0
  );
  const blackMaterial = capturedByBlack.reduce(
    (sum, p) => sum + PIECE_VALUES[p],
    0
  );
  const advantage = whiteMaterial - blackMaterial;

  // Get piece symbols
  const pieceSymbols: Record<PieceType, string> = {
    p: '\u265F',
    n: '\u265E',
    b: '\u265D',
    r: '\u265C',
    q: '\u265B',
    k: '\u265A',
  };

  // Sort pieces by value (descending)
  const sortByValue = (a: PieceType, b: PieceType) =>
    PIECE_VALUES[b] - PIECE_VALUES[a];

  const sortedWhiteCaptures = [...capturedByWhite].sort(sortByValue);
  const sortedBlackCaptures = [...capturedByBlack].sort(sortByValue);

  // Determine which side the player is on
  const playerCaptures =
    playerColor === 'w' ? sortedWhiteCaptures : sortedBlackCaptures;
  const opponentCaptures =
    playerColor === 'w' ? sortedBlackCaptures : sortedWhiteCaptures;
  const playerAdvantage = playerColor === 'w' ? advantage : -advantage;

  return (
    <div className={cn('flex flex-col gap-1 text-sm', className)}>
      {/* Opponent's captures (pieces you lost) */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs w-12">Lost:</span>
        <div className="flex gap-0.5">
          {opponentCaptures.length > 0 ? (
            opponentCaptures.map((piece, i) => (
              <span key={i} className="text-gray-700 text-lg">
                {pieceSymbols[piece]}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">None</span>
          )}
        </div>
      </div>

      {/* Your captures (pieces you took) */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs w-12">Took:</span>
        <div className="flex gap-0.5">
          {playerCaptures.length > 0 ? (
            playerCaptures.map((piece, i) => (
              <span key={i} className="text-gray-700 text-lg">
                {pieceSymbols[piece]}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">None</span>
          )}
        </div>

        {/* Material advantage indicator */}
        {playerAdvantage !== 0 && (
          <span
            className={cn(
              'ml-2 text-xs font-medium',
              playerAdvantage > 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {playerAdvantage > 0 ? '+' : ''}
            {playerAdvantage}
          </span>
        )}
      </div>
    </div>
  );
}
