import { DEFAULT_CONFIG, type BreathingConfig } from '../breathing/types.ts';

const STORAGE_KEY = 'box-breathing-settings';

interface LegacySettings {
  inhale?: number;
  passes?: number;
  startValue?: number;
}

export function loadSettings(): BreathingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_CONFIG };
    }
    const parsed = JSON.parse(raw) as Partial<BreathingConfig> & LegacySettings;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveSettings(config: BreathingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
