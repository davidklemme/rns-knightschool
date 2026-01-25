'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Undo2,
  Lightbulb,
  Flag,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

interface ActionBarProps {
  onUndo: () => void;
  onHint: () => void;
  onResign: () => void;
  onNewGame: () => void;
  onToggleLegalMoves: () => void;
  onToggleDanger: () => void;
  showLegalMoves: boolean;
  showDanger: boolean;
  canUndo: boolean;
  isThinking: boolean;
  isGameOver: boolean;
  isCompact?: boolean;
}

/**
 * ActionBar - Game control buttons
 */
export function ActionBar({
  onUndo,
  onHint,
  onResign,
  onNewGame,
  onToggleLegalMoves,
  onToggleDanger,
  showLegalMoves,
  showDanger,
  canUndo,
  isThinking,
  isGameOver,
  isCompact,
}: ActionBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center justify-center gap-2 flex-wrap',
          isCompact && 'gap-1'
        )}
      >
        {/* Undo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={isCompact ? 'sm' : 'default'}
              onClick={onUndo}
              disabled={!canUndo || isThinking || isGameOver}
              className="gap-1"
            >
              <Undo2 className="h-4 w-4" />
              {!isCompact && <span>Undo</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Take back your last move</TooltipContent>
        </Tooltip>

        {/* Hint */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={isCompact ? 'sm' : 'default'}
              onClick={onHint}
              disabled={isThinking || isGameOver}
              className="gap-1 bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
            >
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              {!isCompact && <span>Hint</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Get a helpful hint</TooltipContent>
        </Tooltip>

        {/* Toggle Legal Moves */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showLegalMoves ? 'default' : 'outline'}
              size={isCompact ? 'sm' : 'default'}
              onClick={onToggleLegalMoves}
              className={cn(
                'gap-1',
                showLegalMoves &&
                  'bg-green-500 hover:bg-green-600 text-white border-green-600'
              )}
            >
              {showLegalMoves ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {!isCompact && <span>Moves</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showLegalMoves ? 'Hide legal moves' : 'Show legal moves'}
          </TooltipContent>
        </Tooltip>

        {/* Toggle Danger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showDanger ? 'default' : 'outline'}
              size={isCompact ? 'sm' : 'default'}
              onClick={onToggleDanger}
              className={cn(
                'gap-1',
                showDanger &&
                  'bg-red-500 hover:bg-red-600 text-white border-red-600'
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              {!isCompact && <span>Danger</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showDanger ? 'Hide danger warnings' : 'Show danger warnings'}
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* New Game / Resign */}
        {isGameOver ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size={isCompact ? 'sm' : 'default'}
                onClick={onNewGame}
                className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <RotateCcw className="h-4 w-4" />
                {!isCompact && <span>New Game</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start a new game</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={isCompact ? 'sm' : 'default'}
                onClick={onResign}
                disabled={isThinking}
                className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Flag className="h-4 w-4" />
                {!isCompact && <span>Resign</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Give up this game</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
