export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'dark' || value === 'system' || value === 'light' ? value : 'light';
}

export function resolveTheme(mode: ThemeMode, systemDark: boolean): ResolvedTheme {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}
