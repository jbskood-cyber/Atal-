import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storedTheme(): ThemeMode {
  const stored = localStorage.getItem('atal:theme');
  return stored === 'dark' || stored === 'system' ? stored : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(storedTheme);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem('atal:theme', mode);
  }, [mode, resolved]);

  useEffect(() => {
    const synchronize = (event: Event) => {
      const next = (event as CustomEvent<{ mode?: ThemeMode }>).detail?.mode;
      if (next === 'light' || next === 'dark' || next === 'system') setMode(next);
    };
    window.addEventListener('atal:theme-change', synchronize);
    return () => window.removeEventListener('atal:theme-change', synchronize);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme requires ThemeProvider');
  return value;
}
