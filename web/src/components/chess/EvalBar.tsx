'use client';

import { cn } from '@/lib/utils';

interface EvalBarProps {
  /** Evaluation in centipawns from white's perspective */
  score: number;
  /** Mate in X moves (positive = white mating) */
  mate: number | null;
  /** Whether the board is flipped (player is black) */
  isFlipped?: boolean;
  className?: string;
}

/**
 * Visual evaluation bar showing position advantage
 * White advantage fills from top, black from bottom
 */
export function EvalBar({ score, mate, isFlipped = false, className }: EvalBarProps) {
  // Convert score to percentage (0-100, where 50 is equal)
  // Use sigmoid-like function to cap extreme values
  const getWhitePercentage = (): number => {
    if (mate !== null) {
      // Mate: show as extreme advantage
      return mate > 0 ? 95 : 5;
    }

    // Clamp score to reasonable range (-1000 to 1000 centipawns)
    const clampedScore = Math.max(-1000, Math.min(1000, score));

    // Map to 5-95% range using sigmoid-like curve
    // score of 0 = 50%, +300cp = ~75%, +600cp = ~90%
    const normalized = clampedScore / 400; // ~2.5 pawns = strong advantage
    const percentage = 50 + (50 * Math.tanh(normalized));

    return Math.max(5, Math.min(95, percentage));
  };

  const whitePercent = getWhitePercentage();

  // Format display text
  const getDisplayText = (): string => {
    if (mate !== null) {
      return `M${Math.abs(mate)}`;
    }
    const pawns = Math.abs(score) / 100;
    if (pawns < 0.1) return '0.0';
    return pawns.toFixed(1);
  };

  const isWhiteWinning = mate !== null ? mate > 0 : score > 0;

  return (
    <div
      className={cn(
        'w-6 h-full rounded-sm overflow-hidden',
        'bg-neutral-800 relative',
        'flex flex-col',
        className
      )}
    >
      {/* Black section (top when not flipped) */}
      <div
        className="bg-neutral-700 transition-all duration-300"
        style={{ height: `${isFlipped ? whitePercent : 100 - whitePercent}%` }}
      />
      {/* White section (bottom when not flipped) */}
      <div
        className="bg-white transition-all duration-300 flex-1"
      />
      {/* Score display */}
      <div
        className={cn(
          'absolute inset-x-0 text-center text-xs font-bold',
          'drop-shadow-md',
          isWhiteWinning
            ? (isFlipped ? 'bottom-1 text-neutral-800' : 'bottom-1 text-neutral-800')
            : (isFlipped ? 'top-1 text-white' : 'top-1 text-white')
        )}
        style={{
          [isWhiteWinning ? 'bottom' : 'top']: '2px',
        }}
      >
        {getDisplayText()}
      </div>
    </div>
  );
}
