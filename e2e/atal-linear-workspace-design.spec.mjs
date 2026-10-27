import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('desktop shell groups clinical navigation and reflects the active workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/');
  const sidebar = page.locator('.atal-sidebar');
  await expect(sidebar).toBeVisible();
  const nav = sidebar.getByRole('navigation', { name: 'Navegación principal' });
  await expect(nav).toContainText('Espacio clínico');
  await expect(nav).toContainText('Trabajo');
  await expect(nav).toContainText('Asistente');
  await expect(nav).toContainText('Preferencias');
  await expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.atal-desktop-title')).toHaveText('Escritorio maestro');

  await nav.getByRole('link', { name: 'Pacientes' }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.locator('.atal-desktop-title')).toHaveText('Pacientes');
  await expect(nav.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Atal IA' }).click();
  await expect(page).toHaveURL(/\/assistant$/);
  // The full-screen agent may preserve the clinical page under its workspace
  // overlay, so its background header is not the active screen's title.
  await expect(page.getByRole('heading', { name: '¿Qué necesitas hacer hoy?' })).toBeVisible();
});

test('nested clinic routes show breadcrumb context and return to their parent', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/patients/patient-e2e');
  const header = page.locator('.atal-desktop-header');
  await expect(header).toBeVisible();
  await expect(header.locator('.atal-desktop-title')).toHaveText('Expediente');
  await expect(header.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/patients');
  await header.getByRole('link', { name: 'Pacientes' }).click();
  await expect(page).toHaveURL(/\/patients$/);

  await page.goto('/plans/new');
  await expect(header.locator('.atal-desktop-title')).toHaveText('Nuevo plan');
  await expect(header.getByRole('link', { name: 'Planes' })).toHaveAttribute('href', '/plans');
});

test('design changes preserve patient data and the mobile dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/patients');
  const before = await readStore(page);
  await expect(page.locator('.atal-sidebar')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Buscar en Atal' }).click();
  await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toHaveCount(0);
  const after = await readStore(page);
  expect(after.patients).toEqual(before.patients);
  expect(after.plans).toEqual(before.plans);
  expect(after.sessions).toEqual(before.sessions);
});
