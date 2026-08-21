'use client';

import { useEffect, useMemo, useState } from 'react';
import { createEngine } from '@/lib/chess/engine';
import { Board } from '@/components/chess/Board';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import type { GameAnalysis, AnalyzedMove, MoveClassification } from '@/lib/analysis/game-analysis';
import type { PositionAnalysis } from '@/lib/chess/opponent-engine';
import type { Color, HighlightMap, Square } from '@/lib/chess/types';

interface GameReviewProps {
  analysis: GameAnalysis | null;
  isAnalyzing: boolean;
  progress: { done: number; total: number } | null;
  playerColor: Color;
  onClose: () => void;
}

const BADGES: Record<
  MoveClassification,
  { symbol: string; label: string; chipClass: string; textClass: string } | null
> = {
  best: {
    symbol: '★',
    label: 'Best move',
    chipClass: 'bg-green-100 border-green-400',
    textClass: 'text-green-700',
  },
  good: null, // unremarkable moves stay unmarked
  inaccuracy: {
    symbol: '?!',
    label: 'Inaccuracy',
    chipClass: 'bg-yellow-100 border-yellow-400',
    textClass: 'text-yellow-700',
  },
  mistake: {
    symbol: '?',
    label: 'Mistake',
    chipClass: 'bg-orange-100 border-orange-400',
    textClass: 'text-orange-700',
  },
  blunder: {
    symbol: '??',
    label: 'Blunder',
    chipClass: 'bg-red-100 border-red-400',
    textClass: 'text-red-700',
  },
};

const formatEval = (evaluation: PositionAnalysis): string => {
  if (evaluation.mate !== null) {
    return evaluation.mate === 0 ? '#' : `#${evaluation.mate}`;
  }
  const pawns = evaluation.score / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(1)}`;
};

const summaryLine = (counts: GameAnalysis['counts'][Color]): string => {
  const parts = [
    counts.blunder > 0 && `${counts.blunder} blunder${counts.blunder > 1 ? 's' : ''}`,
    counts.mistake > 0 && `${counts.mistake} mistake${counts.mistake > 1 ? 's' : ''}`,
    counts.inaccuracy > 0 &&
      `${counts.inaccuracy} inaccurac${counts.inaccuracy > 1 ? 'ies' : 'y'}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'no serious errors';
};

/** First move worth the player's attention: their worst moment in the game. */
const initialIndex = (analysis: GameAnalysis, playerColor: Color): number => {
  const priorities: MoveClassification[] = ['blunder', 'mistake', 'inaccuracy'];
  for (const c of priorities) {
    const found = analysis.moves.find(
      (m) => m.color === playerColor && m.classification === c
    );
    if (found) return found.index;
  }
  return 0;
};

/**
 * GameReview - full-screen post-game analysis overlay
 *
 * Steps through the game move by move: the board replays the position,
 * flagged moves get a classification badge, a concrete explanation of what
 * went wrong, and a "show best" toggle that rewinds one step and highlights
 * what the engine wanted to play instead.
 */
