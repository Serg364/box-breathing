import { getProgressiveLevels } from '../breathing/engine.ts';
import type { BreathingConfig, BreathingMode, PhaseState, PhaseType } from '../breathing/types.ts';

const SIDE_PHASES: Record<string, PhaseType> = {
  top: 'inhale',
  right: 'hold_in',
  bottom: 'exhale',
  left: 'hold_out',
};

const PHASE_ORDER: PhaseType[] = ['inhale', 'hold_in', 'exhale', 'hold_out'];

type SideTrailState = 'idle' | 'done' | 'filling';

function getSideTrailState(
  side: string,
  activePhase: PhaseType | null,
  progress: number,
): { state: SideTrailState; fillPct: number } {
  if (!activePhase) {
    return { state: 'idle', fillPct: 0 };
  }

  const sidePhase = SIDE_PHASES[side];
  const activeIndex = PHASE_ORDER.indexOf(activePhase);
  const sideIndex = PHASE_ORDER.indexOf(sidePhase);

  if (sideIndex < activeIndex) {
    return { state: 'done', fillPct: 100 };
  }

  if (sideIndex === activeIndex) {
    return { state: 'filling', fillPct: Math.round(Math.min(1, Math.max(0, progress)) * 100) };
  }

  return { state: 'idle', fillPct: 0 };
}

function buildSideClasses(
  prefix: 'square-side' | 'ring-side',
  side: string,
  activePhase: PhaseType | null,
  progress: number,
  isPreview = false,
): string {
  const { state } = getSideTrailState(side, activePhase, progress);
  let classes = `${prefix} ${prefix}--${side}`;

  if (isPreview) {
    classes += ` ${prefix}--preview`;
  } else if (state === 'done') {
    classes += ` ${prefix}--done`;
  } else if (state === 'filling') {
    classes += ` ${prefix}--filling`;
  }

  return classes;
}

function buildSideStyle(activePhase: PhaseType | null, progress: number, side: string): string {
  const { fillPct } = getSideTrailState(side, activePhase, progress);
  return `--side-fill: ${fillPct}%`;
}

export interface BreathingVisualOptions {
  mode: BreathingMode;
  config: BreathingConfig;
  state: PhaseState | null;
  countdown: number | null;
}

export function renderBreathingVisual(options: BreathingVisualOptions): string {
  if (options.mode === 'progressive') {
    return renderProgressiveSpiral(options);
  }
  return renderFixedSquare(options);
}

function renderFixedSquare(options: BreathingVisualOptions): string {
  const { state, countdown, config } = options;
  const isIdle = !state && countdown === null;

  return `
    <div class="anim-frame">
      ${buildAnimatedSquare({
        level: state?.currentLevel ?? config.duration,
        activePhase: state?.phase ?? null,
        progress: state?.phaseProgress ?? 0,
        countdown,
        isIdle,
        sizeClass: 'square--main',
        showLabels: false,
      })}
    </div>
  `;
}

function renderProgressiveSpiral(options: BreathingVisualOptions): string {
  const { config, state, countdown } = options;
  const levels = getProgressiveLevels(config.duration, config.endValue, config.step);
  const isIdle = !state && countdown === null;
  const isCountdown = countdown !== null;
  const activeLevel = state?.currentLevel ?? config.duration;

  if (levels.length === 0) {
    return '<p class="status-line">Invalid progression settings</p>';
  }

  const count = levels.length;
  const rings = levels.map((level, index) => {
    const sizePct = count === 1 ? 72 : 24 + (index / (count - 1)) * 66;
    const status = getLevelStatus(level, activeLevel, isIdle, isCountdown);
    return { level, index, sizePct, status };
  });

  const ringsHtml = [...rings]
    .reverse()
    .map(({ level, sizePct, status }) => {
      const isCurrent = status === 'active';
      const sides =
        isCurrent && state?.phase
          ? buildRingSides(state.phase, state.phaseProgress)
          : '';
      const indicator =
        isCurrent && state?.phase
          ? `<div class="ring-indicator" style="${getIndicatorStyle(state.phase, state.phaseProgress)}"></div>`
          : '';

      return `
        <div
          class="spiral-ring spiral-ring--${status}${isCurrent ? ' spiral-ring--animated' : ''}"
          style="--ring-size: ${sizePct}%"
          data-level="${level}"
        >
          ${sides}
          ${indicator}
          <span class="spiral-ring__label">${level}</span>
        </div>
      `;
    })
    .join('');

  const centerContent = buildSpiralCenter(activeLevel, isIdle, state?.phase ?? null);

  return `
    <div class="anim-frame anim-frame--spiral">
      <div class="spiral-wrap">
        <div class="spiral-stack">
          ${ringsHtml}
          <div class="spiral-center">${centerContent}</div>
        </div>
      </div>
    </div>
  `;
}

