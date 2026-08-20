import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { ThemeProvider, useAppTheme } from '@/lib/theme-context';
import { saveSettings } from '@/lib/storage';

const Probe = () => {
  const { colorMode, resolvedTheme, setColorMode } = useAppTheme();
  return (
    <div>
      <span data-testid="mode">{colorMode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setColorMode('dark')}>go dark</button>
      <button onClick={() => setColorMode('light')}>go light</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('applies the theme class to the document root so portalled overlays inherit it', () => {
    saveSettings({ colorMode: 'dark' });
    renderProbe();

    // Radix renders dropdowns/dialogs/toasts into document.body, so the theme
    // must live on <html> rather than on a nested app div.
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes the dark class when switching to light mode', () => {
    saveSettings({ colorMode: 'dark' });
    renderProbe();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      screen.getByText('go light').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('persists the selected colour mode', () => {
    renderProbe();

    act(() => {
      screen.getByText('go dark').click();
    });

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(JSON.parse(localStorage.getItem('cuevora_settings') ?? '{}').colorMode).toBe('dark');
  });
});
