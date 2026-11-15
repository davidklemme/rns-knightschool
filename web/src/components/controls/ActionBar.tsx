'use client';
import { Button } from '@/components/ui/button';
import { Undo2, Lightbulb, Flag, RotateCcw, Eye, AlertTriangle, BarChart3, Microscope } from 'lucide-react';
interface ActionBarProps {
  onUndo:()=>void; onHint:()=>void; onResign:()=>void; onNewGame:()=>void;
  onToggleLegalMoves:()=>void; onToggleDanger:()=>void; onToggleEval:()=>void; onReview:()=>void;
  onRetry?:()=>void; aiError?:boolean;
  showLegalMoves:boolean; showDanger:boolean; showEval:boolean; canUndo:boolean;
  canReview:boolean; isThinking:boolean; isGameOver:boolean; isCompact?:boolean;
}
export function ActionBar(p:ActionBarProps) {
  const controls = [
    {label:'Undo', icon:Undo2, click:p.onUndo, disabled:!p.canUndo || p.isThinking},
    {label:'Hint', icon:Lightbulb, click:p.onHint, disabled:p.isThinking || p.isGameOver},
    {label:'Moves', icon:Eye, click:p.onToggleLegalMoves, pressed:p.showLegalMoves},
    {label:'Danger', icon:AlertTriangle, click:p.onToggleDanger, pressed:p.showDanger},
    {label:p.isGameOver ? 'New game' : 'Finish game', icon:p.isGameOver ? RotateCcw : Flag,
      click:p.isGameOver ? p.onNewGame : p.onResign, disabled:p.isThinking},
  ];
  return <div className="flex flex-wrap items-center justify-center gap-2">
    {p.aiError && <Button onClick={p.onRetry} disabled={p.isThinking}>Retry computer</Button>}
    {controls.map(c => <Button key={c.label} variant={c.pressed ? 'default' : 'outline'}
      aria-label={c.label} title={c.label} aria-pressed={c.pressed} disabled={c.disabled} onClick={c.click}
      className={c.pressed ? 'bg-amber-700 text-white hover:bg-amber-800 gap-1' : 'gap-1'}>
      <c.icon aria-hidden="true" className="h-4 w-4" />
      <span className={p.isCompact ? 'sr-only' : ''}>{c.label}</span>
    </Button>)}
    <details className="rounded-md border bg-white/60 p-1">
      <summary className="min-h-11 flex items-center cursor-pointer px-2 text-sm">Advanced / grown-ups</summary>
      <div className="flex flex-wrap gap-2 p-1">
        <Button variant="outline" aria-pressed={p.showEval} onClick={p.onToggleEval} className="gap-1">
          <BarChart3 aria-hidden="true" className="h-4 w-4" />Evaluation
        </Button>
        <Button variant="outline" onClick={p.onReview} disabled={!p.canReview || p.isThinking} className="gap-1">
          <Microscope aria-hidden="true" className="h-4 w-4" />Review
        </Button>
      </div>
    </details>
  </div>;
}
