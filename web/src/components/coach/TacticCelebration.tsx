'use client';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { TacticResult } from '@/lib/chess/types';
import { getTacticExplanation } from '@/lib/chess/tactics';
import { ReadAloud } from './ReadAloud';

/** Persistent, inline teaching: the board stays visible while play is held. */
export function TacticCelebration({tactic, onDismiss, playerName}: {
  tactic: TacticResult | null; onDismiss: () => void; playerName?: string;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!tactic || tactic.type === 'check') return;
    const previous = document.activeElement as HTMLElement | null;
    button.current?.focus({preventScroll:true});
    return () => previous?.focus({preventScroll:true});
  }, [tactic]);
  if (!tactic || tactic.type === 'check') return null;
  const title = tactic.type.replaceAll('_', ' ').toUpperCase();
  const explanation = getTacticExplanation(tactic.type);
  return <section aria-labelledby="tactic-title" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 space-y-3">
    <div role="status" aria-live="polite" aria-atomic="true">
      <h2 id="tactic-title" className="font-bold text-amber-900"><span aria-hidden="true">{tactic.celebrationEmoji} </span>{title}!</h2>
      <p>{playerName ? `${playerName}, ` : ''}{tactic.message}</p>
      <p className="text-sm mt-2">{explanation}</p>
    </div>
    <ReadAloud text={`${tactic.message} ${explanation}`} />
    <Button ref={button} className="w-full bg-amber-600 text-white hover:bg-amber-700" onClick={onDismiss}>
      {tactic.type === 'checkmate' ? 'Back to board' : 'Got it — keep playing!'}
    </Button>
  </section>;
}
