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
  const mobile = await read('src/landing/components/MobileProductEvidence.tsx');
  const trust = await read('src/landing/components/TrustLedger.tsx');
  const publicSource = `${page}\n${content}\n${mobile}\n${trust}`;

  assert.match(content, /Del expediente al seguimiento, sin perder el hilo del paciente\./);
  assert.match(content, /Ver Atal en acción/);
  assert.match(content, /Conocer Atal IA/);
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
  assert.match(page, /id="flujo"/);
  assert.match(page, /id="atal-ia"/);
  assert.match(mobile, /id="movil"/);
  assert.match(trust, /id="confianza"/);
  assert.match(page, /<AtiSlot/);
  assert.match(page, /MobileProductEvidence/);
  assert.match(page, /TrustLedger/);
  assert.doesNotMatch(publicSource, /atalStore|useAtalStore|bootstrapRealWorkspace|Gemini|IndexedDB/);
  assert.doesNotMatch(publicSource, /Empieza gratis|precio|testimonio|lista de espera/i);
});

test('Ati slot stays hidden without an approved persistent asset', async () => {
  const source = await read('src/landing/components/AtiSlot.tsx');
  assert.match(source, /assetUrl\?: string/);
  assert.match(source, /if \(!assetUrl\) return null/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /decoding="async"/);
});

test('public evidence components remain static and private-store free', async () => {
  const mobile = await read('src/landing/components/MobileProductEvidence.tsx');
  const trust = await read('src/landing/components/TrustLedger.tsx');
  const combined = `${mobile}\n${trust}`;
  assert.match(mobile, /Sesión guiada/);
  assert.match(trust, /Cambios revisables/);
  assert.match(trust, /Deshacer/);
  assert.doesNotMatch(combined, /useAtalStore|atalStore|bootstrapRealWorkspace|Gemini|IndexedDB/);
});
