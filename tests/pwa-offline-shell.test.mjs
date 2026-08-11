import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const serviceWorkerPath = new URL('../public/sw.js', import.meta.url);

test('service worker precaches the navigable app shell during install', async () => {
  const source = await readFile(serviceWorkerPath, 'utf8');

  assert.match(source, /addEventListener\(['"]install['"]/);
  assert.match(source, /event\.waitUntil\(/, 'install must keep the worker alive until shell caching finishes');
  assert.match(source, /fetch\(['"]\/['"]/, 'install must fetch the current production HTML shell');
  assert.match(source, /cache\.put\(['"]\/['"]/, 'install must persist the root navigation shell');
  assert.match(source, /cache\.addAll\(/, 'install must persist the assets referenced by the production shell');
});

test('service worker keeps API traffic outside Cache Storage', async () => {
  const source = await readFile(serviceWorkerPath, 'utf8');

  assert.match(source, /pathname\.startsWith\(['"]\/api\/['"]\)/);
});
