'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GameShellProps {
  header: ReactNode;
  board: ReactNode;
  coach: ReactNode;
  controls: ReactNode;
  className?: string;
}

/**
 * GameShell - Main layout container for RnS KnightSchool
 *
 * Three responsive layouts:
 * 1. Portrait Mobile: Vertical stack, board capped at 45vh, controls at bottom
 * 2. Landscape Mobile: Board left (height-based), coach+controls right
 * 3. Desktop (lg+): Board left, coach right, controls at bottom
 */
export function GameShell({
  header,
  board,
  coach,
  controls,
  className,
}: GameShellProps) {
  return (
    <div
      className={cn(
        'h-[100dvh] bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 overflow-hidden',
        className
      )}
    >
      <div className="h-full max-w-6xl mx-auto p-2 sm:p-4 flex flex-col">
        {/* Header - Hidden on landscape mobile to save space */}
        <header className="shrink-0 mb-1 sm:mb-2 landscape:hidden lg:landscape:block">
          {header}
        </header>

        {/* Main Content - Different layouts per orientation */}
        <main className="flex-1 flex flex-col landscape:flex-row lg:flex-row gap-2 sm:gap-4 min-h-0 overflow-scroll md:overflow-hidden">

          {/* Board Container */}
          <div className={cn(
            'flex items-center justify-center shrink-0',
            // Landscape: flexible, fill height
            'landscape:flex-1 landscape:h-full',
            // Desktop: flexible
            'lg:flex-1'
          )}>
            <div className={cn(
              'aspect-square w-full',
              // Portrait: limit size to leave room below
              'max-h-[45vh] max-w-[45vh]',
              // Landscape mobile: fill available height
              'landscape:max-h-full landscape:max-w-full landscape:w-auto landscape:h-full',
              // Desktop: capped size
              'lg:max-h-[min(100%,500px)] lg:max-w-[min(100%,500px)]'
            )}>
              {board}
            </div>
          </div>

          {/* Sidebar - Coach only on portrait/desktop, coach+controls on landscape mobile */}
          <aside className={cn(
            'flex flex-col gap-2 overflow-y-auto',
            // Portrait: coach only, controls go to footer
            'shrink-0',
            // Landscape mobile: sidebar with coach + controls
            'landscape:w-52 landscape:sm:w-64 landscape:shrink-0',
            // Desktop: just coach, wider
            'lg:w-72 xl:w-80'
          )}>
            {/* Coach Zone */}
            <div className="shrink-0">{coach}</div>

            {/* Controls in sidebar - ONLY on landscape mobile */}
            <div className="hidden landscape:block lg:landscape:hidden shrink-0 mt-auto">
              {controls}
            </div>
          </aside>
        </main>

        {/* Footer Controls - Portrait mobile and all desktop */}
        <footer className={cn(
          'shrink-0 mt-2 sm:mt-3 pb-1',
          // Hide on landscape mobile (controls are in sidebar)
          'landscape:hidden lg:landscape:block'
        )}>
          {controls}
        </footer>
      </div>
    </div>
  );
}
