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

const NOW = '2026-07-25T08:20:00.000Z';

function message(id, role, text, offsetSeconds) {
  return {
    id,
    role,
    text,
    createdAt: new Date(Date.parse(NOW) + offsetSeconds * 1000).toISOString(),
    attachments: [],
  };
}

async function seed(page, state, conversation) {
  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify([conversationValue]));
    localStorage.setItem(keys.drafts, JSON.stringify([]));
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    conversationValue: conversation,
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function seedFreshConversation(page, overrides = {}) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-gemini-fresh',
    draftId: 'draft-live-gemini-fresh',
    status: 'empty',
    messages: [],
    ...overrides,
  });
  await seed(page, state, conversation);
}

async function seedLiveConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-gemini-patient',
    draftId: 'draft-live-gemini-patient',
    intent: 'create_patient_plan',
    patientMode: 'new',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    status: 'ready_for_review',
    messages: [
      message('live-user-1', 'user', 'Quiero registrar un paciente nuevo.', 0),
      message('live-assistant-1', 'assistant', 'Claro. Dame el nombre y los datos que quieras registrar.', 1),
      message('live-user-2', 'user', 'Se llama Nicolás Morales, nació el 4 de octubre de 2008, sexo masculino, teléfono 4445679812. Es primera consulta por dolor lumbar después de una caída jugando fútbol hace dos semanas.', 2),
      message('live-assistant-2', 'assistant', 'Tengo los datos para registrar a Nicolás Morales con expediente inicial. ¿Quieres que lo guarde ahora?', 3),
    ],
  });
  await seed(page, state, conversation);
}

async function seedExistingPatientConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-gemini-patient-update',
    draftId: 'draft-live-gemini-patient-update',
    intent: 'update_patient_record',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    selectedExerciseId: '',
    status: 'empty',
    messages: [
      message('update-assistant-1', 'assistant', 'Estoy trabajando con Paciente E2E y su expediente actual.', 0),
    ],
  });
  await seed(page, state, conversation);
}

async function waitForAssistantMessage(page, conversationId) {
  await page.waitForFunction(({ conversationsKey, id }) => {
    const raw = localStorage.getItem(conversationsKey);
    if (!raw) return false;
    const conversation = JSON.parse(raw).find((item) => item.id === id);
    return Boolean(conversation?.messages?.some((item) => item.role === 'assistant' && item.text?.trim()));
  }, { conversationsKey: CONVERSATIONS_KEY, id: conversationId }, { timeout: 120_000 });
}

async function waitForPatientDomainMutation(page) {
  await page.waitForFunction((storeKey) => {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return false;
    const state = JSON.parse(raw);
    const patient = state.patients?.find((item) => item.id === 'patient-e2e');
    const record = state.clinicalRecords?.find((item) => item.patientId === 'patient-e2e');
    const hasNote = state.notes?.some((item) => item.patientId === 'patient-e2e' && /evoluciona favorablemente/i.test(item.content ?? ''));
    return patient?.contact?.phone === '4441112233' && record?.painLevel === 6 && hasNote;
  }, STORE_KEY, { timeout: 120_000 });
}

