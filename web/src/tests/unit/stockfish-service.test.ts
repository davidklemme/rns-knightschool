import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStockfishService } from '@/lib/chess/stockfish-service';

const commands: string[] = [];
class FakeWorker {
  static instances: FakeWorker[] = [];
  static stallFirst = false;
  static failFirst = false;
  terminated = false;
  onerror: ((event: Event) => void) | null = null;
  constructor() {FakeWorker.instances.push(this);}
  onmessage: ((event: {data: string}) => void) | null = null;
  terminate() {this.terminated = true;}
  postMessage(command: string) {
    commands.push(command);
    queueMicrotask(() => {
      const send = (data: string) => this.onmessage?.({data});
      if (command === 'uci') {
        if (FakeWorker.failFirst && this === FakeWorker.instances[0]) this.onerror?.(new Event('error'));
        else send('uciok');
      }
      if (command === 'isready') send('readyok');
      if (command.startsWith('go ')) {
        if (FakeWorker.stallFirst && this === FakeWorker.instances[0]) return;
        send('info depth 12 score cp 20 pv e2e4 e7e5');
        send('bestmove e2e4');
      }
    });
  }
}
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
beforeEach(() => {
  commands.length = 0;
  FakeWorker.instances = [];
  FakeWorker.stallFirst = false;
  FakeWorker.failFirst = false;
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
});
afterEach(() => {vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe('Stockfish playing strength', () => {
  it('restores weak settings after full-strength evaluation and serializes searches', async () => {
    const engine = createStockfishService('learning');
    const evaluation = engine.getEvaluation(fen);
    const move = engine.getBestMove(fen);
    await vi.runAllTimersAsync();
    expect(await evaluation).toMatchObject({score:20});
    expect(await move).toBe('e2e4');
    expect(commands.filter(c => c.startsWith('setoption'))).toEqual([
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 20',
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 0',
    ]);
    expect(commands.filter(c => c.startsWith('go '))).toEqual(['go depth 12','go depth 2']);
    engine.terminate();
  });
  it('applies the new Elo and time budget after a mid-game difficulty change', async () => {
    const engine = createStockfishService('learning');
    await engine.setSkillLevel('grandmaster');
    const move = engine.getBestMove(fen);
    await vi.runAllTimersAsync();
    expect(await move).toBe('e2e4');
    expect(commands).toContain('setoption name UCI_LimitStrength value true');
    expect(commands).toContain('setoption name UCI_Elo value 2500');
    expect(commands).toContain('go movetime 2500');
    engine.terminate();
  });
});

describe('Stockfish recovery', () => {
  it('terminates an unresponsive worker before the next search; old replies are ignored', async () => {
    FakeWorker.stallFirst = true;
    const engine = createStockfishService('learning');
    const first = engine.getBestMove(fen);
    await vi.advanceTimersByTimeAsync(3000);
    const old = FakeWorker.instances[0];
    const oldHandler = old.onmessage!;
    await vi.advanceTimersByTimeAsync(15000);
    expect(await first).toBeNull();
    expect(old.terminated).toBe(true);
    expect(old.onmessage).toBeNull();
    const next = engine.getBestMove(fen);
    await vi.runAllTimersAsync();
    oldHandler({data:'bestmove a1a8'});
    expect(await next).toBe('e2e4');
    expect(FakeWorker.instances).toHaveLength(2);
    engine.terminate();
  });
  it('settles an active request when the service is terminated', async () => {
    FakeWorker.stallFirst = true;
    const engine = createStockfishService();
    const search = engine.getEvaluation(fen);
    await vi.advanceTimersByTimeAsync(1);
    engine.terminate();
    expect(await search).toBeNull();
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });
  it('falls back once after multi-thread startup fails, without reloading on every search', async () => {
    vi.stubGlobal('crossOriginIsolated', true);
    vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    FakeWorker.failFirst = true;
    const engine = createStockfishService('grandmaster');
    const first = engine.getBestMove(fen);
    await vi.runAllTimersAsync();
    expect(await first).toBe('e2e4');
    expect(FakeWorker.instances).toHaveLength(2);
    const second = engine.getBestMove(fen);
    await vi.runAllTimersAsync();
    expect(await second).toBe('e2e4');
    expect(FakeWorker.instances).toHaveLength(2);
    engine.terminate();
  });
});
