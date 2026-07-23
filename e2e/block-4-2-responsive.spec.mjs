import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';

function collectFatalErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function seedAt(page, width, height, theme = 'light') {
  await page.setViewportSize({ width, height });
  await seedBrowser(page, { state: createState(), theme });
  await page.goto(patientPath);
  await expect(page.getByRole('heading', { name: 'Paciente E2E' })).toBeVisible();
}

async function expectNoPageOverflow(page) {
  await expect.poll(() => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))).toBeLessThanOrEqual(1);
}

async function openWorkspace(page) {
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  return page.getByRole('dialog', { name: 'Asistente en este paciente' });
}

test.describe('Block 4.2 responsive, theme and keyboard evidence', () => {
  for (const viewport of [
    { width: 360, height: 800, theme: 'light' },
    { width: 390, height: 844, theme: 'dark' },
    { width: 412, height: 915, theme: 'light' },
    { width: 430, height: 932, theme: 'dark' },
  ]) {
    test(`${viewport.width}x${viewport.height} ${viewport.theme} stays usable without page overflow`, async ({ page }, testInfo) => {
      const errors = collectFatalErrors(page);
      await seedAt(page, viewport.width, viewport.height, viewport.theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', viewport.theme);
      await expectNoPageOverflow(page);
      await testInfo.attach(`closed-${viewport.width}-${viewport.theme}`, { body: await page.screenshot(), contentType: 'image/png' });

      const workspace = await openWorkspace(page);
      await expectNoPageOverflow(page);
      await expect(workspace.getByLabel('Mensaje para Atal IA contextual')).toBeVisible();
      await expect(workspace.getByRole('button', { name: 'Grabar audio' })).toBeVisible();
      await expect(workspace.getByRole('button', { name: 'Enviar mensaje' })).toHaveCount(0);
      await workspace.getByLabel('Mensaje para Atal IA contextual').fill('Mensaje de prueba contextual');
      await expect(workspace.getByRole('button', { name: 'Enviar mensaje' })).toBeVisible();
      await expect(workspace.getByRole('button', { name: 'Grabar audio' })).toHaveCount(0);
      await testInfo.attach(`open-${viewport.width}-${viewport.theme}`, { body: await page.screenshot(), contentType: 'image/png' });
      expect(errors).toEqual([]);
    });
  }

  test('desktop uses the balanced conversation and draft workspace', async ({ page }, testInfo) => {
    const errors = collectFatalErrors(page);
    await seedAt(page, 1024, 768, 'light');
    const workspace = await openWorkspace(page);
    await expect(workspace.getByLabel('Conversación contextual')).toBeVisible();
    await expect(workspace.getByLabel('Borrador contextual')).toBeVisible();
    await expect(workspace.getByRole('navigation', { name: 'Vista del asistente' })).toBeHidden();
    await expectNoPageOverflow(page);
    await testInfo.attach('open-desktop-light', { body: await page.screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

  test('Escape minimizes the workspace and restores focus to the orb', async ({ page }) => {
    await seedAt(page, 390, 844, 'light');
    await openWorkspace(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Asistente en este paciente' })).toHaveCount(0);
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toBeFocused();
  });

  test('reduced motion disables the active-session pulse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedAt(page, 390, 844, 'light');
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Minimizar asistente' }).click();
    const indicator = page.locator('.atal-contextual-orb-status');
    await expect(indicator).toBeVisible();
    expect(await indicator.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  });
});
