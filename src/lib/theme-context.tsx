import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '@/lib/storage';
import type { ColorMode } from '@/types/script';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  colorMode: ColorMode;
  resolvedTheme: ResolvedTheme;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function resolve(mode: ColorMode): ResolvedTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return prefersDark() ? 'dark' : 'light';
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => getSettings().colorMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(getSettings().colorMode));

  // Keep in sync with settings written from anywhere in the app.
  useEffect(() => {
    const syncFromSettings = () => {
      const mode = getSettings().colorMode;
      setColorModeState(mode);
      setResolvedTheme(resolve(mode));
    };
    window.addEventListener('cuevora-settings-changed', syncFromSettings);
    return () => window.removeEventListener('cuevora-settings-changed', syncFromSettings);
  }, []);

  // Follow the OS preference while in "system" mode.
  useEffect(() => {
    if (colorMode !== 'system') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setResolvedTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [colorMode]);

  // Apply the theme at the document root so <body> and every portalled
  // overlay (dropdowns, dialogs, toasts) inherit the correct CSS variables.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    saveSettings({ colorMode: mode });
    setColorModeState(mode);
    setResolvedTheme(resolve(mode));
  }, []);

  const value = useMemo(
    () => ({ colorMode, resolvedTheme, setColorMode }),
    [colorMode, resolvedTheme, setColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
