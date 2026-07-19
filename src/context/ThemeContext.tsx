import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeThemeMode, resolveTheme, type ResolvedTheme, type ThemeMode } from './themeMode';

export type { ThemeMode } from './themeMode';

const ThemeContext = createContext<{ mode: ThemeMode; resolved: ResolvedTheme; setMode: (mode: ThemeMode) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => normalizeThemeMode(localStorage.getItem('atal:theme')));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = resolveTheme(mode, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
    localStorage.setItem('atal:theme', mode);
  }, [mode, resolved]);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme requiere ThemeProvider');
  return value;
}
