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

async function seedExerciseConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-exercise-create',
    draftId: 'draft-live-exercise-create',
    intent: 'create_exercise',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'exercise-create-assistant-1',
      role: 'assistant',
      text: 'Puedo crear un ejercicio nuevo en la biblioteca de Atal.',
      createdAt: '2026-07-25T12:05:00.000Z',
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
  const exercise = state.exercises.find((item) => item.name === 'Remo escapular IA');
  return {
    exists: Boolean(exercise),
    status: exercise?.status,
    region: exercise?.region,
    sets: exercise?.sets,
    repetitions: exercise?.repetitions,
    createEvents: state.events.filter((event) => event.toolName === 'exercise.create_simple' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini exercise create', () => {
  test('prepares, reviews, applies and persists an exercise through Gemini real', async ({ page }) => {
    test.setTimeout(180_000);
    await seedExerciseConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Crea ahora un ejercicio nuevo llamado “Remo escapular IA”, región hombro, categoría fuerza, 4 series de 12 repeticiones. Guárdalo en la biblioteca.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const preparedDraft = page.getByRole('region', { name: 'Borrador preparado' });
    await expect(preparedDraft).toBeVisible({ timeout: 60_000 });
    await expect(preparedDraft).toContainText('Remo escapular IA');
    await expect.poll(() => exerciseSnapshot(page), { timeout: 5_000 }).toMatchObject({
      exists: false,
      createEvents: 0,
    });

    const thread = page.locator('.atal-command-thread');
    await thread.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }));
    const apply = preparedDraft.getByRole('button', { name: 'Aplicar cambios' });
    await expect(apply).toBeVisible();
    await apply.click();

    const confirmation = page.getByRole('dialog', { name: '¿Aplicar este borrador?' });
    await expect(confirmation).toBeVisible({ timeout: 20_000 });
    await confirmation.getByRole('button', { name: 'Confirmar y aplicar' }).click();

    await expect.poll(() => exerciseSnapshot(page), { timeout: 60_000 }).toMatchObject({
      exists: true,
      status: 'active',
      sets: 4,
      repetitions: 12,
      createEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => exerciseSnapshot(page), { timeout: 20_000 }).toMatchObject({
      exists: true,
      status: 'active',
      sets: 4,
      repetitions: 12,
      createEvents: 1,
    });
  });
});
