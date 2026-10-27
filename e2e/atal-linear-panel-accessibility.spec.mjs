import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('patient quick peek traps Tab, closes with Escape and restores its row action', async ({ page }) => {
  const original = createState();
  await seedBrowser(page, { state: original, theme: 'dark' });
  await page.goto('/patients');

  const trigger = page.getByRole('button', { name: 'Vista rápida de Paciente E2E' });
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Vista rápida: Paciente E2E' });
  const close = modal.getByRole('button', { name: 'Cerrar vista rápida' });
  const back = modal.getByRole('button', { name: 'Volver sin perder filtros' });
  await expect(close).toBeFocused();
  await close.press('Shift+Tab');
  await expect(back).toBeFocused();
  await back.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect((await readStore(page)).patients).toEqual(original.patients);
});

test('command search traps focus inside modal and returns to the original search button', async ({ page }) => {
  await seedBrowser(page, { state: createState() });
  await page.goto('/');
  const opener = page.locator('.atal-desktop-search');
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await expect(dialog).toBeVisible();

  const close = dialog.getByRole('button', { name: 'Cerrar', exact: true });
  const last = dialog.getByRole('link', { name: /Atal IA/ });
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('Escape from nested search preview returns to exactly the result, not outside search', async ({ page }) => {
  const original = createState();
  await seedBrowser(page, { state: original });
  await page.goto('/');
  const opener = page.locator('.atal-desktop-search');
  await opener.click();
  const search = page.getByRole('dialog', { name: 'Buscar en Atal' });
  await search.getByRole('button', { name: 'Pacientes', exact: true }).click();
  const input = search.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' });
  await input.fill('Paciente E2E');
  const trigger = search.getByRole('button', { name: 'Vista rápida de Paciente E2E' });
  await trigger.click();
  await expect(search.getByRole('region', { name: 'Vista rápida: Paciente E2E' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toBeVisible();
  await expect(input).toHaveValue('Paciente E2E');
  await expect(search.getByRole('button', { name: 'Pacientes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(trigger).toBeFocused();
  await expect(search.locator('a[href="/patients/patient-e2e"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect((await readStore(page)).patients).toEqual(original.patients);
});

test('mobile peek has 44px touch actions, a drag handle and locked background scroll', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = createState();
  await seedBrowser(page, { state: original, theme: 'dark' });
  await page.goto('/patients');
  await page.getByRole('button', { name: 'Vista rápida de Paciente E2E' }).click();
  const dialog = page.getByRole('dialog', { name: 'Vista rápida: Paciente E2E' });
  const sizes = await page.evaluate(() => {
    const peek = document.querySelector('.atal-clinical-peek');
    const buttons = peek ? [...peek.querySelectorAll('button')] : [];
    const rect = (node) => node?.getBoundingClientRect();
    return {
      backgroundLocked: document.body.style.overflow === 'hidden',
      handle: rect(peek?.querySelector('.atal-clinical-peek__drag-handle')),
      buttons: buttons.map((button) => ({ label: button.textContent?.trim(), height: rect(button).height })),
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
    };
  });
  expect(sizes.backgroundLocked).toBe(true);
  expect(sizes.handle.height).toBeGreaterThan(0);
  expect(sizes.buttons.every((button) => button.height >= 43.5)).toBe(true);
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.viewport + 1);
  await info.attach('atal-3b-accessible-mobile-peek.png', {
    body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png',
  });

  await page.locator('.atal-clinical-peek__drag-handle').evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientY: 150 });
    const end = new Touch({ identifier: 1, target: element, clientY: 260 });
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [end] }));
  });
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect((await readStore(page)).patients).toEqual(original.patients);
});
