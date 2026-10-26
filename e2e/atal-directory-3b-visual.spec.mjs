import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

// Evidence for Phase 3B directory screens. Captures use only fictional E2E
// records, and are included in the existing CI playwright-evidence artifact.
const cases = [
  { id: 'patients-desktop-light', route: '/patients', theme: 'light', width: 1440, height: 900, scenario: 'patients-list' },
  { id: 'patients-mobile-dark', route: '/patients', theme: 'dark', width: 390, height: 844, scenario: 'patients-empty' },
  { id: 'plans-desktop-dark', route: '/plans', theme: 'dark', width: 1366, height: 768, scenario: 'plans-drafts' },
  { id: 'plans-mobile-light', route: '/plans', theme: 'light', width: 390, height: 844, scenario: 'plans-empty' },
];

for (const scenario of cases) {
  test(`Phase 3B visual: ${scenario.id}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    const state = createState();
    state.patients.push({
      ...structuredClone(state.patients[0]),
      id: 'patient-archived-3b',
      name: 'Marina Ejemplo 3B',
      status: 'archived',
    });
    await seedBrowser(page, { state, theme: scenario.theme });
    await page.goto(scenario.route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scenario.theme);

    if (scenario.scenario === 'patients-list') {
      await page.getByRole('button', { name: 'Archivados' }).click();
      await expect(page.locator('.atal-dense-row')).toHaveCount(1);
    } else if (scenario.scenario === 'patients-empty') {
      await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('no encontrado QA');
      await expect(page.locator('.atal-directory-empty')).toBeVisible();
    } else if (scenario.scenario === 'plans-drafts') {
      await page.getByRole('button', { name: /Borradores/ }).click();
      await expect(page.locator('.atal-plan-row')).toHaveCount(1);
    } else {
      await page.getByRole('textbox', { name: 'Buscar planes' }).fill('no encontrado QA');
      await expect(page.locator('.atal-directory-empty')).toBeVisible();
    }

    await testInfo.attach(`atal-3b-${scenario.id}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, 'No horizontal overflow for clinical directory').toBe(false);
  });
}
