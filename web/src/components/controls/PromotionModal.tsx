'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Color } from '@/lib/chess/types';

interface PromotionModalProps {
  isOpen: boolean;
  color: Color;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

/**
 * PromotionModal - Choose piece when pawn reaches the end
 */
export function PromotionModal({
  isOpen,
  color,
  onSelect,
  onCancel,
}: PromotionModalProps) {
  if (!isOpen) return null;

  // Piece characters for white and black
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string; char: string }> = [
    { type: 'q', name: 'Queen', char: color === 'w' ? '\u2655' : '\u265B' },
    { type: 'r', name: 'Rook', char: color === 'w' ? '\u2656' : '\u265C' },
    { type: 'b', name: 'Bishop', char: color === 'w' ? '\u2657' : '\u265D' },
    { type: 'n', name: 'Knight', char: color === 'w' ? '\u2658' : '\u265E' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full"
        >
          {/* Title */}
          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
            Promotion!
          </h2>
          <p className="text-gray-600 text-center text-sm mb-4">
            Your pawn reached the end! Pick a new piece:
          </p>

          {/* Piece selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {pieces.map((piece) => (
              <Button
                key={piece.type}
                variant="outline"
                onClick={() => onSelect(piece.type)}
                className={cn(
                  'h-20 flex flex-col gap-1',
                  'hover:bg-amber-50 hover:border-amber-400',
                  'transition-all duration-200'
                )}
              >
                <span className="text-4xl">{piece.char}</span>
                <span className="text-xs text-gray-600">{piece.name}</span>
              </Button>
            ))}
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-gray-500"
          >
            Cancel
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
