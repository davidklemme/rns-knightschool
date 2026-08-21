'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TacticResult } from '@/lib/chess/types';
import { getTacticExplanation } from '@/lib/chess/tactics';

interface TacticCelebrationProps {
  tactic: TacticResult | null;
  onDismiss: () => void;
  playerName?: string;
}

/**
 * TacticCelebration - Modal popup when player finds a tactic
 *
 * Makes kids feel like geniuses when they discover chess tactics!
 */
export function TacticCelebration({
  tactic,
  onDismiss,
  playerName,
}: TacticCelebrationProps) {
  // Generate confetti per celebration. Uses a deterministic scatter (a
  // pure function of the index) so rendering stays side-effect free.
  const confetti = useMemo(() => {
    if (!tactic || tactic.type === 'check') return [];

    const scatter = (i: number, salt: number): number => {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      style: {
        left: `${scatter(i, 1) * 100}%`,
        animationDelay: `${scatter(i, 2) * 0.5}s`,
        animationDuration: `${1 + scatter(i, 3)}s`,
        backgroundColor: [
          '#f59e0b', // amber
          '#f97316', // orange
          '#ef4444', // red
          '#22c55e', // green
          '#3b82f6', // blue
          '#a855f7', // purple
        ][Math.floor(scatter(i, 4) * 6)],
      } as React.CSSProperties,
    }));
  }, [tactic]);

  // Auto-dismiss after 4 seconds (except for checkmate)
  useEffect(() => {
    if (!tactic || tactic.type === 'check' || tactic.type === 'checkmate') return;

    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [tactic, onDismiss]);

  // Don't show for regular checks
  if (!tactic || tactic.type === 'check') return null;

  const tacticName = tactic.type.replace('_', ' ').toUpperCase();
  const explanation = getTacticExplanation(tactic.type);
  const isCheckmate = tactic.type === 'checkmate';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
        onClick={onDismiss}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-3 h-3 rounded-sm animate-confetti"
              style={piece.style}
            />
          ))}
        </div>

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center',
            'border-4',
            isCheckmate ? 'border-yellow-400' : 'border-amber-400'
          )}
        >
          {/* Emoji */}
          <div className="text-6xl mb-4">{tactic.celebrationEmoji}</div>

          {/* Title */}
          <h2
            className={cn(
              'text-2xl font-bold mb-2',
              isCheckmate
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'text-amber-600'
            )}
          >
            {tacticName}!
          </h2>

          {/* Message */}
          <p className="text-gray-700 text-lg mb-4">{tactic.message}</p>

          {/* Explanation */}
          <div className="bg-amber-50 rounded-lg p-3 mb-4">
            <p className="text-gray-600 text-sm">{explanation}</p>
          </div>

          {/* Player praise */}
          {playerName && (
            <p className="text-amber-600 font-medium mb-4">
              Great job, {playerName}!
            </p>
          )}

          {/* Dismiss button */}
          <Button
            onClick={onDismiss}
            className={cn(
              'w-full',
              isCheckmate
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
            )}
          >
            {isCheckmate ? 'Play Again!' : 'Awesome!'}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
