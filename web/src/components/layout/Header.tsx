'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RotateCcw, ChevronDown } from 'lucide-react';
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

const SKILL_LEVELS: SkillLevel[] = ['learning', 'better', 'challenge', 'tough', 'advanced', 'expert', 'master', 'grandmaster'];

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
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSkillMenu(false);
      }
    }
    if (showSkillMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSkillMenu]);

  const handleSkillSelect = (skill: SkillLevel) => {
    if (onChangeSkill) {
      onChangeSkill(skill);
    }
    setShowSkillMenu(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2',
          'bg-white/60 rounded-lg backdrop-blur-sm',
          className
        )}
      >
        {/* Left: Logo and player info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl">&#9816;</span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-amber-800 truncate">KnightSchool</h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
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

        {/* Center: Skill level badge - now visible on mobile */}
        <div className="relative flex items-center gap-1 sm:gap-2" ref={menuRef}>
          <button
            onClick={() => onChangeSkill && setShowSkillMenu(!showSkillMenu)}
            disabled={!onChangeSkill}
            className={cn(
              'flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium',
              'bg-gradient-to-r from-amber-100 to-orange-100',
              'border border-amber-300 text-amber-800',
              onChangeSkill && 'hover:from-amber-200 hover:to-orange-200 cursor-pointer active:scale-95 transition-all',
              !onChangeSkill && 'cursor-default'
            )}
          >
            <span className="truncate max-w-[60px] sm:max-w-none">
              {config.label}
              <span className="hidden md:inline"> ({config.elo})</span>
            </span>
            {onChangeSkill && <ChevronDown className="h-3 w-3 flex-shrink-0" />}
          </button>

          {/* Skill level dropdown menu */}
          {showSkillMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] md:min-w-[180px]">
              {SKILL_LEVELS.map((level) => {
                const levelConfig = SKILL_CONFIGS[level];
                return (
                  <button
                    key={level}
                    onClick={() => handleSkillSelect(level)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors',
                      level === skillLevel && 'bg-amber-100 font-medium'
                    )}
                  >
                    {levelConfig.label}
                    <span className="hidden md:inline text-gray-500"> ({levelConfig.elo})</span>
                  </button>
                );
              })}
            </div>
          )}

          {isThinking && (
            <span className="hidden sm:inline text-sm text-gray-500 animate-pulse">
              AI thinking...
            </span>
          )}
        </div>

        {/* Right: New game button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewGame}
                className="gap-1 px-2 sm:px-3"
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
