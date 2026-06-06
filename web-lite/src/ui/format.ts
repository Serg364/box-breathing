import { PHASE_LABELS, type BreathingMode, type PhaseState } from '../breathing/types.ts';

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function renderTopStatus(
  state: PhaseState | null,
  _mode: BreathingMode,
  countdown: number | null,
  isFinished: boolean,
): string {
  if (isFinished) {
    return '<div class="top-status top-status--done">Practice complete</div>';
  }

  if (countdown !== null) {
    return `
      <div class="top-status top-status--inline">
        <span class="top-status__phase-timer">${countdown}</span>
        <span class="top-status__phase-name">Get ready</span>
      </div>
    `;
  }

  if (!state) {
    return '';
  }

  return `
    <div class="top-status top-status--inline">
      <span class="top-status__phase-timer">${state.secondsLeft}</span>
      <span class="top-status__phase-name">${PHASE_LABELS[state.phase]}</span>
      <span class="top-status__item top-status__time">${formatTime(state.totalSecondsLeft)}</span>
      <span class="top-status__item top-status__pct">${Math.round(state.progressPercent)}%</span>
    </div>
  `;
}
