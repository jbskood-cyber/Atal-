import { expect, test } from '@playwright/test';

const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const landingTitle = 'Del expediente al seguimiento, sin perder el hilo del paciente.';

async function waitForLanding(page) {
  const heading = page.getByRole('heading', { level: 1, name: landingTitle });
  await expect(heading).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('landing renders approved story without initializing private workspace', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/landing');

  await waitForLanding(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(landingTitle);
  await expect(page.getByRole('link', { name: 'Ver Atal en acción' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Conocer Atal IA' })).toBeVisible();
  await expect(page.locator('#flujo li')).toHaveCount(6);
  await expect(page.locator('#atal-ia')).toContainText('Pídeselo como lo dirías en la clínica.');

  const privateState = await page.evaluate(() => localStorage.getItem('atal:store:v2'));
  expect(privateState).toBeNull();
});

test('trailing-slash landing URL remains public and does not initialize private workspace', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/landing/');

  await waitForLanding(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(landingTitle);

  const privateState = await page.evaluate(() => localStorage.getItem('atal:store:v2'));
  expect(privateState).toBeNull();
});

for (const viewport of viewports) {
  test(`landing has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/landing');
    await waitForLanding(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const screenshot = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
    });
    await testInfo.attach(`landing-${viewport.width}x${viewport.height}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  });
}

test('mobile menu supports keyboard open, Escape close and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/landing');
  await waitForLanding(page);

  const trigger = page.getByRole('button', { name: 'Menú', exact: true });
  const primaryNavigation = page.getByRole('navigation', { name: 'Navegación principal' });
  const firstMenuLink = primaryNavigation.getByRole('link', { name: 'Producto' });

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(firstMenuLink).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('CTA anchors reach the approved workflow and Atal IA sections', async ({ page }) => {
  await page.goto('/landing');
  await waitForLanding(page);
  await page.getByRole('link', { name: 'Ver Atal en acción' }).first().click();
  await expect(page).toHaveURL(/#flujo$/);
  await page.getByRole('link', { name: 'Conocer Atal IA' }).click();
  await expect(page).toHaveURL(/#atal-ia$/);
});

test('reduced motion keeps the complete story while removing long transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/landing');
  await waitForLanding(page);

  await expect(page.locator('#flujo li')).toHaveCount(6);
  await expect(page.locator('#atal-ia')).toBeVisible();

  const trigger = page.getByRole('button', { name: 'Menú', exact: true });
  const transitionDuration = await trigger.evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration).not.toMatch(/(^|,\s*)[1-9]\d*(\.\d+)?s/);
});
