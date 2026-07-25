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

async function seedPatientConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-patient-maintenance',
    draftId: 'draft-live-patient-maintenance',
    intent: 'update_patient_record',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    status: 'ready_for_review',
    messages: [
      {
        id: 'maintenance-assistant-1',
        role: 'assistant',
        text: 'Estoy trabajando con Paciente E2E. Dime qué cambios necesitas hacer.',
        createdAt: '2026-07-25T08:45:00.000Z',
        attachments: [],
      },
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

async function patientMaintenanceSnapshot(page) {
  const state = await readStore(page);
  const patient = state.patients.find((item) => item.id === 'patient-e2e');
  return {
    phone: patient?.contact?.phone,
    status: patient?.status,
    note: state.notes.find((item) => item.patientId === 'patient-e2e' && item.content === 'Mejora tolerancia al movimiento')?.content,
    updateEvents: state.events.filter((event) => event.toolName === 'patient.update' && event.outcome === 'success').length,
    noteEvents: state.events.filter((event) => event.toolName === 'patient_note.add' && event.outcome === 'success').length,
    lifecycleEvents: state.events.filter((event) => event.toolName === 'patient.lifecycle' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini patient maintenance', () => {
  test('updates, notes and archives the selected patient through the real app', async ({ page }) => {
    test.setTimeout(180_000);
    await seedPatientConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Para el paciente seleccionado, cambia su teléfono a 4441112233, añade una nota que diga exactamente “Mejora tolerancia al movimiento” y archiva al paciente. Haz las tres acciones ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => patientMaintenanceSnapshot(page), { timeout: 120_000 }).toMatchObject({
      phone: '4441112233',
      status: 'archived',
      note: 'Mejora tolerancia al movimiento',
      updateEvents: 1,
      noteEvents: 1,
      lifecycleEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => patientMaintenanceSnapshot(page), { timeout: 20_000 }).toMatchObject({
      phone: '4441112233',
      status: 'archived',
      note: 'Mejora tolerancia al movimiento',
    });
  });
});
