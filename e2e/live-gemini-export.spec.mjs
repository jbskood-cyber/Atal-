import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
} from './fixtures.mjs';

async function seedExportConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-export',
    draftId: 'draft-live-export',
    intent: 'export_data',
    status: 'ready_for_review',
    messages: [{
      id: 'export-assistant-1',
      role: 'assistant',
      text: 'Puedo preparar exportaciones locales de Atal.',
      createdAt: '2026-07-25T14:50:00.000Z',
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

async function send(page, text) {
  await expect(page.getByRole('button', { name: 'Grabar audio' })).toBeVisible({ timeout: 60_000 });
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.click();
  await composer.fill('');
  await composer.pressSequentially(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test.describe('Live Gemini local export', () => {
  test('exports a real local backup through Gemini, confirmation and the client download effect', async ({ page }) => {
    test.setTimeout(180_000);
    await seedExportConversation(page);
    await page.goto('/assistant');

    await send(page, 'Exporta un respaldo local completo de Atal. Hazlo ahora.');

    const confirmation = page.getByRole('dialog', { name: '¿Continuar con la acción sensible?' });
    await expect(confirmation).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await confirmation.getByRole('button', { name: 'Continuar' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^atal-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
    const stream = await download.createReadStream();
    let content = '';
    for await (const chunk of stream) content += chunk.toString();
    const exported = JSON.parse(content);
    expect(Array.isArray(exported.patients)).toBe(true);
    expect(exported.patients.some((patient) => patient.id === 'patient-e2e')).toBe(true);
    expect(exported.mediaExcluded).toBe(true);

    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
