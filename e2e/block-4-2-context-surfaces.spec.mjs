import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

const surfaces = [
  {
    path: '/patients/patient-e2e/clinical-record',
    label: 'en este expediente',
    attributes: { 'data-context-surface': 'clinical-record', 'data-patient-id': 'patient-e2e', 'data-record-id': 'record-e2e', 'data-plan-id': 'plan-active-e2e' },
  },
  {
    path: '/plans/plan-active-e2e',
    label: 'en este plan',
    attributes: { 'data-context-surface': 'plan', 'data-patient-id': 'patient-e2e', 'data-record-id': 'record-e2e', 'data-plan-id': 'plan-active-e2e' },
  },
  {
    path: '/exercises/exercise-e2e',
    label: 'en este ejercicio',
    attributes: { 'data-context-surface': 'exercise', 'data-patient-id': 'patient-e2e', 'data-plan-id': 'plan-active-e2e', 'data-exercise-id': 'exercise-e2e' },
  },
  {
    path: '/activity/session-e2e',
    label: 'en este reporte',
    attributes: { 'data-context-surface': 'report', 'data-patient-id': 'patient-e2e', 'data-plan-id': 'plan-active-e2e', 'data-session-id': 'session-e2e', 'data-report-id': 'session-e2e' },
  },
];

async function seedMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
}

test.describe('Block 4.2 required contextual surfaces', () => {
  for (const surface of surfaces) {
    test(`${surface.label} opens shared workspace with exact context and no navigation`, async ({ page }) => {
      await seedMobile(page);
      await page.goto(surface.path);
      const expectedUrl = page.url();
      await expect(page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` })).toBeVisible();
      await page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` }).click();
      const workspace = page.getByRole('dialog', { name: `Asistente ${surface.label}` });
      await expect(workspace).toBeVisible();
      expect(page.url()).toBe(expectedUrl);
      for (const [name, value] of Object.entries(surface.attributes)) await expect(workspace).toHaveAttribute(name, value);
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
