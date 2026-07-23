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

const closedLauncherSurfaces = [
  { path: '/patients/patient-e2e', label: 'en este paciente', evidenceName: 'launcher-patient' },
  { path: '/patients/patient-e2e/clinical-record', label: 'en este expediente', evidenceName: 'launcher-clinical-record' },
  { path: '/plans/plan-active-e2e', label: 'en este plan', evidenceName: 'launcher-plan' },
  { path: '/exercises/exercise-e2e', label: 'en este ejercicio', evidenceName: 'launcher-exercise' },
];

async function seedMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
}

async function launcherBottomGap(page) {
  const launcher = page.locator('.atal-contextual-launcher');
  await expect(launcher).toBeVisible();
  const box = await launcher.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  return 844 - (box.y + box.height);
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

  test('patient record plan and exercise use the report launcher anchor without requiring scroll', async ({ page }, testInfo) => {
    await seedMobile(page);
    await page.goto('/activity/session-e2e');
    const reportGap = await launcherBottomGap(page);
    await testInfo.attach('launcher-report-reference', { body: await page.screenshot(), contentType: 'image/png' });

    for (const surface of closedLauncherSurfaces) {
      await page.goto(surface.path);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.getByRole('button', { name: `Abrir Atal IA ${surface.label}` })).toBeVisible();
      const gap = await launcherBottomGap(page);
      expect(Math.abs(gap - reportGap), `${surface.label} must use the report launcher anchor`).toBeLessThanOrEqual(4);
      await testInfo.attach(surface.evidenceName, { body: await page.screenshot(), contentType: 'image/png' });
    }
  });

  test('general lists and settings do not show a contextual orb', async ({ page }) => {
    await seedMobile(page);
    for (const path of ['/patients', '/plans', '/exercises', '/settings']) {
      await page.goto(path);
      await expect(page.locator('.atal-contextual-orb')).toHaveCount(0);
    }
  });
});
