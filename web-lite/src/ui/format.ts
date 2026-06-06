import { PHASE_LABELS, type BreathingMode, type PhaseState } from '../breathing/types.ts';

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function renderTopStatus(
  state: PhaseState | null,
  mode: BreathingMode,
  countdown: number | null,
  isFinished: boolean,
): string {
  if (isFinished) {
    return '<div class="top-status top-status--done">Практика завершена</div>';
  }

  if (countdown !== null) {
    return `
      <div class="top-status top-status--phase">
        <span class="top-status__phase-timer">${countdown}</span>
        <span class="top-status__phase-name">Приготовьтесь</span>
      </div>
    `;
  }

  if (!state) {
    return '';
  }

  const roundLabel = mode === 'progressive' ? 'Прох' : 'Цикл';

  return `
    <div class="top-status">
      <div class="top-status__phase">
        <span class="top-status__phase-timer">${state.secondsLeft}</span>
        <span class="top-status__phase-name">${PHASE_LABELS[state.phase]}</span>
      </div>
      <div class="top-status__session">
        <span class="top-status__item top-status__time">${formatTime(state.totalSecondsLeft)}</span>
        <span class="top-status__item top-status__pct">${Math.round(state.progressPercent)}%</span>
        <span class="top-status__item">${roundLabel} ${state.cycle}/${state.totalCycles}</span>
        <span class="top-status__item">Ур. ${state.currentLevel}</span>
      </div>
    </div>
  `;
}
