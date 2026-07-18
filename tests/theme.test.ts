import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeThemeMode, resolveTheme } from '../src/context/themeMode.ts';

test('supports Blue Clinical without changing system theme semantics', () => {
  assert.equal(resolveTheme('blue', true), 'blue');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('rejects stale or unknown stored theme values', () => {
  assert.equal(normalizeThemeMode('blue'), 'blue');
  assert.equal(normalizeThemeMode('sepia'), 'light');
  assert.equal(normalizeThemeMode(null), 'light');
});
