import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-production',
  testMatch: '**/pwa-offline.spec.mjs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report-pwa', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report-pwa', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-pwa-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
