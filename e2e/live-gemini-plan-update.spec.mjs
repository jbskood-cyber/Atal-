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

async function seedPlanUpdateConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-plan-update',
    draftId: 'draft-live-plan-update',
    intent: 'update_existing_plan',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-draft-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'plan-update-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Plan candidato E2E. Indícame qué deseas cambiar.',
      createdAt: '2026-07-25T11:10:00.000Z',
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
  const plan = state.plans.find((item) => item.id === 'plan-draft-e2e');
  return {
    frequency: plan?.frequency,
    focus: plan?.focus,
    status: plan?.status,
    updateEvents: state.events.filter((event) => event.kind === 'plan_updated' && event.planId === 'plan-draft-e2e').length,
  };
}

test.describe('Live Gemini plan update', () => {
  test('updates selected plan fields through the real agent and persists them', async ({ page }) => {
    test.setTimeout(180_000);
    await seedPlanUpdateConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Cambia la frecuencia del plan seleccionado a “5 días por semana” y el enfoque a “Movilidad lumbar progresiva”. Hazlo ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => planSnapshot(page), { timeout: 120_000 }).toMatchObject({
      frequency: '5 días por semana',
      focus: 'Movilidad lumbar progresiva',
      status: 'draft',
      updateEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      frequency: '5 días por semana',
      focus: 'Movilidad lumbar progresiva',
      status: 'draft',
      updateEvents: 1,
    });
  });
});
