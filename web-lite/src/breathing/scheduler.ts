import { buildSchedule, getTotalDuration, getTotalCycles } from './engine.ts';
import type {
  BreathingConfig,
  PhaseState,
  ScheduleEntry,
  SchedulerStatus,
} from './types.ts';

const COUNTDOWN_SECONDS = 3;

export interface SchedulerCallbacks {
  onTick: (state: PhaseState) => void;
  onCountdown: (secondsLeft: number) => void;
  onStatusChange: (status: SchedulerStatus) => void;
}

export class BreathingScheduler {
  private schedule: ScheduleEntry[] = [];
  private totalDuration = 0;
  private totalCycles = 0;
  private status: SchedulerStatus = 'idle';
  private rafId: number | null = null;
  private phaseStartTime = 0;
  private pausedElapsed = 0;
  private currentIndex = 0;
  private countdownStartTime = 0;

  constructor(private readonly callbacks: SchedulerCallbacks) {}

  start(config: BreathingConfig): void {
    this.stop();
    this.schedule = buildSchedule(config);
    this.totalDuration = getTotalDuration(this.schedule);
    this.totalCycles = getTotalCycles(this.schedule);

    if (this.schedule.length === 0) {
      return;
    }

    this.currentIndex = 0;
    this.pausedElapsed = 0;
    this.countdownStartTime = performance.now();
    this.setStatus('countdown');
    this.tick();
  }

  pause(): void {
    if (this.status !== 'running' && this.status !== 'countdown') {
      return;
    }
    this.pausedElapsed = this.getPhaseElapsed();
    this.cancelFrame();
    this.setStatus('paused');
  }

  resume(): void {
    if (this.status !== 'paused') {
      return;
    }
    this.phaseStartTime = performance.now() - this.pausedElapsed;
    this.setStatus('running');
    this.tick();
  }

  stop(): void {
    this.cancelFrame();
    this.schedule = [];
    this.currentIndex = 0;
    this.pausedElapsed = 0;
    this.setStatus('idle');
  }

  getStatus(): SchedulerStatus {
    return this.status;
  }

  private setStatus(status: SchedulerStatus): void {
    this.status = status;
    this.callbacks.onStatusChange(status);
  }

  private cancelFrame(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(): void {
    this.rafId = requestAnimationFrame(() => this.update());
  }

  private update(): void {
    if (this.status === 'countdown') {
      this.updateCountdown();
      return;
    }

    if (this.status !== 'running' || this.schedule.length === 0) {
      return;
    }

    const entry = this.schedule[this.currentIndex];
    const elapsed = this.getPhaseElapsed();
    const durationMs = entry.durationSec * 1000;

    if (elapsed >= durationMs) {
      this.currentIndex++;
      if (this.currentIndex >= this.schedule.length) {
        this.cancelFrame();
        this.setStatus('finished');
        return;
      }
      this.phaseStartTime = performance.now();
      this.pausedElapsed = 0;
    }

    this.callbacks.onTick(this.buildState());
    this.tick();
  }

  private updateCountdown(): void {
    const elapsed = performance.now() - this.countdownStartTime;
    const secondsLeft = Math.ceil(COUNTDOWN_SECONDS - elapsed / 1000);

    if (secondsLeft <= 0) {
      this.phaseStartTime = performance.now();
      this.pausedElapsed = 0;
      this.setStatus('running');
      this.callbacks.onTick(this.buildState());
      this.tick();
      return;
    }

    this.callbacks.onCountdown(secondsLeft);
    this.tick();
  }

  private getPhaseElapsed(): number {
    if (this.status === 'paused') {
      return this.pausedElapsed;
    }
    return performance.now() - this.phaseStartTime;
  }

  private buildState(): PhaseState {
    const entry = this.schedule[this.currentIndex];
    const elapsedSec = this.getPhaseElapsed() / 1000;
    const secondsLeft = Math.max(0, Math.ceil(entry.durationSec - elapsedSec));
    const phaseProgress = Math.min(1, elapsedSec / entry.durationSec);

    const completedDuration = this.schedule
      .slice(0, this.currentIndex)
      .reduce((sum, item) => sum + item.durationSec, 0);
    const currentElapsed = Math.min(elapsedSec, entry.durationSec);
    const totalElapsed = completedDuration + currentElapsed;
    const totalSecondsLeft = Math.max(0, Math.ceil(this.totalDuration - totalElapsed));
    const progressPercent =
      this.totalDuration > 0 ? Math.min(100, (totalElapsed / this.totalDuration) * 100) : 0;

    return {
      phase: entry.phase,
      secondsLeft,
      phaseDuration: entry.durationSec,
      phaseProgress,
      currentLevel: entry.level,
      cycle: entry.cycle,
      totalCycles: this.totalCycles,
      progressPercent,
      totalSecondsLeft,
      scheduleIndex: this.currentIndex,
      totalPhases: this.schedule.length,
    };
  }
}
