import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsScreen = readFileSync(new URL('../src/screens/SettingsScreen.tsx', import.meta.url), 'utf8');
const settingsDetail = readFileSync(new URL('../src/screens/SettingsDetailScreen.tsx', import.meta.url), 'utf8');

test('manual settings surfaces route writes through the canonical settings repository', () => {
  for (const [name, source] of [['SettingsScreen', settingsScreen], ['SettingsDetailScreen', settingsDetail]]) {
    assert.match(source, /from ['"]@\/src\/data\/settingsRepository['"]/u, `${name} debe importar el repositorio canónico de ajustes`);
    assert.doesNotMatch(source, /updateSettings,\s*useAtalStore\s*}\s*from ['"]@\/src\/data\/atalStore['"]/u, `${name} no debe escribir ajustes mediante atalStore directamente`);
    assert.match(source, /updateLocalSettings\(/u, `${name} debe delegar las escrituras manuales al repositorio canónico`);
  }
});
