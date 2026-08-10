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
  assert.match(source, /isLandingPath\(window\.location\.pathname\)/);
  assert.doesNotMatch(source, /atalStore|bootstrapRealWorkspace|ThemeProvider/);
});

test('public route matcher keeps canonical and trailing-slash landing URLs isolated', async () => {
  const source = await read('src/routing/AtalRoot.tsx');
  assert.match(source, /function isLandingPath\(pathname: string\)/);
  assert.ok(source.includes("pathname.replace(/\\/+$/, '')"));
  assert.match(source, /normalizedPath === '\/landing'/);
});

test('private entry exclusively owns workspace bootstrap and private styles', async () => {
  const source = await read('src/routing/PrivateAppEntry.tsx');
  assert.match(source, /bootstrapRealWorkspace\(\)/);
  assert.match(source, /app\/globals\.css/);
  assert.match(source, /atal-final-polish-agent\.css/);
});

test('landing follows the approved product-led direction and stays private-runtime free', async () => {
  const page = await read('src/landing/LandingPage.tsx');
  const content = await read('src/landing/content.ts');
  const styles = `${await read('src/landing/landing.css')}\n${await read('src/landing/evidence.css')}`;
  const mobile = await read('src/landing/components/MobileProductEvidence.tsx');
  const trust = await read('src/landing/components/TrustLedger.tsx');
  const publicSource = `${page}\n${content}\n${mobile}\n${trust}`;

  assert.match(content, /Tu práctica clínica, conectada de principio a fin\./);
  assert.match(content, /Ver cómo funciona/);
  assert.match(content, /Explorar el flujo clínico/);
  assert.match(content, /Conocer Atal IA/);
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
  assert.match(page, /id="flujo"/);
  assert.match(page, /id="atal-ia"/);
  assert.match(publicSource, /Pacientes/);
  assert.match(publicSource, /Expedientes/);
  assert.match(publicSource, /Planes/);
  assert.match(publicSource, /Ejercicios/);
  assert.match(publicSource, /Sesiones/);
  assert.match(publicSource, /Reportes/);
  assert.match(mobile, /id="movil"/);
  assert.match(trust, /id="confianza"/);
  assert.match(page, /<AtiSlot/);
  assert.doesNotMatch(styles, /--landing-blue|#2563eb|#173b72|#101827/);
  assert.match(styles, /--landing-mint/);
  assert.match(styles, /--landing-ink/);
  assert.match(styles, /--landing-green:\s*#16a36a/i);
  assert.match(styles, /--landing-green-dark:\s*#0d7d51/i);
  assert.match(styles, /--landing-mint-soft:\s*#e8f5ef/i);
  assert.match(styles, /--landing-ink:\s*#0f1416/i);
  assert.match(styles, /--landing-muted:\s*#6c7771/i);
  assert.match(styles, /--landing-border:\s*#e2e8e5/i);
  assert.doesNotMatch(publicSource, /atalStore|useAtalStore|bootstrapRealWorkspace|Gemini|IndexedDB/);
  assert.doesNotMatch(publicSource, /Empieza gratis|Comenzar gratis|precio|testimonio|cientos de|lista de espera|iniciar sesión|solicitar demo/i);
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
