import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

// Visual QA evidence for profile tabs, clinical activity and report context.
// Every view contains synthetic fixtures only. No provider or Gemini calls.
const cases = [
  { id: 'record-desktop-light', route: '/patients/patient-e2e', width: 1366, height: 768, theme: 'light', tab: 'Métricas' },
  { id: 'record-mobile-dark', route: '/patients/patient-e2e', width: 390, height: 844, theme: 'dark', tab: 'Historial' },
  { id: 'activity-desktop-light', route: '/activity?view=reports&patientId=patient-e2e', width: 1440, height: 900, theme: 'light' },
  { id: 'activity-mobile-dark', route: '/activity?view=reports&patientId=patient-e2e', width: 390, height: 844, theme: 'dark' },
  { id: 'report-mobile-light', route: '/activity/session-e2e', width: 390, height: 844, theme: 'light' },
];
for (const target of cases) {
  test(`Phase 3B clinical context screenshot: ${target.id}`, async ({ page }, info) => {
    await page.setViewportSize({ width: target.width, height: target.height });
    await seedBrowser(page, { state: createState(), theme: target.theme });
    await page.goto(target.route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', target.theme);
    if (target.tab) {
      await page.getByRole('button', { name: target.tab, exact: true }).click();
      await expect(page.getByRole('button', { name: target.tab, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    if (target.route.startsWith('/activity?')) {
      await expect(page.getByRole('group', { name: 'Paciente seleccionado' })).toContainText('Paciente E2E');
      await expect(page.getByRole('button', { name: 'Reportes', exact: true }).last()).toHaveAttribute('aria-pressed', 'true');
    }
    if (target.route.endsWith('/session-e2e')) {
      await expect(page.getByRole('navigation', { name: 'Navegación del reporte clínico' })).toBeVisible();
    }
    const bounds = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(bounds.scroll, 'Clinical page horizontally overflows viewport').toBeLessThanOrEqual(bounds.width + 1);
    await info.attach(`atal-clinical-${target.id}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}
