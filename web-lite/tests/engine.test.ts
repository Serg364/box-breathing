import { describe, expect, it } from 'vitest';
import {
  buildSchedule,
  getProgressiveLevels,
  getTotalDuration,
  getTotalCycles,
} from '../src/breathing/engine.ts';
import type { BreathingConfig } from '../src/breathing/types.ts';

function baseConfig(overrides: Partial<BreathingConfig> = {}): BreathingConfig {
  return {
    mode: 'fixed',
    duration: 4,
    cycles: 3,
    endValue: 20,
    step: 1,
    ...overrides,
  };
}

describe('buildSchedule — fixed', () => {
  it('builds cycles with equal phase duration', () => {
    const schedule = buildSchedule(baseConfig({ cycles: 3 }));
    expect(schedule).toHaveLength(12);
    expect(schedule.every((e) => e.durationSec === 4)).toBe(true);
    expect(getTotalCycles(schedule)).toBe(3);
  });
});

describe('getProgressiveLevels', () => {
  it('returns all levels from start to end', () => {
    expect(getProgressiveLevels(4, 8, 1)).toEqual([4, 5, 6, 7, 8]);
    expect(getProgressiveLevels(4, 10, 2)).toEqual([4, 6, 8, 10]);
  });
});

describe('buildSchedule — progressive', () => {
  it('ascends from start to end within one pass', () => {
    const schedule = buildSchedule(
      baseConfig({
        mode: 'progressive',
        duration: 4,
        endValue: 6,
        step: 1,
        cycles: 1,
      }),
    );
    const levels = [...new Set(schedule.map((e) => e.level))];
    expect(levels).toEqual([4, 5, 6]);
    expect(getTotalCycles(schedule)).toBe(1);
  });

  it('repeats passes', () => {
    const schedule = buildSchedule(
      baseConfig({
        mode: 'progressive',
        duration: 4,
        endValue: 5,
        step: 1,
        cycles: 2,
      }),
    );
    expect(schedule.filter((e) => e.cycle === 1).length).toBeGreaterThan(0);
    expect(schedule.filter((e) => e.cycle === 2).length).toBeGreaterThan(0);
    expect(getTotalCycles(schedule)).toBe(2);
  });

  it('calculates total duration', () => {
    const schedule = buildSchedule(
      baseConfig({ mode: 'progressive', duration: 4, endValue: 5, step: 1, cycles: 1 }),
    );
    expect(getTotalDuration(schedule)).toBe(36);
  });
});
