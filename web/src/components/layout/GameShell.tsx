'use client';
import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
/** Keep controls visible in every orientation and scroll rather than shrink targets. */
export function GameShell({header, board, coach, controls, className}: {
  header:ReactNode; board:ReactNode; coach:ReactNode; controls:ReactNode; className?:string;
}) {
  return <div className={cn('min-h-dvh bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100', className)}>
    <div className="max-w-6xl mx-auto p-2 sm:p-4 flex flex-col gap-3">
      <header className="sticky top-0 z-20 bg-amber-50 rounded-lg">{header}</header>
      <main className="flex flex-col landscape:flex-row lg:flex-row gap-3 items-start">
        <div className="w-full min-w-0 flex-1 overflow-x-auto pb-1" aria-label="Chessboard area">
          <div className="w-full max-w-[500px] landscape:max-lg:max-w-[clamp(360px,calc(100dvh_-_112px),500px)] min-w-[360px] mx-auto">{board}</div>
        </div>
        <aside className="w-full landscape:w-64 lg:w-80 shrink-0">{coach}</aside>
      </main>
      <footer>{controls}</footer>
    </div>
  </div>;
}
