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

async function seedExerciseMaintenanceConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-exercise-maintenance',
    draftId: 'draft-live-exercise-maintenance',
    intent: 'update_existing_exercise',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedExerciseId: 'exercise-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'exercise-maintenance-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Ejercicio E2E.',
      createdAt: '2026-07-25T13:05:00.000Z',
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

async function exerciseSnapshot(page) {
  const state = await readStore(page);
  const exercise = state.exercises.find((item) => item.id === 'exercise-e2e');
  return {
    status: exercise?.status,
    sets: exercise?.sets,
    repetitions: exercise?.repetitions,
    notes: exercise?.notes,
    updateEvents: state.events.filter((event) => event.toolName === 'exercise.update_fields' && event.outcome === 'success').length,
    lifecycleEvents: state.events.filter((event) => event.toolName === 'exercise.lifecycle' && event.outcome === 'success').length,
  };
}

async function send(page, text) {
  const composer = page.getByLabel('Mensaje para Atal IA');
  await expect(page.getByRole('button', { name: 'Grabar audio' })).toBeVisible({ timeout: 120_000 });
  await composer.fill(text);
  const sendButton = page.getByRole('button', { name: 'Enviar mensaje' });
  await expect(sendButton).toBeVisible({ timeout: 10_000 });
  await sendButton.click();
}

test.describe('Live Gemini exercise maintenance', () => {
  test('updates and archives the selected exercise through Gemini real and persists after reload', async ({ page }) => {
    test.setTimeout(240_000);
    await seedExerciseMaintenanceConversation(page);
    await page.goto('/assistant');

    await send(page, 'En el ejercicio seleccionado cambia las series a 5, las repeticiones a 15 y añade la nota “Progresión IA”. Haz los cambios ahora.');

    await expect.poll(() => exerciseSnapshot(page), { timeout: 60_000 }).toMatchObject({
      status: 'active',
      sets: 5,
      repetitions: 15,
      notes: 'Progresión IA',
      updateEvents: 1,
      lifecycleEvents: 0,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(page, 'Archiva el ejercicio seleccionado. Hazlo ahora.');

    await expect.poll(() => exerciseSnapshot(page), { timeout: 60_000 }).toMatchObject({
      status: 'archived',
      sets: 5,
      repetitions: 15,
      notes: 'Progresión IA',
      updateEvents: 1,
      lifecycleEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => exerciseSnapshot(page), { timeout: 20_000 }).toMatchObject({
      status: 'archived',
      sets: 5,
      repetitions: 15,
      notes: 'Progresión IA',
      updateEvents: 1,
      lifecycleEvents: 1,
    });
  });
});
