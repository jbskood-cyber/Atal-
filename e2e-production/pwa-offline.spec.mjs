import { expect, test } from '@playwright/test';

async function waitForServiceWorkerControl(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) {
      return Boolean(registration.active);
    }

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reject(new Error('Timed out waiting for the service worker to control the page'));
      }, 15_000);

      function onControllerChange() {
        window.clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve();
      }

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    });

    return Boolean(registration.active && navigator.serviceWorker.controller);
  });
}

test('fresh production install survives first offline reload and a deep-link navigation', async ({ page, context }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect.poll(() => waitForServiceWorkerControl(page)).toBe(true);

  const cacheEvidence = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shellCache = await caches.open('atal-shell-v2');
    const root = await shellCache.match('/');
    const manifest = await shellCache.match('/manifest.webmanifest');
    const cachedRequests = await shellCache.keys();

    return {
      keys,
      hasRoot: Boolean(root),
      hasManifest: Boolean(manifest),
      cachedUrls: cachedRequests.map((request) => new URL(request.url).pathname),
    };
  });

  expect(cacheEvidence.keys).toContain('atal-shell-v2');
  expect(cacheEvidence.hasRoot).toBe(true);
  expect(cacheEvidence.hasManifest).toBe(true);
  expect(cacheEvidence.cachedUrls.some((pathname) => pathname.startsWith('/assets/'))).toBe(true);

  await context.setOffline(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();

  await page.goto('/patients', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.locator('#root')).not.toBeEmpty();
});
