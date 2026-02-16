export interface Script {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  /** Markers: line indices that are section breaks */
  markers: number[];
  /** Highlighted line indices */
  highlights: number[];
}

export interface ScriptRevision {
  id: string;
  scriptId: string;
  content: string;
  timestamp: number;
}

export interface AppSettings {
  defaultTheme: PlayerTheme;
  defaultSpeed: number;
  defaultFontSize: number;
  defaultLineSpacing: number;
  wpm: number;
  keepScreenAwake: boolean;
  analyticsOptIn: boolean;
  onboardingComplete: boolean;
  mirrorMode: boolean;
  countdownDuration: 3 | 5 | 10;
  focusLineEnabled: boolean;
}

export type PlayerTheme = 'dark' | 'light' | 'studio' | 'high-contrast';

export const PLAYER_THEMES: Record<PlayerTheme, { bg: string; fg: string; label: string }> = {
  dark: { bg: '#0a0a0a', fg: '#f0f0f0', label: 'Dark' },
  light: { bg: '#fafafa', fg: '#1a1a1a', label: 'Light' },
  studio: { bg: '#1a1a2e', fg: '#00d4aa', label: 'Studio' },
  'high-contrast': { bg: '#000000', fg: '#ffffff', label: 'High Contrast' },
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTheme: 'dark',
  defaultSpeed: 3,
  defaultFontSize: 32,
  defaultLineSpacing: 1.6,
  wpm: 140,
  keepScreenAwake: true,
  analyticsOptIn: false,
  onboardingComplete: false,
  mirrorMode: false,
  countdownDuration: 3,
  focusLineEnabled: true,
};
