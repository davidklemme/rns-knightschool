import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {createEngine} from '@/lib/chess/engine';
import {detectPin, detectSkewer, detectDiscoveredAttack, getTacticExplanation} from '@/lib/chess/tactics';
import {getTeachingHint} from '@/lib/chess/hints';
import {analyzeMoveSafety} from '@/lib/chess/move-safety';
import {exchangeGain} from '@/lib/chess/exchange';
import {chooseTeachingMove} from '@/lib/chess/teaching-opponent';
import {useChessStore} from '@/store/chessStore';
import {setOpponentEngine, type OpponentEngine} from '@/lib/chess/opponent-engine';
import {Square} from '@/components/chess/Square';
import {ActionBar} from '@/components/controls/ActionBar';
import {CoachZone} from '@/components/coach/CoachZone';
const fake:OpponentEngine = {init:async()=>{},setSkillLevel:async()=>{},getBestMove:async()=>null,
  getEvaluation:async()=>null,terminate:()=>{},isReady:()=>true};
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();setOpponentEngine(fake);
  useChessStore.getState().startNewGame('w','learning');setOpponentEngine(null);vi.restoreAllMocks();});
describe('Accurate teaching',()=>{
  it('describes a defended pawn capture as a trade',()=>{
    const hint=getTeachingHint(createEngine('4k3/8/4p3/3p4/2P1P3/8/8/4K3 w - - 0 1'),'w')!;
    expect(hint.concept).toBe('goodTrade');expect(hint.message).toContain('capture back');
  });
  it('distinguishes a genuinely equal exchange',()=>{
    const hint=getTeachingHint(createEngine('4k3/8/4p3/3p4/2P5/8/8/4K3 w - - 0 1'),'w')!;
    expect(hint.concept).toBe('equalTrade');
  });
  it('acknowledges a forced risky block instead of promising safety',()=>{
    const hint=getTeachingHint(createEngine('k7/8/8/8/8/8/5QPP/r6K w - - 0 1'),'w')!;
    expect(hint.message).toContain('tricky');expect(hint.message).not.toContain('safe');
  });
  it('does not call a fair defended exchange hanging',()=>{
    const e=createEngine('4k3/4p3/3n4/8/1B6/8/8/7K w - - 0 1');
    expect(exchangeGain(e,'d6')).toBe(0);
  });
  it('does not invent a pin through another blocker',()=>{
    const e=createEngine('k7/8/p7/8/n7/8/1R6/7K w - - 0 1');
    expect(detectPin(e,e.move('b2','a2')!)).toBeNull();
  });
  it.each([
    ['q7/8/8/k7/8/8/1R5K/8 w - - 0 1',['a5','a8']],
    ['r3k3/8/8/q7/8/8/1R5K/8 w - - 0 1',['a5','a8']],
  ])('finds separated king/queen skewers: %s',(fen,targets)=>{
    const e=createEngine(fen);expect(detectSkewer(e,e.move('b2','a2')!)?.targets).toEqual(targets);
  });
  it('stops a skewer at a friendly blocker',()=>{
    const e=createEngine('q7/8/P7/k7/8/8/1R5K/8 w - - 0 1');
    expect(detectSkewer(e,e.move('b2','a2')!)).toBeNull();
  });
  it('finds a relative pin to a queen',()=>{
    const e=createEngine('q3k3/8/8/8/n7/8/1R5K/8 w - - 0 1');
    expect(detectPin(e,e.move('b2','a2')!)?.targets).toEqual(['a4','a8']);
  });
  it('identifies a newly uncovered attack',()=>{
    const before=createEngine('r3k3/8/8/8/8/8/N6K/R7 w - - 0 1');const after=before.clone();
    expect(detectDiscoveredAttack(after,after.move('a2','b4')!,before)?.targets).toEqual(['a1','a8']);
  });
  it('excludes a pinned pawn from legal recaptures',()=>{
    const e=createEngine('3k4/8/3p4/2p5/1B6/8/7K/3R4 w - - 0 1');
    expect(analyzeMoveSafety(e,'b4','c5','w').materialRisk).toBe(0);
  });
  it('does not rely on a pinned rook to recapture',()=>{
    const e=createEngine('k3r3/8/2p5/3pR3/8/2N5/8/4K3 w - - 0 1');
    expect(analyzeMoveSafety(e,'c3','d5','w').materialRisk).toBe(3);
  });
  it('recognizes an en passant reply as a capture of the pushed pawn',()=>{
    const e=createEngine('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1');
    expect(analyzeMoveSafety(e,'e2','e4','w').materialRisk).toBe(1);
  });
  it('includes the promotion choice in safety analysis',()=>{
    const e=createEngine('7k/P7/8/8/8/8/8/7K w - - 0 1');
    expect(analyzeMoveSafety(e,'a7','a8','w','n').materialRisk).toBe(0);
    expect(analyzeMoveSafety(e,'a7','a8','w').materialRisk).toBe(Infinity);
  });
  it('offers a legal small-piece learning opportunity',()=>{
    const fen='4k3/8/8/3p4/8/4P3/8/4K3 w - - 0 1';const uci=chooseTeachingMove(fen);
    expect(uci).not.toBeNull();const e=createEngine(fen);
    expect(e.move(uci!.slice(0,2) as 'e3',uci!.slice(2,4) as 'e4')).not.toBeNull();
    expect(exchangeGain(e,uci!.slice(2,4) as 'e4')).toBe(1);
  });
  it('avoids guaranteed fork winnings and explains all ways to answer check',()=>{
    expect(getTacticExplanation('fork')).not.toContain('only save one');
    expect(getTacticExplanation('check')).toContain('capturing');
  });
});
describe('Recoverable game state',()=>{
  it.each([null,'a1a8'])('never replaces a failed move with random play (%s)',async(move)=>{
    setOpponentEngine({...fake,getBestMove:async()=>move});useChessStore.getState().startNewGame('w','grandmaster');
    useChessStore.getState().engine.move('e2','e4');const fen=useChessStore.getState().engine.fen;
    await useChessStore.getState().requestAIMove();
    expect(useChessStore.getState().engine.fen).toBe(fen);expect(useChessStore.getState().aiError).toBe(true);
    expect(useChessStore.getState().isThinking).toBe(false);
  });
  it('clears thinking after rejection and retries successfully',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    let failed=true;setOpponentEngine({...fake,getBestMove:async()=>{if(failed)throw Error('worker failed');return 'e7e5';}});
    useChessStore.getState().startNewGame('w','learning');useChessStore.getState().engine.move('e2','e4');
    await useChessStore.getState().requestAIMove();expect(useChessStore.getState().isThinking).toBe(false);
    expect(useChessStore.getState().aiError).toBe(true);failed=false;await useChessStore.getState().requestAIMove();
    expect(useChessStore.getState().engine.get('e5')?.color).toBe('b');expect(useChessStore.getState().aiError).toBe(false);
  });
  it('ignores an old position evaluation after a reset',async()=>{
    vi.useFakeTimers();
    let finish!: (score:{score:number;mate:null;depth:number})=>void;
    setOpponentEngine({...fake,getEvaluation:()=>new Promise(resolve=>{finish=resolve;})});
    useChessStore.getState().startNewGame('w','learning');useChessStore.setState({showEval:true});
    const pending=useChessStore.getState().updateEvaluation();
    useChessStore.getState().startNewGame('w','learning');
    finish({score:900,mate:null,depth:15});await pending;
    expect(useChessStore.getState().evaluation).toBeNull();
    useChessStore.setState({showEval:false});
  });
  it('keeps helper preferences at stronger difficulty',()=>{
    setOpponentEngine(fake);useChessStore.getState().startNewGame('w','learning');useChessStore.getState().setSkillLevel('grandmaster');
    expect(useChessStore.getState().showLegalMoves).toBe(true);expect(useChessStore.getState().showDanger).toBe(true);
  });
  it('records finishing the game and allows undo afterwards',()=>{
    vi.useFakeTimers();setOpponentEngine(fake);useChessStore.getState().startNewGame('w','learning');
    useChessStore.getState().makeMove('e2','e4');useChessStore.getState().resignGame();
    expect(useChessStore.getState().gameOutcome).toBe('resignation');useChessStore.getState().undoMove();
    expect(useChessStore.getState().isGameOver).toBe(false);expect(useChessStore.getState().engine.get('e2')?.type).toBe('p');
    expect(useChessStore.getState().moveHistory).toHaveLength(0);
  });
  it('allows undo from checkmate',()=>{
    setOpponentEngine(fake);useChessStore.getState().startNewGame('w','learning');const e=createEngine();
    for(const san of ['f3','e5','g4','Qh4#'])e.moveSan(san);
    useChessStore.setState({engine:e,moveHistory:e.historyVerbose(),historyIndex:3,isGameOver:true,gameOutcome:'checkmate'});
    useChessStore.getState().undoMove();expect(useChessStore.getState().isGameOver).toBe(false);expect(e.isCheckmate).toBe(false);
  });
});
describe('Accessible teaching',()=>{
  it('marks occupied abandonment captures and names the warning',()=>{
    render(<Square square="d5" piece={{type:'p',color:'b'}} isLight highlight="leavesHanging" onClick={()=>{}} />);
    const square=screen.getByRole('button',{name:/Black Pawn on d5, move exposes another piece/});
    expect(square.querySelector('.ring-orange-500')).not.toBeNull();expect(square.textContent).toContain('!');
  });
  it('announces messages and shows thinking separately',()=>{
    render(<CoachZone playerName="Ruby" message="Look at the knight" isThinking />);
    expect(screen.getByText('Look at the knight')).toHaveAttribute('aria-live','polite');
    expect(screen.getByText('Computer is thinking…')).toBeInTheDocument();
  });
  it('names compact controls and enables Undo after game over',()=>{
    const undo=vi.fn();render(<ActionBar onUndo={undo} onHint={()=>{}} onResign={()=>{}} onNewGame={()=>{}}
      onToggleLegalMoves={()=>{}} onToggleDanger={()=>{}} onToggleEval={()=>{}} onReview={()=>{}}
      showLegalMoves showDanger showEval={false} canUndo canReview isThinking={false} isGameOver isCompact />);
    fireEvent.click(screen.getByRole('button',{name:'Undo'}));expect(undo).toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Moves'})).toHaveAttribute('aria-pressed','true');
  });
});
