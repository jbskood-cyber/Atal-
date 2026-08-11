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

async function seedPlanLifecycleConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-plan-lifecycle',
    draftId: 'draft-live-plan-lifecycle',
    intent: 'update_plan_status',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'plan-lifecycle-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Plan activo E2E del Paciente E2E.',
      createdAt: '2026-07-25T11:35:00.000Z',
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

async function planLifecycleSnapshot(page) {
  const state = await readStore(page);
  const plan = state.plans.find((item) => item.id === 'plan-active-e2e');
  return {
    status: plan?.status,
    pauseEvents: state.events.filter((event) => event.toolName === 'plan.pause' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini plan lifecycle', () => {
  test('pauses the selected active plan through Gemini real and persists after reload', async ({ page }) => {
    test.setTimeout(180_000);
    await seedPlanLifecycleConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Pausa el plan seleccionado. Hazlo ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => planLifecycleSnapshot(page), { timeout: 90_000 }).toMatchObject({
      status: 'paused',
      pauseEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('Trabajando…', { timeout: 30_000 });
    await expect(page.locator('body')).toContainText(/Plan activo E2E:\s*(?:paused|pausad[oa])/i);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => planLifecycleSnapshot(page), { timeout: 20_000 }).toMatchObject({
      status: 'paused',
      pauseEvents: 1,
    });
  });
});