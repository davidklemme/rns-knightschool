'use client';

import { cn } from '@/lib/utils';
import {
  CHESS_COLOR_LEGEND,
  CHESS_COLOR_LEGEND_SIMPLE,
} from '@/lib/colors/chess-colors';

interface ColorLegendProps {
  isCompact?: boolean;
  isSimple?: boolean;
}

/**
 * Color legend showing what each highlight color means
 */
export function ColorLegend({ isCompact, isSimple }: ColorLegendProps) {
  const legend = isSimple ? CHESS_COLOR_LEGEND_SIMPLE : CHESS_COLOR_LEGEND;

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        isCompact && 'gap-1'
      )}
    >
      {legend.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full',
            'bg-white/60 border border-gray-200',
            isCompact && 'px-1.5 py-0.5'
          )}
        >
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              item.color,
              isCompact && 'w-2.5 h-2.5'
            )}
          />
          <span
            className={cn(
              'text-gray-700 font-medium',
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
