import { expect, test } from '@playwright/test';
import { createState } from './fixtures.mjs';

async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('atal:store:v2', JSON.stringify(state));
    localStorage.setItem('atal:ai-conversations:v1', '[]');
    localStorage.setItem('atal:ai-drafts:v1', '[]');
    localStorage.setItem('atal:theme', 'dark');
  }, createState());
  await page.goto('/assistant');
  await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
}

test('a provider limit is shown once as a recoverable error and never as an assistant answer', async ({ page }) => {
  await openAssistant(page);
  const message = 'Gemini alcanzó temporalmente su límite. El trabajo completado sigue guardado.';

  await page.route('**/api/atal-ai/agent-turn-stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson; charset=utf-8',
      body: `${JSON.stringify({ type: 'error', error: message })}\n`,
    });
  });
  await page.route('**/api/atal-ai/agent-turn', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    });
  });

  await page.getByLabel('Mensaje para Atal IA').fill('¿Puedes modificar algo sin que yo te lo pida?');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  await expect(page.getByRole('alert')).toContainText(message);
  await expect(page.getByText(message, { exact: true })).toHaveCount(1);
  await expect(page.locator('.atal-command-message.is-assistant')).toHaveCount(0);
  await expect(page.locator('.atal-command-message.is-user')).toHaveCount(1);
});
