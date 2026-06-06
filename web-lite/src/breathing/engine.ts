import type { BreathingConfig, ScheduleEntry } from './types.ts';

const PHASE_ORDER = ['inhale', 'hold_in', 'exhale', 'hold_out'] as const;

function pushCycle(schedule: ScheduleEntry[], level: number, cycle: number): void {
  for (const phase of PHASE_ORDER) {
    schedule.push({
      phase,
      durationSec: level,
      level,
      cycle,
    });
  }
}

function buildFixedSchedule(config: BreathingConfig): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];
  const { duration, cycles } = config;

  if (duration <= 0 || cycles <= 0) {
    return schedule;
  }

  for (let cycle = 1; cycle <= cycles; cycle++) {
    pushCycle(schedule, duration, cycle);
  }

  return schedule;
}

function buildProgressiveSchedule(config: BreathingConfig): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];
  const { duration: startValue, endValue, step, cycles: passes } = config;

  if (startValue <= 0 || endValue < startValue || step <= 0 || passes <= 0) {
    return schedule;
  }

  for (let pass = 1; pass <= passes; pass++) {
    let level = startValue;

    while (level <= endValue) {
      pushCycle(schedule, level, pass);
      level += step;
    }
  }

  return schedule;
}

export function buildSchedule(config: BreathingConfig): ScheduleEntry[] {
  if (config.mode === 'fixed') {
    return buildFixedSchedule(config);
  }
  return buildProgressiveSchedule(config);
}

export function getTotalDuration(schedule: ScheduleEntry[]): number {
  return schedule.reduce((sum, entry) => sum + entry.durationSec, 0);
}

export function getPracticeDurationSec(config: BreathingConfig): number {
  return getTotalDuration(buildSchedule(config));
}

export function getTotalCycles(schedule: ScheduleEntry[]): number {
  if (schedule.length === 0) {
    return 0;
  }
  return schedule[schedule.length - 1].cycle;
}

export function getProgressiveLevels(start: number, end: number, step: number): number[] {
  const levels: number[] = [];

  if (start <= 0 || end < start || step <= 0) {
    return levels;
  }

  for (let level = start; level <= end; level += step) {
    levels.push(level);
  }

  return levels;
}
