import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main does not bootstrap the private workspace or import private styles', async () => {
  const source = await read('src/main.tsx');
  assert.doesNotMatch(source, /bootstrapRealWorkspace/);
  assert.doesNotMatch(source, /atal-ai\.css|commercial-closeout\.css|app\/globals\.css/);
});

test('root chooses the landing before importing the private application', async () => {
  const source = await read('src/routing/AtalRoot.tsx');
  assert.match(source, /lazy\(\(\) => import\('\.\.\/landing\/LandingPage'\)\)/);
  assert.match(source, /lazy\(\(\) => import\('\.\/PrivateAppEntry'\)\)/);
  assert.match(source, /window\.location\.pathname === '\/landing'/);
  assert.doesNotMatch(source, /atalStore|bootstrapRealWorkspace|ThemeProvider/);
});

test('private entry exclusively owns workspace bootstrap and private styles', async () => {
  const source = await read('src/routing/PrivateAppEntry.tsx');
  assert.match(source, /bootstrapRealWorkspace\(\)/);
  assert.match(source, /app\/globals\.css/);
  assert.match(source, /atal-final-polish-agent\.css/);
});

test('landing contains approved copy and no private runtime imports', async () => {
  const page = await read('src/landing/LandingPage.tsx');
  const content = await read('src/landing/content.ts');
  assert.match(content, /Del expediente al seguimiento, sin perder el hilo del paciente\./);
  assert.match(content, /Ver Atal en acción/);
  assert.match(content, /Conocer Atal IA/);
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
  assert.match(page, /id="flujo"/);
  assert.match(page, /id="atal-ia"/);
  assert.doesNotMatch(`${page}\n${content}`, /atalStore|useAtalStore|bootstrapRealWorkspace|Gemini|IndexedDB/);
  assert.doesNotMatch(`${page}\n${content}`, /Empieza gratis|precio|testimonio|lista de espera/i);
});