test.describe('Live Gemini browser certification', () => {
  test('fresh general conversation returns visible text instead of EMPTY_MODEL_TURN', async ({ page }) => {
    test.setTimeout(180_000);
    await seedFreshConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill('¿En qué me puedes ayudar?');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await waitForAssistantMessage(page, 'conversation-live-gemini-fresh');
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.locator('body')).not.toContainText('Atal IA no recibió una respuesta válida del modelo');
  });

  test('fresh patient-intake prompt produces a usable draft/assistant turn before seeded history exists', async ({ page }) => {
    test.setTimeout(180_000);
    await seedFreshConversation(page, {
      id: 'conversation-live-gemini-fresh-patient',
      draftId: 'draft-live-gemini-fresh-patient',
      intent: 'create_patient_plan',
      patientMode: 'new',
      selectedPatientId: '',
      selectedPlanId: '',
      selectedExerciseId: '',
    });
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill('Me ayudas a registrar un paciente nuevo?');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await page.waitForFunction(({ conversationsKey, draftsKey, id }) => {
      const conversations = JSON.parse(localStorage.getItem(conversationsKey) ?? '[]');
      const drafts = JSON.parse(localStorage.getItem(draftsKey) ?? '[]');
      const conversation = conversations.find((item) => item.id === id);
      const assistantAnswered = conversation?.messages?.some((item) => item.role === 'assistant' && item.text?.trim());
      return Boolean(assistantAnswered || drafts.length > 0);
    }, {
      conversationsKey: CONVERSATIONS_KEY,
      draftsKey: DRAFTS_KEY,
      id: 'conversation-live-gemini-fresh-patient',
    }, { timeout: 120_000 });

    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.locator('body')).not.toContainText('Atal IA no recibió una respuesta válida del modelo');
  });

  test('natural save confirmation creates and persists the patient in atal:store:v2', async ({ page }) => {
    test.setTimeout(180_000);
    await seedLiveConversation(page);
    await page.goto('/assistant');

    const before = await readStore(page);
    expect(before.patients.some((patient) => patient.name === 'Nicolás Morales')).toBe(false);

    await page.getByLabel('Mensaje para Atal IA').fill('Por favor guárdalo.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.getByText(/Nicolás Morales quedó registrado|registrad[oa].*Nicolás Morales|Nicolás Morales.*registrad[oa]/i)).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    let stored = await readStore(page);
    const patient = stored.patients.find((item) => item.name === 'Nicolás Morales');
    expect(patient).toBeTruthy();
    expect(patient.contact.phone).toBe('4445679812');
    expect(patient.birthDate).toBe('2008-10-04');

    const record = stored.clinicalRecords.find((item) => item.patientId === patient.id);
    expect(record).toBeTruthy();
    expect(record.reasonForVisit.toLocaleLowerCase('es-MX')).toContain('dolor lumbar');
    expect(stored.events.some((event) => event.toolName === 'patient.create' && event.outcome === 'success')).toBe(true);

    await page.reload();
    stored = await readStore(page);
    const persisted = stored.patients.find((item) => item.name === 'Nicolás Morales');
    expect(persisted).toBeTruthy();
    expect(stored.clinicalRecords.some((item) => item.patientId === persisted.id)).toBe(true);
  });

  test('one natural request updates patient data, adds a note and updates the clinical record through Gemini real', async ({ page }) => {
    test.setTimeout(180_000);
    await seedExistingPatientConversation(page);
    await page.goto('/assistant');

    const before = await readStore(page);
    const beforeRecord = before.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
    expect(before.patients.find((item) => item.id === 'patient-e2e')?.contact.phone).toBe('4440000000');
    expect(beforeRecord?.painLevel).toBe(4);
    expect(before.notes).toHaveLength(0);

    await page.getByLabel('Mensaje para Atal IA').fill('Actualiza el teléfono de este paciente a 4441112233, añade una nota que diga “Evoluciona favorablemente con ejercicios en casa” y cambia el dolor del expediente a 6 de 10.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await waitForPatientDomainMutation(page);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    let stored = await readStore(page);
    const patient = stored.patients.find((item) => item.id === 'patient-e2e');
    const record = stored.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
    expect(patient.contact.phone).toBe('4441112233');
    expect(record.painLevel).toBe(6);
    expect(record.version).toBeGreaterThan(beforeRecord.version);
    expect(stored.clinicalRecordVersions.length).toBeGreaterThan(0);
    expect(stored.notes.some((item) => item.patientId === 'patient-e2e' && /evoluciona favorablemente/i.test(item.content))).toBe(true);
    expect(stored.events.some((event) => event.toolName === 'patient.update' && event.outcome === 'success')).toBe(true);
    expect(stored.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'success')).toBe(true);
    expect(stored.events.some((event) => event.toolName === 'clinical_record.upsert' && event.outcome === 'success')).toBe(true);

    await page.reload();
    stored = await readStore(page);
    expect(stored.patients.find((item) => item.id === 'patient-e2e')?.contact.phone).toBe('4441112233');
    expect(stored.clinicalRecords.find((item) => item.patientId === 'patient-e2e')?.painLevel).toBe(6);
    expect(stored.notes.some((item) => item.patientId === 'patient-e2e' && /evoluciona favorablemente/i.test(item.content))).toBe(true);
  });
});
