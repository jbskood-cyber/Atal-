import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('patient directory restores status, search and sort after opening a record and returning', async ({ page }) => {
  const state = createState();
  state.patients.push({
    ...structuredClone(state.patients[0]),
    id: 'patient-archived-qa',
    name: 'Marina Ejemplo QA',
    status: 'archived',
  });
  await seedBrowser(page, { state });
  await page.goto('/patients');

  await page.getByRole('button', { name: 'Archivados' }).click();
  await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('Marina');
  await page.getByRole('button', { name: /Nombre A–Z/ }).click();
  await expect(page.getByRole('button', { name: 'Archivados' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.atal-dense-row').filter({ hasText: 'Marina Ejemplo QA' }).click();
  await expect(page).toHaveURL(/\/patients\/patient-archived-qa$/);
  await page.locator('.atal-desktop-header').getByRole('link', { name: 'Pacientes' }).click();

  await expect(page.getByRole('textbox', { name: 'Buscar paciente' })).toHaveValue('Marina');
  await expect(page.getByRole('button', { name: 'Archivados' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Nombre Z–A/ })).toBeVisible();
  await expect(page.locator('.atal-dense-row')).toHaveCount(1);
  await expect(page.locator('.atal-dense-row')).toContainText('Marina Ejemplo QA');
  const after = await readStore(page);
  expect(after.patients).toEqual(state.patients);
  expect(after.plans).toEqual(state.plans);
});

test('plans directory restores draft filter and search without mutating plan data', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/plans');
  await page.getByRole('button', { name: /Borradores/ }).click();
  await page.getByRole('textbox', { name: 'Buscar planes' }).fill('candidato');
  await expect(page.locator('.atal-plan-row')).toHaveCount(1);
  await page.locator('.atal-plan-row').click();
  await expect(page).toHaveURL(/\/plans\/plan-draft-e2e$/);
  await page.locator('.atal-desktop-header').getByRole('link', { name: 'Planes' }).click();

  await expect(page.getByRole('textbox', { name: 'Buscar planes' })).toHaveValue('candidato');
  await expect(page.getByRole('button', { name: /Borradores/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atal-plan-row')).toHaveCount(1);
  await expect(page.locator('.atal-plan-row')).toContainText('Plan candidato E2E');
  expect((await readStore(page)).plans).toEqual(state.plans);
});

test('patient directory empty state is recoverable using clear filters, including on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = createState();
  await seedBrowser(page, { state, theme: 'dark' });
  await page.goto('/patients');
  await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('Nadie se llama así');
  await expect(page.getByRole('status')).toContainText('No hay pacientes con estos filtros');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('textbox', { name: 'Buscar paciente' })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atal-dense-row')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('plans directory empty search recovers the existing plan without new writes', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/plans');
  await page.getByRole('textbox', { name: 'Buscar planes' }).fill('Sin coincidencia E2E');
  await expect(page.getByRole('status')).toContainText('No hay planes con estos filtros');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.locator('.atal-plan-row')).toHaveCount(1);
  expect((await readStore(page)).plans).toEqual(state.plans);
});

test('returns to previous scroll offset after inspecting a patient', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 });
  const state = createState();
  const patient = state.patients[0];
  state.patients.push(...Array.from({ length: 35 }, (_, index) => ({
    ...structuredClone(patient),
    id: `patient-scroll-${index}`,
    name: `Paciente sintético ${String(index).padStart(2, '0')}`,
  })));
  await seedBrowser(page, { state });
  await page.goto('/patients');
  await expect(page.locator('.atal-dense-row')).toHaveCount(36);
  await page.evaluate(() => window.scrollTo(0, 820));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  await page.locator('.atal-dense-row').nth(19).click();
  await expect(page).toHaveURL(/\/patients\/patient-scroll-/);
  const offset = await page.evaluate(() => Number(window.sessionStorage.getItem('atal:directory-view:v1:patients:scroll')));
  expect(offset).toBeGreaterThan(200);
  await page.goBack();
  await expect(page.locator('.atal-dense-row')).toHaveCount(36);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(200);
});
