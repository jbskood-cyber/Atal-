import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeMissingById } from '../src/data/demoSeed.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('demo seed is idempotent and never overwrites existing entities', () => {
  const existing = [{ id: 'patient-1', name: 'Dato del usuario' }];
  const seeded = [{ id: 'patient-1', name: 'Demo' }, { id: 'patient-2', name: 'Paciente demostrativo' }];
  const once = mergeMissingById(existing, seeded);
  const twice = mergeMissingById(once, seeded);

  assert.deepEqual(once, [existing[0], seeded[1]]);
  assert.deepEqual(twice, once);
  assert.equal(twice[0], existing[0]);
});

test('Atal Green and Atal Dark are the only selectable visual modes', () => {
  const themeMode = read('src/context/themeMode.ts');
  const settings = read('src/screens/SettingsDetailScreen.tsx');
  const css = read('src/styles/atal-rescue.css');

  assert.doesNotMatch(themeMode, /'blue'/i);
  assert.match(themeMode, /value === 'dark' \|\| value === 'system' \|\| value === 'light'/);
  assert.match(css, /--ui-primary:\s*#16a36a/i);
  assert.match(css, /html\[data-theme="dark"\]/i);
  assert.match(css, /--ui-primary:\s*#2abb7d/i);
  assert.match(css, /--status-danger|var\(--status-danger\)/i);
  assert.doesNotMatch(settings, /Blue Clinical|mode="blue"|Droplets/i);
  assert.match(settings, /Atal Green/);
  assert.match(settings, /Atal Dark/);
});

test('home uses real clinical resources without inventing agenda or appointments', () => {
  const home = read('src/screens/HomeScreen.tsx');
  assert.match(home, /Nuevo paciente/);
  assert.match(home, /Alertas recientes/);
  assert.match(home, /Reportes recientes/);
  assert.match(home, /Más opciones/);
  assert.match(home, /store\.notifications/);
  assert.match(home, /store\.sessions/);
  assert.match(home, /\/patients\/new/);
  assert.match(home, /\/activity\/\$\{session\.id\}/);
  assert.doesNotMatch(home, /agenda|citas?/i);
});

test('patients and profile remove redundant plan labels', () => {
  const patients = read('src/screens/PatientsScreen.tsx');
  const profile = read('src/screens/PatientProfileScreen.tsx');
  assert.doesNotMatch(patients, />Plan activo<|>Borrador</i);
  assert.match(patients, /Dolor alto/);
  assert.match(patients, /Por revisar/);
  assert.match(patients, /Sin plan/);
  assert.equal((profile.match(/Plan actual/g) ?? []).length, 1);
  assert.doesNotMatch(profile, />Plan activo</i);
  assert.match(profile, /Último reporte/);
  assert.match(profile, /Nota reciente/);
});

test('important mobile selectors use the controlled sheet instead of native select', () => {
  const exerciseSelector = read('src/components/atal/ExerciseSelector.tsx');
  const draftEditor = read('src/features/atal-ai/components/DraftSectionEditor.tsx');

  assert.doesNotMatch(exerciseSelector, /<select\b/);
  assert.doesNotMatch(draftEditor, /<select\b/);
  assert.match(exerciseSelector, /<AppSelect/);
  assert.match(draftEditor, /<AppSelect/);
});

test('Atal AI quick attachments expose only camera and photos', () => {
  const menu = read('src/features/atal-ai/components/AttachmentMenu.tsx');
  assert.match(menu, />Cámara</);
  assert.match(menu, />Fotos</);
  assert.doesNotMatch(menu, /PDF|Escanear documento|Archivos/);
});

test('redundant Atal fisioterapia heading copy is removed', () => {
  assert.doesNotMatch(read('src/components/atal/AtalLogo.tsx'), /Atal Fisioterapia/i);
  assert.doesNotMatch(read('src/screens/HomeScreen.tsx'), /Atal Fisioterapia/i);
  assert.doesNotMatch(read('src/features/clinical-record/ClinicalRecordScreen.tsx'), /Atal Fisioterapia/i);
});
