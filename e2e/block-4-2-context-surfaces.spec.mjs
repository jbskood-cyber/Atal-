import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

const surfaces = [
  { path: '/patients/patient-e2e/clinical-record', label: 'en este expediente' },
  { path: '/plans/plan-active-e2e', label: 'en este plan' },
  { path: '/exercises/exercise-e2e', label: 'en este ejercicio' },
  { path: '/activity/session-e2e', label: 'en este reporte' },
];

async function seedMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
}

test.describe('Block 4.2 required contextual surfaces', () => {
  for (const surface of surfaces) {
    test(`${surface.label} opens shared workspace without changing route`, async ({ page }) => {
      await seedMobile(page);
      await page.goto(surface.path);
      const expectedUrl = page.url();
      await expect(page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` })).toBeVisible();
      await page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` }).click();
      await expect(page.getByRole('dialog', { name: `Asistente ${surface.label}` })).toBeVisible();
      expect(page.url()).toBe(expectedUrl);
      await expect(page.locator('.atal-mobile-dock')).toHaveCount(0);
      await expect(page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` })).toHaveCount(0);
    });
  }

  test('general lists and settings do not show a contextual orb', async ({ page }) => {
    await seedMobile(page);
    for (const path of ['/patients', '/plans', '/exercises', '/settings']) {
      await page.goto(path);
      await expect(page.locator('.atal-contextual-orb')).toHaveCount(0);
    }
  });
});
