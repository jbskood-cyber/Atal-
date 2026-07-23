import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';

async function openPatient(page) {
  await seedBrowser(page, { state: createState() });
  await page.goto(patientPath);
  await expect(page.getByRole('heading', { name: 'Paciente E2E' })).toBeVisible();
}

test.describe('Block 4.2 contextual patient workspace', () => {
  test('closed state shows bottom navigation orb and compact patient actions', async ({ page }) => {
    await openPatient(page);
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar contacto con Atal IA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver progreso con Atal IA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toBeVisible();
  });

  test('opening keeps route and hides the complete navigation orb and exterior actions', async ({ page }) => {
    await openPatient(page);
    const before = new URL(page.url()).pathname;
    await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
    await expect(page.getByRole('dialog', { name: 'Asistente en este paciente' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(before);
    await expect(page.locator('.atal-mobile-dock')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Actualizar contacto con Atal IA' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver progreso con Atal IA' })).toHaveCount(0);
    await expect(page.locator('[data-contextual-ai-background]')).toHaveAttribute('inert', '');
  });

  test('minimize restores the exact route scroll navigation and contextual trigger', async ({ page }) => {
    await openPatient(page);
    await page.evaluate(() => window.scrollTo(0, Math.min(360, document.documentElement.scrollHeight - window.innerHeight)));
    const expectedScroll = await page.evaluate(() => window.scrollY);
    const expectedUrl = page.url();
    await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
    await page.getByRole('button', { name: 'Minimizar asistente' }).click();
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toBeFocused();
    expect(page.url()).toBe(expectedUrl);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(expectedScroll);
  });

  test('close restores the screen and reopening recovers the same contextual conversation', async ({ page }) => {
    await openPatient(page);
    await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
    const conversationId = await page.getByRole('dialog', { name: 'Asistente en este paciente' }).getAttribute('data-conversation-id');
    expect(conversationId).toBeTruthy();
    await page.getByRole('button', { name: 'Cerrar asistente' }).click();
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
    await expect(page.getByRole('dialog', { name: 'Asistente en este paciente' })).toHaveAttribute('data-conversation-id', conversationId);
  });
});
