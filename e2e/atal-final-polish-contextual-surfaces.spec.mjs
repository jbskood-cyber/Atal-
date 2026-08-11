import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

const surfaces = [
  { route: '/patients/patient-e2e', label: 'en este paciente', surface: 'patient', entity: 'Paciente E2E' },
  { route: '/patients/patient-e2e/clinical-record', label: 'en este expediente', surface: 'clinical-record', entity: 'Paciente E2E' },
  { route: '/plans/plan-active-e2e', label: 'en este plan', surface: 'plan', entity: 'Plan activo E2E' },
  { route: '/exercises/exercise-e2e', label: 'en este ejercicio', surface: 'exercise', entity: 'Movilidad asistida E2E' },
  { route: '/activity/session-e2e', label: 'en este reporte', surface: 'report', entity: 'Paciente E2E' },
];

async function mockContextualReply(page, text) {
  await page.route('**/api/atal-ai/agent-turn', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text,
        modelContent: { role: 'model', parts: [{ text }] },
        calls: [],
      }),
    });
  });
}

test.describe('Final polish contextual assistant surface matrix', () => {
  for (const entry of surfaces) {
    test(`${entry.surface} surface opens and completes a contextual text turn`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await seedBrowser(page, { state: createState() });
      await mockContextualReply(page, `Contexto ${entry.surface} operativo.`);
      await page.goto(entry.route);

      const opener = page.getByRole('button', { name: `Abrir Atal IA ${entry.label}` });
      await expect(opener).toBeVisible({ timeout: 20_000 });
      await opener.click();

      const workspace = page.getByRole('dialog', { name: `Asistente ${entry.label}` });
      await expect(workspace).toBeVisible();
      await expect(workspace).toHaveAttribute('data-context-surface', entry.surface);
      await expect(workspace).toContainText(entry.entity);
      await expect(workspace.getByRole('heading', { name: 'Atal IA' })).toBeVisible();

      const composer = workspace.getByLabel('Mensaje para Atal IA contextual');
      await composer.fill('Confirma que este asistente contextual responde.');
      await workspace.getByRole('button', { name: 'Enviar mensaje' }).click();

      await expect(workspace.getByText(`Contexto ${entry.surface} operativo.`)).toBeVisible({ timeout: 20_000 });
      await expect(workspace.getByRole('alert')).toHaveCount(0);
    });
  }
});
