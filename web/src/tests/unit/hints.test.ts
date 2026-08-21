import { describe, it, expect } from 'vitest';
import { createEngine } from '@/lib/chess/engine';
import { getTeachingHint } from '@/lib/chess/hints';
import { analyzeMoveSafety } from '@/lib/chess/move-safety';

/**
 * User-centric hint tests: each scenario is written from the player's
 * point of view - "when the board looks like X, the coach should tell me Y".
 */
describe('Teaching hints', () => {
  it('shows the winning move when the player can checkmate', () => {
    // Back-rank mate: Ra8# (black king boxed in by its own pawns)
    const engine = createEngine('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.concept).toBe('checkmate');
    expect(hint?.from).toBe('a1');
    expect(hint?.to).toBe('a8');
    // Second-level impact: the trapped king is highlighted
    expect(hint?.impactSquares).toContain('g8');
  });

  it('warns the player when their queen is hanging, before anything fancy', () => {
    // White queen on d4 is attacked by the d8 rook and has no defender
    const engine = createEngine('3rk3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.concept).toBe('rescue');
    expect(hint?.from).toBe('d4'); // move the queen itself to safety
    // Second-level impact: the endangered piece is highlighted
    expect(hint?.impactSquares).toContain('d4');
    expect(hint?.message.toLowerCase()).toContain('queen');
    expect(hint?.message.toLowerCase()).toContain('danger');
    // The suggested escape square must actually be safe
    const safety = analyzeMoveSafety(engine, hint!.from, hint!.to, 'w');
    expect(safety.materialRisk).toBe(0);
  });

  it('teaches the fork and highlights BOTH attacked pieces (second-level impact)', () => {
    // Nc7+ forks the king on e8 and the rook on a8
    const engine = createEngine('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1');
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.concept).toBe('fork');
    expect(hint?.from).toBe('d5');
    expect(hint?.to).toBe('c7');
    // The child should see what the fork hits, not just where to move
    expect(hint?.impactSquares).toContain('a8');
    expect(hint?.impactSquares).toContain('e8');
    expect(hint?.message).toContain('FORK');
  });

  it('points out a free piece and explains that nobody is protecting it', () => {
    // Black knight on a5 is undefended; the a1 rook can take it for free
    const engine = createEngine('4k3/8/8/n7/8/8/8/R3K3 w - - 0 1');
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.concept).toBe('freePiece');
    expect(hint?.to).toBe('a5');
    expect(hint?.impactSquares).toContain('a5');
    expect(hint?.message.toLowerCase()).toContain('knight');
  });

  it('never tells the player to make a losing capture', () => {
    // The d5 pawn is protected by the e6 pawn - Qxd5 would lose the queen
    // for a pawn. The old hint suggested "the first capture found".
    const engine = createEngine('4k3/8/4p3/3p4/8/3Q4/8/4K3 w - - 0 1');
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.to).not.toBe('d5');
    // Whatever it suggests must not lose material
    const safety = analyzeMoveSafety(engine, hint!.from, hint!.to, 'w');
    expect(safety.materialRisk).toBe(0);
  });

  it('falls back to a safe developing move when nothing special is on', () => {
    const engine = createEngine(); // starting position
    const hint = getTeachingHint(engine, 'w');

    expect(hint).not.toBeNull();
    expect(hint?.concept).toBe('develop');
    expect(hint?.message).toBeTruthy();
    const safety = analyzeMoveSafety(engine, hint!.from, hint!.to, 'w');
    expect(safety.materialRisk).toBe(0);
    expect(safety.leavesHanging).toHaveLength(0);
  });

  it('gives no hint when it is not the player turn', () => {
    const engine = createEngine(); // white to move
    expect(getTeachingHint(engine, 'b')).toBeNull();
  });
});