export function GameReview({
  analysis,
  isAnalyzing,
  progress,
  playerColor,
  onClose,
}: GameReviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(() =>
    analysis ? initialIndex(analysis, playerColor) : 0
  );
  const [showBest, setShowBest] = useState(false);

  // The overlay opens while analysis is still running - once results land,
  // jump to the player's worst moment
  useEffect(() => {
    if (analysis) {
      setSelectedIndex(initialIndex(analysis, playerColor));
      setShowBest(false);
    }
  }, [analysis, playerColor]);

  const moves = useMemo(() => analysis?.moves ?? [], [analysis]);
  const current: AnalyzedMove | null = moves[selectedIndex] ?? null;

  // Replay the game up to the selected move (or to just before it, when
  // previewing the engine's suggestion)
  const position = useMemo(() => {
    const engine = createEngine();
    const upTo = showBest ? selectedIndex - 1 : selectedIndex;
    for (let i = 0; i <= upTo && i < moves.length; i++) {
      const m = moves[i].move;
      engine.move(m.from, m.to, m.promotion);
    }
    return engine;
  }, [moves, selectedIndex, showBest]);

  const highlights = useMemo(() => {
    const map: HighlightMap = new Map();
    if (!current) return map;

    if (showBest && current.bestMoveUci) {
      map.set(current.bestMoveUci.slice(0, 2) as Square, 'hint');
      map.set(current.bestMoveUci.slice(2, 4) as Square, 'hint');
    } else if (!showBest) {
      map.set(current.move.from, 'lastMoveFrom');
      map.set(current.move.to, 'lastMoveTo');
    }
    return map;
  }, [current, showBest]);

  const goTo = (index: number) => {
    setSelectedIndex(Math.max(0, Math.min(moves.length - 1, index)));
    setShowBest(false);
  };

  // Arrow keys step through the game
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(selectedIndex - 1);
      else if (e.key === 'ArrowRight') goTo(selectedIndex + 1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, moves.length, onClose]);

  const badge = current ? BADGES[current.classification] : null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-3 sm:p-4 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-900">
            Game Review
          </h2>
          {!isAnalyzing && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close review">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {isAnalyzing ? (
          /* Progress state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
            <div className="text-lg font-medium text-amber-900">
              Analyzing your game...
            </div>
            <div className="w-64 h-3 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{
                  width: progress
                    ? `${Math.round((progress.done / progress.total) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            {progress && (
              <div className="text-sm text-amber-700">
                Position {progress.done} of {progress.total}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : !analysis || !current ? (
          <div className="flex-1 flex items-center justify-center text-amber-800">
            Nothing to review yet.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="text-sm text-amber-800 mb-3 shrink-0">
              <span className="font-semibold">You:</span>{' '}
              {summaryLine(analysis.counts[playerColor])}
              <span className="mx-2 text-amber-500">|</span>
              <span className="font-semibold">Computer:</span>{' '}
              {summaryLine(analysis.counts[playerColor === 'w' ? 'b' : 'w'])}
            </div>

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
              {/* Board + navigation */}
              <div className="lg:flex-1 flex flex-col items-center gap-2">
                <div className="w-full max-w-[min(90vw,45vh,420px)] lg:max-w-[440px]">
                  <Board
                    board={position.board()}
                    highlights={highlights}
                    lastMove={showBest ? null : current.move}
                    onSquareClick={() => {}}
                    isFlipped={playerColor === 'b'}
                    showCoordinates={true}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goTo(selectedIndex - 1)}
                    disabled={selectedIndex === 0}
                    aria-label="Previous move"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-amber-900 w-24 text-center">
                    Move {Math.floor(selectedIndex / 2) + 1}
                    {current.color === 'w' ? '' : '...'} {current.move.san}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goTo(selectedIndex + 1)}
                    disabled={selectedIndex >= moves.length - 1}
                    aria-label="Next move"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Explanation + move list */}
              <div className="lg:w-80 xl:w-96 flex flex-col gap-3 min-h-0">
                {/* Current move card */}
                <div
                  className={cn(
                    'rounded-lg border-2 p-3 bg-white/70 shrink-0',
                    badge?.chipClass ?? 'border-amber-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-neutral-800">
                      {current.move.san}
                      {badge && (
                        <span className={cn('ml-2', badge.textClass)}>
                          {badge.symbol} {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-500 whitespace-nowrap">
                      {formatEval(current.evalBefore)} →{' '}
                      {formatEval(current.evalAfter)}
                    </div>
                  </div>

                  {current.explanation && (
                    <p className="mt-2 text-sm text-neutral-700">
                      {current.explanation}
                    </p>
                  )}

                  {current.bestMoveSan &&
                    current.classification !== 'best' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => setShowBest((v) => !v)}
                      >
                        <Eye className="h-4 w-4" />
                        {showBest
                          ? 'Show played move'
                          : `Show best: ${current.bestMoveSan}`}
                      </Button>
                    )}
                </div>

                {/* Move list */}
                <div className="rounded-lg bg-white/70 border border-amber-200 p-2 overflow-y-auto flex-1 min-h-[8rem] max-h-64 lg:max-h-none">
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 text-sm">
                    {Array.from(
                      { length: Math.ceil(moves.length / 2) },
                      (_, moveNum) => {
                        const white = moves[moveNum * 2];
                        const black = moves[moveNum * 2 + 1];
                        return (
                          <div key={moveNum} className="contents">
                            <span className="text-neutral-400 py-0.5">
                              {moveNum + 1}.
                            </span>
                            {[white, black].map((m, side) =>
                              m ? (
                                <button
                                  key={side}
                                  onClick={() => goTo(m.index)}
                                  className={cn(
                                    'text-left px-1.5 py-0.5 rounded font-medium text-neutral-700',
                                    'hover:bg-amber-100',
                                    m.index === selectedIndex &&
                                      'bg-amber-200 ring-1 ring-amber-400',
                                    BADGES[m.classification]?.textClass
                                  )}
                                >
                                  {m.move.san}
                                  {BADGES[m.classification] &&
                                    m.classification !== 'best' && (
                                      <span className="ml-0.5">
                                        {BADGES[m.classification]!.symbol}
                                      </span>
                                    )}
                                </button>
                              ) : (
                                <span key={side} />
                              )
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
