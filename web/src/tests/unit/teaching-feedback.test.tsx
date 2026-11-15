import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TacticCelebration } from '@/components/coach/TacticCelebration';
import { Board } from '@/components/chess/Board';
import { BOARD_COLORS } from '@/lib/colors/chess-colors';
import { createEngine } from '@/lib/chess/engine';
import { detectTactics } from '@/lib/chess/tactics';
import { useChessStore } from '@/store/chessStore';
import { setOpponentEngine, type OpponentEngine } from '@/lib/chess/opponent-engine';

const forkPosition = () => createEngine('q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1');
const fakeEngine: OpponentEngine = {
  init: async () => {}, setSkillLevel: async () => {},
  getBestMove: vi.fn(async () => 'e8d7'), getEvaluation: async () => null,
  terminate: () => {}, isReady: () => true,
};

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  useChessStore.getState().startNewGame('w', 'learning');
  setOpponentEngine(null);
});

describe('Child-paced tactical feedback', () => {
  it('uses standard chessboard colors with a light square on White’s right', () => {
    render(<Board board={createEngine().board()} highlights={new Map()} onSquareClick={() => {}} />);
    expect(screen.getByRole('button', {name:'White Rook on h1'}))
      .toHaveStyle({backgroundColor:BOARD_COLORS.light});
    expect(screen.getByRole('button', {name:'White Rook on a1'}))
      .toHaveStyle({backgroundColor:BOARD_COLORS.dark});
  });
  it('keeps the explanation until the child explicitly dismisses it', () => {
    vi.useFakeTimers();
    const engine = forkPosition();
    const tactic = detectTactics(engine, engine.move('b5', 'c7')!);
    const dismiss = vi.fn();
    render(<TacticCelebration tactic={tactic} onDismiss={dismiss} />);
    vi.advanceTimersByTime(60000);
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.getByRole('region', {name:'FORK!'})).toBeInTheDocument();
    const button = screen.getByRole('button', {name:/got it/i});
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('holds the board and congratulations until dismissal, then resumes AI', async () => {
    vi.useFakeTimers();
    setOpponentEngine(fakeEngine);
    useChessStore.getState().startNewGame('w', 'learning');
    useChessStore.setState({engine:forkPosition()});
    useChessStore.getState().makeMove('b5', 'c7');
    const message = useChessStore.getState().coachMessage;
    await vi.advanceTimersByTimeAsync(30000);
    expect(useChessStore.getState().coachMessage).toBe(message);
    expect(useChessStore.getState().engine.get('e8')?.type).toBe('k');
    useChessStore.getState().dismissTactic();
    await vi.advanceTimersByTimeAsync(1);
    expect(useChessStore.getState().engine.get('d7')?.type).toBe('k');
    expect([...useChessStore.getState().highlights.values()]).not.toContain('tacticSource');
  });

  it('does not write an old AI move into a newly started game', async () => {
    let finish!: (move: string) => void;
    setOpponentEngine({...fakeEngine, getBestMove: () => new Promise(resolve => {finish = resolve;})});
    useChessStore.getState().startNewGame('w', 'learning');
    useChessStore.getState().engine.move('e2', 'e4');
    useChessStore.setState({coachMessage:'Look at your knight.'});
    const pending = useChessStore.getState().requestAIMove();
    expect(useChessStore.getState().coachMessage).toBe('Look at your knight.');
    useChessStore.getState().startNewGame('w', 'grandmaster');
    finish('e7e5');
    await pending;
    expect(useChessStore.getState().moveHistory).toEqual([]);
    expect(useChessStore.getState().lastMove).toBeNull();
  });

  it('refreshes piece warnings immediately when danger is toggled', () => {
    setOpponentEngine(fakeEngine);
    useChessStore.getState().startNewGame('w', 'learning');
    useChessStore.setState({engine:createEngine('4k3/8/8/8/r2Q4/8/8/4K3 w - - 0 1')});
    useChessStore.getState().updatePieceStatuses();
    expect(useChessStore.getState().pieceStatuses.get('d4')).toBe('hanging');
    useChessStore.getState().toggleDanger();
    expect(useChessStore.getState().pieceStatuses.size).toBe(0);
    useChessStore.getState().toggleDanger();
    expect(useChessStore.getState().pieceStatuses.get('d4')).toBe('hanging');
  });
});
