export type BreathingMode = 'fixed' | 'progressive';
export type PhaseType = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';
export type SoundStyle = 'soft' | 'bowl' | 'wind';

export const SOUND_STYLE_LABELS: Record<SoundStyle, string> = {
  soft: 'Soft',
  bowl: 'Bowl',
  wind: 'Wind',
};

export interface BreathingConfig {
  mode: BreathingMode;
  duration: number;
  cycles: number;
  endValue: number;
  step: number;
  soundEnabled: boolean;
  soundStyle: SoundStyle;
}

export interface ScheduleEntry {
  phase: PhaseType;
  durationSec: number;
  level: number;
  cycle: number;
}

export interface PhaseState {
  phase: PhaseType;
  secondsLeft: number;
  phaseDuration: number;
  phaseProgress: number;
  currentLevel: number;
  cycle: number;
  totalCycles: number;
  progressPercent: number;
  totalSecondsLeft: number;
  scheduleIndex: number;
  totalPhases: number;
}

export type SchedulerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

export const PHASE_LABELS: Record<PhaseType, string> = {
  inhale: 'Inhale',
  hold_in: 'Hold',
  exhale: 'Exhale',
  hold_out: 'Hold',
};

export const DEFAULT_CONFIG: BreathingConfig = {
  mode: 'fixed',
  duration: 4,
  cycles: 3,
  endValue: 10,
  step: 1,
  soundEnabled: true,
  soundStyle: 'soft',
};
