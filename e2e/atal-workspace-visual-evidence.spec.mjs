import { expect, test } from '@playwright/test';
import { createState, seedBrowser } from './fixtures.mjs';

// Visual review evidence for the unmerged Phase 3A shell.
// Only synthetic fixtures; captured attachments are uploaded by the existing
// e2e workflow's playwright-evidence artifact, without altering the workflow.
const viewports = [
  { name: 'desktop-1440-patients', width: 1440, height: 900, route: '/patients', title: 'Pacientes' },
  { name: 'desktop-1366-record', width: 1366, height: 768, route: '/patients/patient-e2e', title: 'Expediente' },
  { name: 'desktop-1024-plans', width: 1024, height: 768, route: '/plans', title: 'Planes' },
  { name: 'mobile-390-patients', width: 390, height: 844, route: '/patients', title: 'Pacientes' },
];

for (const theme of ['light', 'dark']) {
  for (const target of viewports) {
    test(`Phase 3A visual: ${target.name} (${theme})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: target.width, height: target.height });
      await seedBrowser(page, { state: createState(), theme });
      await page.goto(target.route);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (target.width >= 1024) {
        await expect(page.locator('.atal-sidebar')).toBeVisible();
        await expect(page.locator('.atal-desktop-title')).toHaveText(target.title);
      } else {
        await expect(page.locator('.atal-sidebar')).toBeHidden();
        await expect(page.getByRole('navigation', { name: 'Navegación principal' }).last()).toBeVisible();
      }
      await testInfo.attach(`atal-${target.name}-${theme}.png`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });

      // A screenshot alone never certifies layout or accessibility.
      // This narrow automated gate catches unexpected horizontal overflow.
      const viewportOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(viewportOverflow, 'Unwanted document-level horizontal overflow').toBe(false);
    });
  }
}
