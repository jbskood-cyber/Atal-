import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

test('contextual assistant is a compact text-first workspace without suggestion or draft chrome', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/patients/patient-e2e');

  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  const workspace = page.getByRole('dialog', { name: 'Asistente en este paciente' });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole('heading', { name: 'Atal IA' })).toBeVisible();
  await expect(workspace).toContainText('Paciente E2E');

  await expect(workspace.locator('[aria-label="Acciones contextuales"]')).toHaveCount(0);
  await expect(workspace.locator('[aria-label="Sugerencias de Atal IA"]')).toHaveCount(0);
  await expect(workspace.locator('[aria-label="Vista del asistente"]')).toHaveCount(0);
  await expect(workspace.getByText('Borrador', { exact: true })).toHaveCount(0);

  const composer = workspace.locator('.atal-contextual-composer');
  const composerBox = await composer.boundingBox();
  expect(composerBox?.height ?? 999).toBeLessThanOrEqual(48);

  const textarea = workspace.getByLabel('Mensaje para Atal IA contextual');
  await textarea.fill('Mensaje breve de QA');
  await expect(workspace.getByRole('button', { name: 'Enviar mensaje' })).toBeVisible();
  const sendBox = await workspace.getByRole('button', { name: 'Enviar mensaje' }).boundingBox();
  expect(sendBox?.width ?? 999).toBeLessThanOrEqual(40);
  expect(sendBox?.height ?? 999).toBeLessThanOrEqual(40);
});
