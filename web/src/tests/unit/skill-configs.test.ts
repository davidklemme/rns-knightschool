import { describe, it, expect } from 'vitest';
import { SKILL_CONFIGS, type SkillLevel } from '@/lib/chess/types';

/**
 * User-centric invariants: picking a higher level must always mean a
 * tougher opponent. These guard the config against regressions like
 * "grandmaster blunders as often as learning mode".
 */
describe('Skill level configurations', () => {
  const order: SkillLevel[] = [
    'learning',
    'better',
    'challenge',
    'tough',
    'advanced',
    'strong',
    'expert',
    'master',
    'grandmaster',
  ];

  it('every level is strictly stronger (higher elo) than the previous one', () => {
    for (let i = 1; i < order.length; i++) {
      expect(SKILL_CONFIGS[order[i]].elo).toBeGreaterThan(SKILL_CONFIGS[order[i - 1]].elo);
    }
  });

  it('higher levels blunder less: mistake rate never increases with level', () => {
    for (let i = 1; i < order.length; i++) {
      expect(SKILL_CONFIGS[order[i]].aiMistakeRate).toBeLessThanOrEqual(
        SKILL_CONFIGS[order[i - 1]].aiMistakeRate
      );
    }
  });

  it('higher levels search deeper / think longer', () => {
    for (let i = 1; i < order.length; i++) {
      expect(SKILL_CONFIGS[order[i]].depth).toBeGreaterThanOrEqual(
        SKILL_CONFIGS[order[i - 1]].depth
      );
      expect(SKILL_CONFIGS[order[i]].moveTimeMs).toBeGreaterThanOrEqual(
        SKILL_CONFIGS[order[i - 1]].moveTimeMs
      );
    }
  });

  it('sub-1320 levels use increasing Stockfish skill (their strength mechanism)', () => {
    const weak = order.filter((l) => SKILL_CONFIGS[l].elo < 1320);
    for (let i = 1; i < weak.length; i++) {
      expect(SKILL_CONFIGS[weak[i]].stockfishSkillLevel).toBeGreaterThan(
        SKILL_CONFIGS[weak[i - 1]].stockfishSkillLevel
      );
    }
  });

  it('elo-limited levels (1320+) never make artificial random mistakes', () => {
    for (const level of order) {
      const config = SKILL_CONFIGS[level];
      if (config.elo >= 1320) {
        expect(config.aiMistakeRate).toBe(0);
      }
    }
  });

  it('elo values stay inside the range Stockfish UCI_Elo accepts (for 1320+)', () => {
    for (const level of order) {
      const config = SKILL_CONFIGS[level];
      if (config.elo >= 1320) {
        expect(config.elo).toBeLessThanOrEqual(3190);
      }
    }
  });
});