function buildRingSides(activePhase: PhaseType, progress: number): string {
  return Object.keys(SIDE_PHASES)
    .map(
      (side) =>
        `<div class="${buildSideClasses('ring-side', side, activePhase, progress)}" style="${buildSideStyle(activePhase, progress, side)}"></div>`,
    )
    .join('');
}

function buildSpiralCenter(
  level: number,
  isIdle: boolean,
  activePhase: PhaseType | null,
): string {
  if (!isIdle && activePhase) {
    return `
      <span class="spiral-center__level">${level}</span>
      <span class="spiral-center__unit">sec</span>
    `;
  }
  return `
    <span class="spiral-center__level spiral-center__level--preview">${level}</span>
    <span class="spiral-center__unit">sec</span>
  `;
}

function getLevelStatus(
  level: number,
  activeLevel: number,
  isIdle: boolean,
  isCountdown: boolean,
): 'done' | 'active' | 'preview' | 'pending' {
  if (isIdle || isCountdown) {
    return level === activeLevel ? 'preview' : level < activeLevel ? 'done' : 'pending';
  }
  if (level < activeLevel) {
    return 'done';
  }
  if (level === activeLevel) {
    return 'active';
  }
  return 'pending';
}

interface AnimatedSquareOptions {
  level: number;
  activePhase: PhaseType | null;
  progress: number;
  countdown: number | null;
  isIdle: boolean;
  sizeClass: string;
  showLabels: boolean;
}

function buildAnimatedSquare(options: AnimatedSquareOptions): string {
  const { level, activePhase, progress, countdown, isIdle, sizeClass, showLabels } = options;

  const sides = Object.keys(SIDE_PHASES)
    .map((side) => {
      const isPreview = isIdle && side === 'top';
      const label = showLabels
        ? `<span class="square-side__label">${labelForSide(side)}</span>`
        : '';

      const classes = buildSideClasses(
        'square-side',
        side,
        isIdle ? null : activePhase,
        progress,
        isPreview,
      );

      const style =
        isIdle && !isPreview ? '' : ` style="${buildSideStyle(activePhase, progress, side)}"`;

      return `<div class="${classes}"${style}>
        ${label}
      </div>`;
    })
    .join('');

  const indicatorStyle = isIdle && countdown === null
    ? 'opacity: 0;'
    : getIndicatorStyle(activePhase, progress);

  let centerContent = '';
  if (!isIdle && activePhase) {
    centerContent = `<span class="square-center__level">${level}</span><span class="square-center__unit">sec</span>`;
  } else {
    centerContent = `<span class="square-center__level${isIdle ? ' square-center__level--preview' : ''}">${level}</span><span class="square-center__unit">sec</span>`;
  }

  return `
    <div class="square ${sizeClass}${isIdle ? ' square--idle' : ''}">
      ${sides}
      <div class="square-indicator" style="${indicatorStyle}"></div>
      <div class="square-center">${centerContent}</div>
    </div>
  `;
}

function labelForSide(side: string): string {
  switch (side) {
    case 'top':
      return 'Inhale';
    case 'right':
      return 'Hold';
    case 'bottom':
      return 'Exhale';
    case 'left':
      return 'Hold';
    default:
      return '';
  }
}

function getIndicatorStyle(phase: PhaseType | null, progress: number): string {
  if (!phase) {
    return 'opacity: 0;';
  }

  const p = Math.min(1, Math.max(0, progress));
  const offset = 6;

  switch (phase) {
    case 'inhale':
      return `left: calc(${p * 100}% - ${offset}px); top: -5px; opacity: 1;`;
    case 'hold_in':
      return `top: calc(${p * 100}% - ${offset}px); right: -5px; opacity: 1;`;
    case 'exhale':
      return `right: calc(${p * 100}% - ${offset}px); bottom: -5px; opacity: 1;`;
    case 'hold_out':
      return `bottom: calc(${p * 100}% - ${offset}px); left: -5px; opacity: 1;`;
    default:
      return 'opacity: 0;';
  }
}
