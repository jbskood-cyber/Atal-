import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
  readStore,
} from './fixtures.mjs';

const patientAPath = '/patients/patient-e2e';
const patientBPath = '/patients/patient-b-e2e';
const globalConversationId = 'global-live-context-isolation';
const noteA = 'Nota contextual IA A: tolerancia estable.';
const noteB = 'Nota contextual IA B: dolor lumbar al flexionar.';

function createTwoPatientState() {
  const state = createState();
  const sourcePatient = state.patients[0];
  const sourceRecord = state.clinicalRecords[0];
  const patientB = {
    ...structuredClone(sourcePatient),
    id: 'patient-b-e2e',
    name: 'Paciente B E2E',
    diagnosis: 'Dolor lumbar demostrativo',
    affectedArea: 'Zona lumbar',
    contact: { ...structuredClone(sourcePatient.contact), email: 'paciente-b@example.test' },
  };
  const recordB = {
    ...structuredClone(sourceRecord),
    id: 'record-b-e2e',
    patientId: patientB.id,
    planId: '',
    affectedArea: 'Zona lumbar',
    clinicalNotes: 'Expediente contextual B.',
  };
  return {
    ...state,
    patients: [...state.patients, patientB],
    clinicalRecords: [...state.clinicalRecords, recordB],
  };
}

async function seed(page) {
  const state = createTwoPatientState();
  const globalConversation = createConversation({
    id: globalConversationId,
    messages: [{
      id: 'global-sentinel-message',
      role: 'assistant',
      text: 'HISTORIAL GLOBAL AISLADO',
      createdAt: '2026-07-25T14:40:00.000Z',
      attachments: [],
    }],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify([conversationValue]));
    localStorage.setItem(keys.drafts, JSON.stringify([]));
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    conversationValue: globalConversation,
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
}

async function openPatientWorkspace(page, path, heading) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  const workspace = page.getByRole('dialog', { name: 'Asistente en este paciente' });
  await expect(workspace).toBeVisible();
  return workspace;
}

async function sendContextual(workspace, text) {
  const composer = workspace.getByLabel('Mensaje para Atal IA contextual');
  await composer.click();
  await composer.fill('');
  await composer.pressSequentially(text);
  await expect(composer).toHaveValue(text);
  const send = workspace.getByRole('button', { name: 'Enviar mensaje' });
  await expect(send).toBeVisible({ timeout: 20_000 });
  await send.click();
}

async function maybeConfirm(workspace) {
  const confirm = workspace.getByRole('button', { name: 'Confirmar y aplicar' });
  const visible = await confirm.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true).catch(() => false);
  if (visible) await confirm.click();
}

async function noteSnapshot(page) {
  const state = await readStore(page);
  return {
    noteA: state.notes.filter((note) => note.patientId === 'patient-e2e' && note.content === noteA).length,
    noteB: state.notes.filter((note) => note.patientId === 'patient-b-e2e' && note.content === noteB).length,
    crossA: state.notes.filter((note) => note.patientId === 'patient-e2e' && note.content === noteB).length,
    crossB: state.notes.filter((note) => note.patientId === 'patient-b-e2e' && note.content === noteA).length,
  };
}

test.describe('Live Gemini contextual isolation', () => {
  test('keeps patient A, patient B and global conversations isolated while contextual writes reach canonical state', async ({ page }) => {
    test.setTimeout(180_000);
    await seed(page);

    let workspace = await openPatientWorkspace(page, patientAPath, 'Paciente E2E');
    const conversationA = await workspace.getAttribute('data-conversation-id');
    expect(conversationA).toBeTruthy();
    await sendContextual(workspace, `Añade al expediente de este paciente esta nota exacta: “${noteA}” Hazlo ahora.`);
    await maybeConfirm(workspace);
    await expect.poll(() => noteSnapshot(page), { timeout: 60_000 }).toEqual({ noteA: 1, noteB: 0, crossA: 0, crossB: 0 });
    await expect(workspace.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cerrar asistente' }).click();

    workspace = await openPatientWorkspace(page, patientBPath, 'Paciente B E2E');
    const conversationB = await workspace.getAttribute('data-conversation-id');
    expect(conversationB).toBeTruthy();
    expect(conversationB).not.toBe(conversationA);
    await sendContextual(workspace, `Añade al expediente de este paciente esta nota exacta: “${noteB}” Hazlo ahora.`);
    await maybeConfirm(workspace);
    await expect.poll(() => noteSnapshot(page), { timeout: 60_000 }).toEqual({ noteA: 1, noteB: 1, crossA: 0, crossB: 0 });
    await expect(workspace.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cerrar asistente' }).click();

    const conversations = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CONVERSATIONS_KEY);
    const global = conversations.find((conversation) => conversation.id === globalConversationId);
    const contextual = conversations.filter((conversation) => conversation.scope === 'contextual');
    expect(global).toBeTruthy();
    expect(global.messages.some((message) => message.text === 'HISTORIAL GLOBAL AISLADO')).toBe(true);
    expect(contextual).toHaveLength(2);
    const storedA = contextual.find((conversation) => conversation.id === conversationA);
    const storedB = contextual.find((conversation) => conversation.id === conversationB);
    expect(storedA.contextKey).toMatch(/^contextual:patient:patient-e2e:/);
    expect(storedB.contextKey).toMatch(/^contextual:patient:patient-b-e2e:/);
    expect(storedA.messages.some((message) => message.text.includes(noteA))).toBe(true);
    expect(storedB.messages.some((message) => message.text.includes(noteB))).toBe(true);

    await page.goto('/assistant');
    await expect(page.getByText('HISTORIAL GLOBAL AISLADO')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(noteA);
    await expect(page.locator('body')).not.toContainText(noteB);

    await page.reload();
    await expect.poll(() => noteSnapshot(page), { timeout: 20_000 }).toEqual({ noteA: 1, noteB: 1, crossA: 0, crossB: 0 });
    await expect(page.getByText('HISTORIAL GLOBAL AISLADO')).toBeVisible();
  });
});
