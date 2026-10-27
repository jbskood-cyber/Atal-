import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('command palette shows instant destinations and supports arrow-key selection', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/');
  await page.locator('.atal-desktop-search').click();
  const panel = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Ir rápidamente a…')).toBeVisible();
  for (const name of ['Inicio', 'Pacientes', 'Planes', 'Actividad', 'Ejercicios', 'Atal IA']) {
    await expect(panel.getByRole('link', { name: new RegExp(name) })).toBeVisible();
  }
  await panel.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' }).press('ArrowDown');
  await panel.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' }).press('ArrowDown');
  await expect(panel.getByRole('link', { name: /Planes/ })).toHaveClass(/is-keyboard-selected/);
  await panel.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' }).press('Enter');
  await expect(page).toHaveURL(/\/plans$/);
  expect((await readStore(page)).patients).toEqual(state.patients);
});

test('command palette preserves typed multientity search and category filters', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.goto('/patients');
  await page.locator('.atal-desktop-search').click();
  const panel = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await panel.getByRole('button', { name: 'Pacientes' }).click();
  const input = panel.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' });
  await input.fill('Paciente E2E');
  await expect(panel.getByRole('link', { name: /Paciente E2E/ })).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/\/patients\/patient-e2e$/);
});

test('mobile dock yields to a clinical observation editor and returns on blur', async ({ page }) => {
  const state = createState();
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state, theme: 'dark' });
  await page.goto('/activity/session-e2e');
  const dock = page.locator('.atal-mobile-dock');
  await expect(dock).toBeVisible();
  const input = page.getByPlaceholder('Escribe una observación clínica…');
  await input.focus();
  await expect(dock).toHaveClass(/is-editing/);
  await expect(dock).toBeHidden();
  await page.getByRole('heading', { name: 'Resumen real de la sesión' }).click();
  await expect(dock).not.toHaveClass(/is-editing/);
  await expect(dock).toBeVisible();
  expect((await readStore(page)).sessions).toEqual(state.sessions);
});

test('visual QA: keyboard command surface remains accessible on desktop', async ({ page }, info) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seedBrowser(page, { state: createState(), theme: 'dark' });
  await page.goto('/');
  await page.locator('.atal-desktop-search').click();
  await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toBeVisible();
  await info.attach('atal-linear-command-dark-desktop.png', {
    body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
