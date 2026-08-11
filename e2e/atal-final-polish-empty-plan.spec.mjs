import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

test('patient without active plan shows one compact create-plan affordance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = createState({ plans: [], clinicalRecords: createState().clinicalRecords.map((record) => ({ ...record, planId: '' })) });
  await seedBrowser(page, { state });
  await page.goto('/patients/patient-e2e');

  await expect(page.getByRole('heading', { name: 'Plan activo' })).toBeVisible();
  await expect(page.getByText('Este paciente no tiene un plan activo.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear plan', exact: true })).toHaveCount(1);

  const emptyState = page.locator('.atal-profile-section').filter({ has: page.getByRole('heading', { name: 'Plan activo' }) }).locator('.atal-empty');
  const box = await emptyState.boundingBox();
  expect(box?.height ?? 999).toBeLessThanOrEqual(70);
});
