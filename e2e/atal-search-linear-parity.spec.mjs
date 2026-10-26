import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

test('global search shortcut opens and closes the filtered dialog', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.goto('/');
  await expect(page.locator('.atal-desktop-search kbd')).toHaveText('Ctrl K');

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' });
  await expect(input).toBeFocused();
  await expect(dialog.getByText('Busca un paciente, plan, ejercicio o reporte.')).toBeVisible();
  await expect(dialog.getByText(/No encontramos resultados/)).toHaveCount(0);

  await input.fill('Paciente E2E');
  await expect(dialog.locator('a[href="/patients/patient-e2e"]')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Planes', exact: true }).click();
  await expect(dialog.locator('a[href="/plans/plan-active-e2e"]')).toBeVisible();
  await expect(dialog.locator('a[href="/patients/patient-e2e"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Todos', exact: true }).click();
  await expect(dialog.locator('a[href="/patients/patient-e2e"]')).toHaveCount(1);

  await input.fill('no-existe-qa-2026');
  await expect(dialog.getByText('No encontramos resultados para esta búsqueda.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test('global search keeps the existing entity links and returns to the selected patient', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.goto('/');
  await page.getByRole('button', { name: /Buscar pacientes, planes, ejercicios/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await dialog.getByRole('textbox').fill('Paciente E2E');
  await dialog.locator('a[href="/patients/patient-e2e"]').click();
  await expect(page).toHaveURL(/\/patients\/patient-e2e$/);
  await expect(dialog).toHaveCount(0);
});

test('Enter opens the first matching result and does not interfere with editing fields', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.goto('/');
  // Route hydration installs the global keyboard listener.
  await expect(page.locator('.atal-desktop-search')).toBeVisible();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('Movilidad asistida E2E');
  await dialog.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/\/exercises\/exercise-e2e$/);
  await expect(dialog).toHaveCount(0);
});

test('mobile search keeps an in-progress patient form and filters exercises', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/patients/new');

  const name = page.getByPlaceholder('Ej. Paciente Demo 13');
  await name.fill('Paciente ficticio sin guardar');
  await name.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Buscar en Atal' }).click();
  const dialog = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('Movilidad asistida E2E');
  await dialog.getByRole('button', { name: 'Ejercicios' }).click();
  await expect(dialog.locator('a[href="/exercises/exercise-e2e"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(name).toHaveValue('Paciente ficticio sin guardar');
});

test('macOS shortcut label and Meta+K work with a Mac platform', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'MacIntel' });
  });
  await page.goto('/');
  await expect(page.locator('.atal-desktop-search kbd')).toHaveText('⌘ K');
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toBeVisible();
});
