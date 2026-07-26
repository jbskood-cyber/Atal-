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

async function seed(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-delivery-export',
    draftId: 'draft-live-delivery-export',
    intent: 'export_data',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'delivery-export-assistant-1',
      role: 'assistant',
      text: 'Puedo preparar exportaciones locales y abrir la entrega del plan seleccionado.',
      createdAt: '2026-07-25T14:45:00.000Z',
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
  await expect(composer).toHaveValue(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

async function confirmSensitive(page, expectedDownload = false) {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '¿Continuar con la acción sensible?' })).toBeVisible({ timeout: 60_000 });
  const button = dialog.getByRole('button', { name: 'Continuar' });
  if (!expectedDownload) {
    await button.click();
    return undefined;
  }
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await button.click();
  return downloadPromise;
}

async function readDownloadText(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test.describe('Live Gemini delivery and export flow', () => {
  test('exports a canonical local backup and opens the selected plan delivery through Gemini real', async ({ page }) => {
    test.setTimeout(180_000);
    await seed(page);
    await page.goto('/assistant');

    await send(page, 'Exporta un respaldo local completo de Atal. Hazlo ahora.');
    const download = await confirmSensitive(page, true);
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/^atal-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
    const backupText = await readDownloadText(download);
    const backup = JSON.parse(backupText);
    expect(backup.mediaExcluded).toBe(true);
    expect(backup.patients.some((patient) => patient.id === 'patient-e2e')).toBe(true);
    expect(backup.plans.some((plan) => plan.id === 'plan-active-e2e')).toBe(true);

    await expect.poll(async () => {
      const state = await readStore(page);
      return state.events.filter((event) => event.toolName === 'data.export_local' && event.outcome === 'success').length;
    }, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(page, 'Abre la entrega de este plan.');
    await expect(page).toHaveURL(/\/plans\/plan-active-e2e\/delivery$/, { timeout: 60_000 });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    await page.goto('/assistant');
    await expect(page.getByText(/respaldo local|export/i).first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
