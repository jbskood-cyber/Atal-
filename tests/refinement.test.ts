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

test('Pure Light and Pure Dark are neutral while Blue Clinical remains scoped', () => {
  const css = read('src/styles/native-clinical.css');
  const defaultTheme = css.match(/html:not\(\[data-theme="blue"\]\):not\(\[data-theme="dark"\]\)\s*\{([^}]+)\}/)?.[1] ?? '';
  const blueTheme = css.match(/html\[data-theme="blue"\]\s*\{([^}]+)\}/)?.[1] ?? '';
  const darkThemes = [...css.matchAll(/html\[data-theme="dark"\]\s*\{([^}]+)\}/g)].map((match) => match[1]).join('\n');

  assert.match(defaultTheme, /--ui-primary:\s*#18181b/i);
  assert.match(defaultTheme, /--green:\s*var\(--ui-primary\)/i);
  assert.doesNotMatch(defaultTheme, /#2563eb/i);
  assert.match(blueTheme, /--green:\s*#2563eb/i);
  assert.match(darkThemes, /--ui-primary:\s*#f4f4f5/i);
  assert.match(darkThemes, /--ui-canvas:\s*#0b0b0c/i);
  assert.match(css, /--status-success:\s*#168a5b/i);
  assert.match(css, /--status-danger:\s*#cf3448/i);
  assert.match(css, /--status-warning:\s*#e5a000/i);
  assert.match(css, /\.atal-logo__mark,.atal-logo__descriptor\s*\{\s*color:\s*var\(--brand-green\)/i);
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
