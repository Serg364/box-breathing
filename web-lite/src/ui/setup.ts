import { getPracticeDurationSec } from '../breathing/engine.ts';
import type { BreathingConfig, BreathingMode, SoundStyle } from '../breathing/types.ts';
import { SOUND_STYLE_LABELS } from '../breathing/types.ts';

export type ToolbarAppState = 'idle' | 'running' | 'finished';

export function renderToolbar(
  config: BreathingConfig,
  appState: ToolbarAppState,
  isPaused: boolean,
): string {
  const isRunning = appState === 'running';
  const disabled = isRunning ? 'disabled' : '';
  const settingsHtml =
    config.mode === 'fixed'
      ? renderFixedSettings(config, disabled)
      : renderProgressiveSettings(config, disabled);

  return `
    <form class="toolbar" id="setup-form">
      <div class="toolbar__row toolbar__row--actions">
        ${renderActionButtons(appState, isPaused)}
      </div>

      <div class="toolbar__row toolbar__row--options">
        <div class="toolbar__modes">
          <label class="mode-tab">
            <input type="radio" name="mode" value="fixed" ${config.mode === 'fixed' ? 'checked' : ''} ${disabled} />
            <span>Fixed</span>
          </label>
          <label class="mode-tab">
            <input type="radio" name="mode" value="progressive" ${config.mode === 'progressive' ? 'checked' : ''} ${disabled} />
            <span>Prog.</span>
          </label>
        </div>

        <div class="toolbar__sound">
          <label class="sound-toggle">
            <input type="checkbox" name="soundEnabled" ${config.soundEnabled ? 'checked' : ''} />
            <span>Sound</span>
          </label>
          <select class="sound-style" name="soundStyle" aria-label="Sound style">
            ${renderSoundStyleOptions(config.soundStyle)}
          </select>
        </div>
      </div>

      <div class="toolbar__row toolbar__row--params">
        <div class="toolbar__params">
          <div class="toolbar__settings" id="settings-fields">
            ${settingsHtml}
          </div>
          <span class="toolbar__duration" id="duration-total">${formatPracticeDuration(config)}</span>
        </div>
      </div>
    </form>
  `;
}

function renderActionButtons(appState: ToolbarAppState, isPaused: boolean): string {
  if (appState === 'running') {
    return `
      <button type="button" class="btn btn--secondary btn--compact" id="btn-pause">
        ${isPaused ? 'Resume' : 'Pause'}
      </button>
      <button type="button" class="btn btn--danger btn--compact" id="btn-stop">Stop</button>
    `;
  }

  if (appState === 'finished') {
    return `<button type="button" class="btn btn--primary btn--compact" id="btn-restart">Again</button>`;
  }

  return `<button type="submit" class="btn btn--primary btn--compact" id="btn-start">Start</button>`;
}

export function formatPracticeDuration(config: BreathingConfig): string {
  const totalSec = getPracticeDurationSec(config);
  if (totalSec <= 0) {
    return '—';
  }

  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  if (minutes === 0) {
    return `${seconds} sec`;
  }
  if (seconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${seconds} sec`;
}

export function updateDurationBadge(root: HTMLElement, config: BreathingConfig): void {
  const badge = root.querySelector<HTMLElement>('#duration-total');
  if (badge) {
    badge.textContent = formatPracticeDuration(config);
  }
}

function renderSoundStyleOptions(selected: SoundStyle): string {
  return (Object.entries(SOUND_STYLE_LABELS) as Array<[SoundStyle, string]>)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`,
    )
    .join('');
}

function readSoundSettings(form: HTMLFormElement): Pick<BreathingConfig, 'soundEnabled' | 'soundStyle'> {
  const data = new FormData(form);
  const style = data.get('soundStyle');
  return {
    soundEnabled: data.get('soundEnabled') === 'on',
    soundStyle: isSoundStyle(style) ? style : 'soft',
  };
}

function isSoundStyle(value: FormDataEntryValue | null): value is SoundStyle {
  return value === 'soft' || value === 'bowl' || value === 'wind';
}

function renderFixedSettings(config: BreathingConfig, disabled: string): string {
  return `
    <label class="mini-field">
      <span>Sec</span>
      <input type="number" name="duration" min="1" max="60" value="${config.duration}" inputmode="numeric" ${disabled} />
    </label>
    <label class="mini-field">
      <span>Cycle</span>
      <input type="number" name="cycles" min="1" max="50" value="${config.cycles}" inputmode="numeric" ${disabled} />
    </label>
  `;
}

function renderProgressiveSettings(config: BreathingConfig, disabled: string): string {
  return `
    <label class="mini-field">
      <span>From</span>
      <input type="number" name="startValue" min="1" max="60" value="${config.duration}" inputmode="numeric" ${disabled} />
    </label>
    <label class="mini-field">
      <span>To</span>
      <input type="number" name="endValue" min="1" max="60" value="${config.endValue}" inputmode="numeric" ${disabled} />
    </label>
    <label class="mini-field">
      <span>Step</span>
      <input type="number" name="step" min="1" max="10" value="${config.step}" inputmode="numeric" ${disabled} />
    </label>
    <label class="mini-field">
      <span>Pass</span>
      <input type="number" name="passes" min="1" max="20" value="${config.cycles}" inputmode="numeric" ${disabled} />
    </label>
  `;
}

export function readSetupForm(form: HTMLFormElement): BreathingConfig {
  const mode = getSelectedMode(form);

  if (mode === 'progressive') {
    return readProgressiveFields(form);
  }

  return readFixedFields(form);
}

function readFixedFields(form: HTMLFormElement): BreathingConfig {
  const data = new FormData(form);
  return {
    mode: 'fixed',
    duration: clampNumber(data.get('duration'), 1, 60, 4),
    cycles: clampNumber(data.get('cycles'), 1, 50, 3),
    endValue: 10,
    step: 1,
    ...readSoundSettings(form),
  };
}

function readProgressiveFields(form: HTMLFormElement): BreathingConfig {
  const data = new FormData(form);
  return {
    mode: 'progressive',
    duration: clampNumber(data.get('startValue'), 1, 60, 4),
    endValue: clampNumber(data.get('endValue'), 1, 60, 10),
    step: clampNumber(data.get('step'), 1, 10, 1),
    cycles: clampNumber(data.get('passes'), 1, 20, 2),
    ...readSoundSettings(form),
  };
}

function getSelectedMode(form: HTMLFormElement): BreathingMode {
  const mode = new FormData(form).get('mode');
  return mode === 'progressive' ? 'progressive' : 'fixed';
}

function clampNumber(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function bindSetupInteractions(
  root: HTMLElement,
  handlers: {
    onChange: () => void;
    onModeChange: (config: BreathingConfig) => void;
  },
): void {
  const form = root.querySelector<HTMLFormElement>('#setup-form');
  if (!form) {
    return;
  }

  form.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) {
        return;
      }

      const updated = form.querySelector('[name="startValue"]')
        ? readProgressiveFields(form)
        : readFixedFields(form);
      updated.mode = radio.value as BreathingMode;
      handlers.onModeChange(updated);
    });
  });

  form.addEventListener('input', handlers.onChange);
  form.addEventListener('change', handlers.onChange);
}
