'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { RotateCcw, ChevronDown } from 'lucide-react';
import type { SkillLevel, Color } from '@/lib/chess/types';
import { SKILL_CONFIGS } from '@/lib/chess/types';

// Ordered list of skill levels for the dropdown
const SKILL_LEVELS: SkillLevel[] = [
  'learning',
  'better',
  'challenge',
  'tough',
  'advanced',
  'strong',
  'expert',
  'master',
  'grandmaster',
];

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

        {/* Center: Skill level selector */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  'bg-gradient-to-r from-amber-100 to-orange-100',
                  'border border-amber-300 text-amber-800',
                  'hover:from-amber-200 hover:to-orange-200',
                  'transition-colors cursor-pointer',
                  'flex items-center gap-1'
                )}
                disabled={isThinking}
              >
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.elo}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 bg-white border border-gray-200 shadow-lg">
              {SKILL_LEVELS.map((level) => {
                const levelConfig = SKILL_CONFIGS[level];
                return (
                  <DropdownMenuItem
                    key={level}
                    onClick={() => onChangeSkill?.(level)}
                    className={cn(
                      'flex justify-between cursor-pointer',
                      level === skillLevel && 'bg-amber-100'
                    )}
                  >
                    <span>{levelConfig.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {levelConfig.elo} ELO
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {isThinking && (
            <span className="hidden sm:inline text-sm text-gray-500 animate-pulse">
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
