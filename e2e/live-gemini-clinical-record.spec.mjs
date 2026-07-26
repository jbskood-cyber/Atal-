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

async function seedClinicalRecordConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-clinical-record',
    draftId: 'draft-live-clinical-record',
    intent: 'update_patient_record',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'clinical-record-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con el expediente de Paciente E2E. Dime qué quieres actualizar.',
      createdAt: '2026-07-25T10:10:00.000Z',
      attachments: [],
    }],
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

async function clinicalRecordSnapshot(page) {
  const state = await readStore(page);
  const record = state.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
  const previous = state.clinicalRecordVersions.find((item) => item.recordId === 'record-e2e');
  return {
    painLevel: record?.painLevel,
    evolution: record?.evolution,
    version: record?.version,
    previousVersion: previous?.version,
    previousPainLevel: previous?.snapshot?.painLevel,
    auditEvents: state.events.filter((event) => event.toolName === 'clinical_record.upsert' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini clinical record', () => {
  test('updates the selected patient clinical record and persists its previous version', async ({ page }) => {
    test.setTimeout(180_000);
    await seedClinicalRecordConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Actualiza el expediente clínico del paciente seleccionado. Cambia el dolor actual a 6 de 10 y la evolución a “Mejor tolerancia al movimiento esta semana”. Hazlo ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => clinicalRecordSnapshot(page), { timeout: 120_000 }).toMatchObject({
      painLevel: 6,
      evolution: 'Mejor tolerancia al movimiento esta semana',
      version: 2,
      previousVersion: 1,
      previousPainLevel: 4,
      auditEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => clinicalRecordSnapshot(page), { timeout: 20_000 }).toMatchObject({
      painLevel: 6,
      evolution: 'Mejor tolerancia al movimiento esta semana',
      version: 2,
      previousVersion: 1,
      previousPainLevel: 4,
    });
  });
});
