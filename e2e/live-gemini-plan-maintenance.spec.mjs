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

async function seedPlanMaintenanceConversation(page) {
  const state = createState();
  state.exercises.push({
    ...state.exercises[0],
    id: 'exercise-extra-live',
    name: 'Control escapular IA',
  });

  const conversation = createConversation({
    id: 'conversation-live-plan-maintenance',
    draftId: 'draft-live-plan-maintenance',
    intent: 'update_existing_plan',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    selectedExerciseId: 'exercise-extra-live',
    status: 'ready_for_review',
    messages: [{
      id: 'plan-maintenance-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Plan activo E2E del Paciente E2E.',
      createdAt: '2026-07-25T11:15:00.000Z',
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

async function planSnapshot(page) {
  const state = await readStore(page);
  const plan = state.plans.find((item) => item.id === 'plan-active-e2e');
  return {
    frequency: plan?.frequency,
    exerciseIds: plan?.exerciseIds ?? [],
    updateEvents: state.events.filter((event) => event.toolName === 'plan.update_fields' && event.outcome === 'success').length,
    membershipEvents: state.events.filter((event) => event.toolName === 'plan.membership' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini plan maintenance', () => {
  test('updates plan fields and exercise membership through Gemini real and persists both after reload', async ({ page }) => {
    test.setTimeout(180_000);
    await seedPlanMaintenanceConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'En el plan seleccionado, cambia la frecuencia a “5 veces por semana” y añade el ejercicio “Control escapular IA”. Haz ambos cambios ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => planSnapshot(page), { timeout: 60_000 }).toMatchObject({
      frequency: '5 veces por semana',
      exerciseIds: expect.arrayContaining(['exercise-e2e', 'exercise-extra-live']),
      updateEvents: 1,
      membershipEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      frequency: '5 veces por semana',
      exerciseIds: expect.arrayContaining(['exercise-e2e', 'exercise-extra-live']),
      updateEvents: 1,
      membershipEvents: 1,
    });
  });
});
