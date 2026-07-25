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

test.describe('Live Gemini browser certification', () => {
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
});
