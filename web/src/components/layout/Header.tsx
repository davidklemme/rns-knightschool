'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RotateCcw, Settings } from 'lucide-react';
import type { SkillLevel, Color } from '@/lib/chess/types';
import { SKILL_CONFIGS } from '@/lib/chess/types';

interface HeaderProps {
  playerName: string | null;
  playerColor: Color;
  skillLevel: SkillLevel;
  isThinking: boolean;
  onNewGame: () => void;
  onChangeSkill?: (skill: SkillLevel) => void;
  className?: string;
}

/**
 * Game header with player info and controls
 */
export function Header({
  playerName,
  playerColor,
  skillLevel,
  isThinking,
  onNewGame,
  onChangeSkill,
  className,
}: HeaderProps) {
  const config = SKILL_CONFIGS[skillLevel];
  const colorEmoji = playerColor === 'w' ? '\u2654' : '\u265A'; // King pieces

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-4 py-2',
          'bg-white/60 rounded-lg backdrop-blur-sm',
          className
        )}
      >
        {/* Left: Logo and player info */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">&#9816;</span>
          <div>
            <h1 className="text-lg font-bold text-amber-800">KnightSchool</h1>
            <p className="text-sm text-gray-600">
              {playerName ? (
                <>
                  {playerName} {colorEmoji}
                </>
              ) : (
                <>Playing as {playerColor === 'w' ? 'White' : 'Black'} {colorEmoji}</>
              )}
            </p>
          </div>
        </div>

        {/* Center: Skill level badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              'bg-gradient-to-r from-amber-100 to-orange-100',
              'border border-amber-300 text-amber-800'
            )}
          >
            {config.label}
          </span>
          {isThinking && (
            <span className="text-sm text-gray-500 animate-pulse">
              AI thinking...
            </span>
          )}
        </div>

        {/* Right: New game button */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewGame}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">New Game</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start a new game</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
