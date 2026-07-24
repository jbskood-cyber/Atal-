import { expect, test } from '@playwright/test';
import { createDraftResponse, createState } from './fixtures.mjs';

async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('atal:store:v2', JSON.stringify(state));
    localStorage.setItem('atal:ai-conversations:v1', '[]');
    localStorage.setItem('atal:ai-drafts:v1', '[]');
    localStorage.setItem('atal:theme', 'light');
  }, createState());
  await page.goto('/assistant');
  await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
}

async function send(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test('a reviewable draft stays available without hijacking normal conversation', async ({ page }) => {
  await openAssistant(page);
  let analyzeCalls = 0;
  await page.route('**/api/atal-ai/analyze', async (route) => {
    analyzeCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createDraftResponse({
        intent: 'create_patient_plan',
        responseMode: 'draft',
        assistantMessage: 'Preparé el plan para que lo revises.',
        patient: { name: 'Paciente de prueba' },
        plan: { title: 'Plan de movilidad', frequency: { value: 3, period: 'week', customText: '' } },
      })),
    });
  });

  await send(page, 'Prepara un plan de tratamiento de cuatro semanas.');
  await expect(page.getByText('Preparé el plan para que lo revises.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Borrador preparado' })).toBeVisible();
  expect(analyzeCalls).toBe(1);

  await page.route('**/api/atal-ai/agent-turn-stream', async (route) => {
    const text = 'La frecuencia indica cuántas veces se realiza el plan dentro de un periodo, por ejemplo tres veces por semana.';
    const events = [
      { type: 'text_delta', text: 'La frecuencia indica cuántas veces se realiza el plan ' },
      { type: 'text_delta', text: 'dentro de un periodo, por ejemplo tres veces por semana.' },
      { type: 'done', turn: { text, calls: [], modelContent: { role: 'model', parts: [{ text }] } } },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson; charset=utf-8',
      body: `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
    });
  });

  await send(page, '¿Qué significa la frecuencia de un plan?');
  await expect(page.getByText(/La frecuencia indica cuántas veces/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Borrador preparado' })).toBeVisible();
  expect(analyzeCalls).toBe(1);
});
