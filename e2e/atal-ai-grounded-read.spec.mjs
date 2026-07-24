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

async function fulfill(route, turn, deltas = []) {
  const events = [
    ...deltas.map((text) => ({ type: 'text_delta', text })),
    { type: 'done', turn },
  ];
  await route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson; charset=utf-8',
    body: `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
  });
}

test('"Dime cuantos pacientes tengo" reads Atal before answering', async ({ page }) => {
  await openAssistant(page);
  const payloads = [];

  await page.route('**/api/atal-ai/agent-turn-stream', async (route) => {
    const payload = route.request().postDataJSON();
    payloads.push(payload);

    if (payloads.length === 1) {
      expect(payload.allowedTools).toContain('app.read');
      expect(payload.allowedTools).toContain('patient.search');
      await fulfill(route, {
        text: '',
        calls: [{
          id: 'call-patient-count',
          bridge: 'atal_read',
          functionName: 'atal_app_read',
          tool: 'app.read',
          input: { resource: 'patients', limit: 50 },
          references: [],
        }],
        modelContent: {
          role: 'model',
          parts: [{ functionCall: { id: 'call-patient-count', name: 'atal_app_read', args: { resource: 'patients', limit: 50 } } }],
        },
      });
      return;
    }

    const serializedHistory = JSON.stringify(payload.history);
    expect(serializedHistory).toContain('call-patient-count');
    expect(serializedHistory).toContain('Paciente E2E');
    expect(serializedHistory).toContain('"total":1');

    const text = 'Tienes **1 paciente** registrado: Paciente E2E.';
    await fulfill(route, {
      text,
      calls: [],
      modelContent: { role: 'model', parts: [{ text }] },
    }, ['Tienes **1 paciente** registrado: ', 'Paciente E2E.']);
  });

  await page.getByLabel('Mensaje para Atal IA').fill('Dime cuantos pacientes tengo por favor.');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  await expect(page.getByText(/Tienes 1 paciente registrado/)).toBeVisible();
  await expect(page.getByText(/Paciente E2E/)).toBeVisible();
  await expect(page.getByText('Listo. Completé el trabajo solicitado.')).toHaveCount(0);
  expect(payloads).toHaveLength(2);
});
