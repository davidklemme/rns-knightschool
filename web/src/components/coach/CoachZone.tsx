'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorLegend } from './ColorLegend';
import { cn } from '@/lib/utils';

interface CoachZoneProps {
  playerName: string | null;
  message: string | null;
  isCompact?: boolean;
  isSimpleMode?: boolean;
}

/**
 * CoachZone - The always-visible teaching panel
 *
 * This is where the Coach lives! Never a popup, always present.
 * Shows:
 * - Color legend (what the colors mean)
 * - Current coaching message
 * - Encouragement for the player
 */
export function CoachZone({
  playerName,
  message,
  isCompact,
  isSimpleMode,
}: CoachZoneProps) {
  const greeting = playerName ? `${playerName}'s` : 'Your';

  // Default encouraging message when no specific hint
  const defaultMessage = playerName
    ? `You're doing great, ${playerName}! Tap a piece to see where it can go.`
    : "Let's play chess! Tap a piece to see your moves.";

  return (
    <Card
      className={cn(
        'h-full flex flex-col bg-white/80 backdrop-blur-sm',
        isCompact && 'p-0'
      )}
    >
      <CardHeader className={cn('pb-2', isCompact && 'p-3 pb-1')}>
        <CardTitle
          className={cn(
            'flex items-center gap-2',
            isCompact ? 'text-base' : 'text-lg'
          )}
        >
          <span className="text-2xl" role="img" aria-label="Coach">
            &#9816;
          </span>
          <span className="text-gray-700">{greeting} Coach</span>
        </CardTitle>
      </CardHeader>

      <CardContent
        className={cn(
          'flex-1 flex flex-col gap-4',
          isCompact && 'p-3 pt-1 gap-2'
        )}
      >
        {/* Color Legend - Always visible */}
        <div>
          <h3
            className={cn(
              'font-medium text-gray-600 mb-2',
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            What the colors mean:
          </h3>
          <ColorLegend isCompact={isCompact} isSimple={isSimpleMode} />
        </div>

        {/* Coach Message */}
        <div
          className={cn(
            'flex-1 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-3',
            isCompact && 'p-2'
          )}
        >
          <p
            className={cn(
              'text-gray-700 leading-relaxed',
              isCompact ? 'text-sm' : 'text-base'
            )}
          >
            {message || defaultMessage}
          </p>
        </div>

        {/* Hint for using the hint button */}
        <p
          className={cn(
            'text-muted-foreground text-center',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          Stuck? Tap the lightbulb for help!
        </p>
      </CardContent>
    </Card>
  );
}
