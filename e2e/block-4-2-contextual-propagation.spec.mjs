import { expect, test } from '@playwright/test';
import {
  commandFixture,
  CONVERSATIONS_KEY,
  createDraftResponse,
  createState,
  DRAFTS_KEY,
  mockAnalyze,
  STORE_KEY,
  THEME_KEY,
} from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';
const noteText = 'Nota contextual visible fuera del asistente.';
const notePrompt = 'Ayúdame a preparar una nota clínica breve para este paciente. La revisaré antes de aplicarla.';

async function seedPersistentBrowser(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(({ state, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(state));
    localStorage.setItem(keys.conversations, '[]');
    localStorage.setItem(keys.drafts, '[]');
    localStorage.setItem(keys.theme, 'light');
  }, {
    state: createState(),
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function openWorkspace(page) {
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  return page.getByRole('dialog', { name: 'Asistente en este paciente' });
}

async function applyContextualNote(page) {
  const workspace = await openWorkspace(page);
  const composer = workspace.getByLabel('Mensaje para Atal IA contextual');
  await composer.fill(notePrompt);
  await workspace.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(workspace.getByRole('button', { name: 'Aplicar cambios' })).toBeVisible();
  await workspace.getByRole('button', { name: 'Aplicar cambios' }).click();
  const dialog = page.getByRole('dialog', { name: 'Aplicar cambios' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(workspace.getByText('Cambios aplicados', { exact: true })).toBeVisible();
  return workspace;
}

test('contextual mutation is visible in normal patient UI and survives reload', async ({ page }) => {
  await seedPersistentBrowser(page);
  await mockAnalyze(page, createDraftResponse({
    intent: 'add_patient_note',
    responseMode: 'command',
    assistantMessage: 'Añadir una nota clínica demostrativa.',
    command: commandFixture('add_patient_note', {
      patientId: 'patient-e2e',
      content: noteText,
    }),
  }));

  await page.goto(patientPath);
  await expect(page.getByRole('heading', { name: 'Paciente E2E' })).toBeVisible();
  const workspace = await applyContextualNote(page);
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();
  await expect(workspace).toHaveCount(0);

  await page.getByRole('button', { name: 'Notas' }).click();
  await expect(page.getByRole('heading', { name: 'Notas clínicas' })).toBeVisible();
  await expect(page.getByText(noteText, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Paciente E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Notas' }).click();
  await expect(page.getByText(noteText, { exact: true })).toBeVisible();

  const storage = await page.evaluate(({ storeKey, conversationsKey }) => ({
    store: JSON.parse(localStorage.getItem(storeKey) ?? '{}'),
    conversations: JSON.parse(localStorage.getItem(conversationsKey) ?? '[]'),
  }), { storeKey: STORE_KEY, conversationsKey: CONVERSATIONS_KEY });
  expect(storage.store.notes.some((note) => note.patientId === 'patient-e2e' && note.content === noteText)).toBe(true);
  expect(storage.conversations.filter((conversation) => conversation.scope === 'global')).toHaveLength(0);
  expect(storage.conversations.filter((conversation) => conversation.scope === 'contextual')).toHaveLength(1);
});
