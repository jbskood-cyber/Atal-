import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
} from './fixtures.mjs';

async function seed(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-delivery',
    draftId: 'draft-live-delivery',
    intent: 'update_existing_plan',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'delivery-assistant-1',
      role: 'assistant',
      text: 'Puedo abrir la entrega del plan seleccionado.',
      createdAt: '2026-07-25T14:55:00.000Z',
      attachments: [],
    }],
  });

  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, keys }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify([conversationValue]));
    localStorage.setItem(keys.drafts, JSON.stringify([]));
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    conversationValue: conversation,
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
}

async function send(page, text) {
  await expect(page.getByRole('button', { name: 'Grabar audio' })).toBeVisible({ timeout: 60_000 });
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test.describe('Live Gemini plan delivery', () => {
  test('opens the selected plan delivery through Gemini real without mutating clinical state', async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page);
    await page.goto('/assistant');

    await send(page, 'Abre la entrega de este plan.');
    await expect(page).toHaveURL(/\/plans\/plan-active-e2e\/delivery$/, { timeout: 60_000 });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    const request = await page.evaluate(() => JSON.parse(sessionStorage.getItem('atal:delivery-action:plan-active-e2e') ?? 'null'));
    expect(request).toBeTruthy();
    expect(request.action).toBe('open');
  });
});
