import { BreathingAudio } from './audio/breathing-audio.ts';
import { BreathingScheduler } from './breathing/scheduler.ts';
import type { BreathingConfig, PhaseState } from './breathing/types.ts';
import { loadSettings, saveSettings } from './storage/settings.ts';
import { renderTopStatus } from './ui/format.ts';
import {
  bindSetupInteractions,
  readSetupForm,
  renderToolbar,
  updateDurationBadge,
} from './ui/setup.ts';
import { bindAnimationLayout, updateAnimationLayout } from './ui/layout.ts';
import { renderBreathingVisual } from './ui/square.ts';

type AppState = 'idle' | 'running' | 'finished';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) {
  throw new Error('App root not found');
}
const app: HTMLElement = appRoot;

let appState: AppState = 'idle';
let currentConfig = loadSettings();
let phaseState: PhaseState | null = null;
let countdown: number | null = null;

const breathingAudio = new BreathingAudio();
breathingAudio.setEnabled(currentConfig.soundEnabled);
breathingAudio.setStyle(currentConfig.soundStyle);

const scheduler = new BreathingScheduler({
  onTick: (state) => {
    phaseState = state;
    countdown = null;
    breathingAudio.onTick(state);
    updateStage();
  },
  onCountdown: (secondsLeft) => {
    countdown = secondsLeft;
    phaseState = null;
    breathingAudio.onCountdown(secondsLeft);
    updateStage();
  },
  onStatusChange: (status) => {
    breathingAudio.onStatusChange(status);

    if (status === 'finished') {
      appState = 'finished';
      phaseState = null;
      countdown = null;
      renderToolbarSection();
      updateStage();
    }
  },
});

function renderShell(): void {
  app.innerHTML = `
    <section class="app-layout">
      <header class="top-panel">
        <div id="toolbar-root"></div>
        <div id="status-root" class="top-panel__status"></div>
      </header>
      <main class="stage" id="square-root"></main>
    </section>
  `;
  renderToolbarSection();
  updateStage();
  bindAnimationLayout(app);
  updateAnimationLayout(app);
}

function renderToolbarSection(): void {
  const toolbarRoot = app.querySelector<HTMLElement>('#toolbar-root');
  if (!toolbarRoot) {
    return;
  }

  const isPaused = scheduler.getStatus() === 'paused';
  toolbarRoot.innerHTML = renderToolbar(currentConfig, appState, isPaused);
  bindForm();
  requestAnimationFrame(() => updateAnimationLayout(app));
}

function bindForm(): void {
  const toolbarRoot = app.querySelector<HTMLElement>('#toolbar-root');
  if (!toolbarRoot) {
    return;
  }

  bindSetupInteractions(toolbarRoot, {
    onChange: () => {
      const form = toolbarRoot.querySelector<HTMLFormElement>('#setup-form');
      if (!form) {
        return;
      }

      const updated = readSetupForm(form);
      const soundChanged =
        updated.soundEnabled !== currentConfig.soundEnabled ||
        updated.soundStyle !== currentConfig.soundStyle;

      if (soundChanged) {
        currentConfig = {
          ...currentConfig,
          soundEnabled: updated.soundEnabled,
          soundStyle: updated.soundStyle,
        };
        breathingAudio.setEnabled(updated.soundEnabled);
        breathingAudio.setStyle(updated.soundStyle);
        saveSettings(currentConfig);
      }

      if (appState === 'idle') {
        updateDurationBadge(toolbarRoot, updated);
        updateStage();
      }
    },
    onModeChange: (config) => {
      if (appState !== 'idle') {
        return;
      }
      currentConfig = config;
      saveSettings(currentConfig);
      renderToolbarSection();
      updateStage();
    },
  });

  const form = toolbarRoot.querySelector<HTMLFormElement>('#setup-form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (appState !== 'idle') {
      return;
    }
    currentConfig = readSetupForm(form);
    saveSettings(currentConfig);
    startPractice(currentConfig);
  });

  toolbarRoot.querySelector<HTMLButtonElement>('#btn-pause')?.addEventListener('click', () => {
    if (scheduler.getStatus() === 'paused') {
      scheduler.resume();
    } else {
      scheduler.pause();
    }
    renderToolbarSection();
    updateStage();
  });

  toolbarRoot.querySelector<HTMLButtonElement>('#btn-stop')?.addEventListener('click', () => {
    scheduler.stop();
    resetToIdle();
  });

  toolbarRoot.querySelector<HTMLButtonElement>('#btn-restart')?.addEventListener('click', () => {
    resetToIdle();
  });
}

function updateStage(): void {
  const form = app.querySelector<HTMLFormElement>('#setup-form');
  const squareRoot = app.querySelector<HTMLElement>('#square-root');
  const statusRoot = app.querySelector<HTMLElement>('#status-root');

  if (!squareRoot || !statusRoot) {
    return;
  }

  const visualConfig =
    appState === 'idle' && form ? readSetupForm(form) : currentConfig;

  squareRoot.innerHTML = renderBreathingVisual({
    mode: visualConfig.mode,
    config: visualConfig,
    state: phaseState,
    countdown,
  });

  statusRoot.innerHTML = renderTopStatus(
    phaseState,
    currentConfig.mode,
    countdown,
    appState === 'finished',
  );

  requestAnimationFrame(() => updateAnimationLayout(app));
}

function resetToIdle(): void {
  scheduler.stop();
  appState = 'idle';
  phaseState = null;
  countdown = null;
  renderToolbarSection();
  updateStage();
}

function startPractice(config: BreathingConfig): void {
  appState = 'running';
  phaseState = null;
  countdown = null;
  breathingAudio.setEnabled(config.soundEnabled);
  breathingAudio.setStyle(config.soundStyle);
  if (config.soundEnabled) {
    breathingAudio.initOnUserGesture();
  }
  renderToolbarSection();
  updateStage();
  scheduler.start(config);
}

renderShell();
