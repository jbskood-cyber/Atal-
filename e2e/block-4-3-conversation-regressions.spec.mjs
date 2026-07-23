import { expect, test } from '@playwright/test';
import { createState } from './fixtures.mjs';

async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.clear();
    localStorage.setItem('atal:store:v2', JSON.stringify(state));
    localStorage.setItem('atal:ai-conversations:v1', '[]');
    localStorage.setItem('atal:ai-drafts:v1', '[]');
    localStorage.setItem('atal:theme', 'light');
  }, createState());
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: '¿Qué necesitas resolver?' })).toBeVisible();
}

async function send(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test.describe('Block 4.3 conversational regressions', () => {
  test('assistant messages keep a readable mobile width instead of collapsing to one word per line', async ({ page }) => {
    await openAssistant(page);
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Puedo conversar contigo, consultar Atal y actuar cuando me lo pidas.',
          calls: [],
          modelContent: { role: 'model', parts: [{ text: 'Respuesta natural.' }] },
        }),
      });
    });

    await send(page, 'Hola, ¿cómo puedes ayudarme?');
    const body = page.locator('.atal-command-message.is-assistant > div').last();
    await expect(body).toContainText('Puedo conversar contigo');
    const box = await body.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(240);
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);
  });

  test('a new completed turn sends the visible conversation history to Gemini', async ({ page }) => {
    await openAssistant(page);
    const payloads = [];
    let turn = 0;
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      payloads.push(route.request().postDataJSON());
      turn += 1;
      const text = turn === 1
        ? 'Claro. Puedo hablar contigo de forma natural y también operar Atal.'
        : 'Sí. Recuerdo que acabamos de hablar sobre cómo puedo ayudarte.';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text, calls: [], modelContent: { role: 'model', parts: [{ text }] } }),
      });
    });

    await send(page, 'Hola, ¿puedes conversar conmigo?');
    await expect(page.getByText(/Puedo hablar contigo/)).toBeVisible();
    await send(page, '¿Recuerdas lo que acabamos de hablar?');
    await expect(page.getByText(/Recuerdo que acabamos de hablar/)).toBeVisible();

    expect(payloads).toHaveLength(2);
    expect(payloads[1].conversationHistory).toEqual([
      { role: 'user', parts: [{ text: 'Hola, ¿puedes conversar conmigo?' }] },
      { role: 'model', parts: [{ text: 'Claro. Puedo hablar contigo de forma natural y también operar Atal.' }] },
    ]);
  });

  test('a plain image question remains conversational and does not open a clinical review', async ({ page }) => {
    await openAssistant(page);
    let requestPayload;
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'La imagen muestra el interior de una habitación. No veo información clínica suficiente para modificar un expediente.',
          calls: [],
          modelContent: { role: 'model', parts: [{ text: 'Descripción visual.' }] },
        }),
      });
    });

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Adjuntar' }).click();
    await page.getByText('Fotos').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'habitacion.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('imagen-e2e') });
    await send(page, '¿Qué es esto?');

    await expect(page.getByText(/interior de una habitación/)).toBeVisible();
    await expect(page.getByText('Revisa antes de guardar')).toHaveCount(0);
    expect(requestPayload.allowedTools).not.toContain('patient.update');
    expect(requestPayload.allowedTools).not.toContain('clinical_record.upsert');
  });
});
