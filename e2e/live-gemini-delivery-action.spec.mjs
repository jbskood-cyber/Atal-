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
    id: 'conversation-live-delivery-action',
    draftId: 'draft-live-delivery-action',
    intent: 'update_existing_plan',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'delivery-action-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con el plan activo seleccionado.',
      createdAt: '2026-07-25T15:05:00.000Z',
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
  await composer.click();
  await composer.fill('');
  await composer.pressSequentially(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test.describe('Live Gemini delivery action', () => {
  test('downloads the selected plan through Gemini real after explicit confirmation', async ({ page }) => {
    test.setTimeout(150_000);
    await seed(page);
    await page.goto('/assistant');

    await send(page, 'Descarga la entrega de este plan. Hazlo ahora.');

    const confirmation = page.getByRole('dialog', { name: '¿Continuar con la acción sensible?' });
    await expect(confirmation).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await confirmation.getByRole('button', { name: 'Continuar' }).click();
    const download = await downloadPromise;

    await expect(page).toHaveURL(/\/plans\/plan-active-e2e\/delivery$/, { timeout: 60_000 });
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    await expect(page.getByRole('status')).toContainText(/PDF descargado/i, { timeout: 60_000 });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
