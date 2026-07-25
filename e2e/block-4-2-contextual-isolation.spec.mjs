import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  createConversation,
  createState,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
} from './fixtures.mjs';

const patientAPath = '/patients/patient-e2e';
const patientBPath = '/patients/patient-b-e2e';
const globalConversationId = 'global-conversation-e2e';
const globalComposerText = 'Borrador global intacto';
const updatedGlobalComposerText = 'Borrador global actualizado';

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
    contact: {
      ...structuredClone(sourcePatient.contact),
      email: 'paciente-b@example.test',
    },
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

async function seedPersistentBrowser(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(({ state, globalConversation, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(state));
    localStorage.setItem(keys.conversations, JSON.stringify([globalConversation]));
    localStorage.setItem(keys.drafts, '[]');
    localStorage.setItem(keys.theme, 'light');
  }, {
    state: createTwoPatientState(),
    globalConversation: {
      ...createConversation({ id: globalConversationId }),
      composerText: globalComposerText,
    },
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function openPatientWorkspace(page, path, heading) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  return page.getByRole('dialog', { name: 'Asistente en este paciente' });
}

async function storedConversation(page, conversationId) {
  return page.evaluate(({ key, id }) => {
    const conversations = JSON.parse(localStorage.getItem(key) ?? '[]');
    return conversations.find((conversation) => conversation.id === id) ?? null;
  }, { key: CONVERSATIONS_KEY, id: conversationId });
}

test('global and patient contextual assistants keep independent persistent instances', async ({ page }) => {
  await seedPersistentBrowser(page);

  let workspace = await openPatientWorkspace(page, patientAPath, 'Paciente E2E');
  const conversationA = await workspace.getAttribute('data-conversation-id');
  expect(conversationA).toBeTruthy();
  const composerA = workspace.getByLabel('Mensaje para Atal IA contextual');
  await composerA.fill('Borrador privado del paciente A');
  await expect.poll(async () => (await storedConversation(page, conversationA))?.composerText ?? '')
    .toBe('Borrador privado del paciente A');
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();

  workspace = await openPatientWorkspace(page, patientBPath, 'Paciente B E2E');
  const conversationB = await workspace.getAttribute('data-conversation-id');
  expect(conversationB).toBeTruthy();
  expect(conversationB).not.toBe(conversationA);
  const composerB = workspace.getByLabel('Mensaje para Atal IA contextual');
  await expect(composerB).toHaveValue('');
  await composerB.fill('Borrador privado del paciente B');
  await expect.poll(async () => (await storedConversation(page, conversationB))?.composerText ?? '')
    .toBe('Borrador privado del paciente B');
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();

  workspace = await openPatientWorkspace(page, patientAPath, 'Paciente E2E');
  await expect(workspace).toHaveAttribute('data-conversation-id', conversationA);
  await expect(workspace.getByLabel('Mensaje para Atal IA contextual')).toHaveValue('Borrador privado del paciente A');

  let conversations = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CONVERSATIONS_KEY);
  expect(conversations).toHaveLength(3);

  let global = conversations.find((conversation) => conversation.id === globalConversationId);
  expect(global).toBeTruthy();
  expect(global.scope ?? 'global').toBe('global');
  expect(global.contextKey).toBeUndefined();
  expect(global.composerText).toBe(globalComposerText);

  let contextual = conversations.filter((conversation) => conversation.scope === 'contextual');
  expect(contextual).toHaveLength(2);
  expect(contextual.some((conversation) => conversation.id === globalConversationId)).toBe(false);

  let storedA = contextual.find((conversation) => conversation.id === conversationA);
  let storedB = contextual.find((conversation) => conversation.id === conversationB);
  expect(storedA.contextKey).not.toBe(storedB.contextKey);
  expect(storedA.contextKey).toMatch(/^contextual:patient:patient-e2e:/);
  expect(storedB.contextKey).toMatch(/^contextual:patient:patient-b-e2e:/);
  expect(storedA.workContext.selectedPatientId).toBe('patient-e2e');
  expect(storedB.workContext.selectedPatientId).toBe('patient-b-e2e');
  expect(storedA.composerText).toBe('Borrador privado del paciente A');
  expect(storedB.composerText).toBe('Borrador privado del paciente B');

  await page.getByRole('button', { name: 'Cerrar asistente' }).click();
  await page.goto('/assistant');

  const globalComposer = page.getByLabel('Mensaje para Atal IA');
  await expect(globalComposer).toHaveValue(globalComposerText);
  await expect(page.locator('body')).not.toContainText('Borrador privado del paciente A');
  await expect(page.locator('body')).not.toContainText('Borrador privado del paciente B');

  await globalComposer.fill(updatedGlobalComposerText);
  await expect.poll(async () => (await storedConversation(page, globalConversationId))?.composerText ?? '')
    .toBe(updatedGlobalComposerText);

  conversations = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CONVERSATIONS_KEY);
  global = conversations.find((conversation) => conversation.id === globalConversationId);
  contextual = conversations.filter((conversation) => conversation.scope === 'contextual');
  storedA = contextual.find((conversation) => conversation.id === conversationA);
  storedB = contextual.find((conversation) => conversation.id === conversationB);

  expect(global.composerText).toBe(updatedGlobalComposerText);
  expect(contextual).toHaveLength(2);
  expect(storedA.composerText).toBe('Borrador privado del paciente A');
  expect(storedB.composerText).toBe('Borrador privado del paciente B');
});
