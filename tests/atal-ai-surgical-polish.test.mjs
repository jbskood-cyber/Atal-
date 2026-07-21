import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const main = read('src/main.tsx');
const conversation = read('src/features/atal-ai/AtalAIConversationScreen.tsx');
const composer = read('src/features/atal-ai/components/AIComposer.tsx');
const attachmentMenu = read('src/features/atal-ai/components/AttachmentMenu.tsx');

const polishImport = "import '@/src/styles/atal-ai-surgical-polish.css';";

test('loads the surgical polish stylesheet after the existing visual layers', () => {
  assert.match(main, /atal-ai-surgical-polish\.css/);
  assert.ok(main.lastIndexOf(polishImport) > main.lastIndexOf("atal-context-menu-fix.css"));
});

test('keeps home alert icon surfaces neutral while preserving semantic icon color', () => {
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(css, /\.atal-home-row-icon/);
  assert.match(css, /background:\s*var\(--surface\)\s*!important/);
  assert.match(css, /border-color:\s*var\(--surface\)\s*!important/);
  assert.doesNotMatch(css, /\.atal-home-row-icon[^}]*color:/s);
});

test('anchors short command-center content above the composer without a ghost gap', () => {
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(css, /\.atal-command-thread[^}]*display:\s*grid/s);
  assert.match(css, /align-content:\s*safe end/);
});

test('automatically dismisses notices with an exit state while preserving manual close', () => {
  assert.match(conversation, /noticeLeaving/);
  assert.match(conversation, /window\.setTimeout/);
  assert.match(conversation, /is-leaving/);
  assert.match(conversation, /aria-label="Cerrar aviso"/);
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(css, /\.atal-command-toast\.is-leaving/);
});

test('shows an upward arrow when the composer has content', () => {
  assert.match(composer, /ArrowUp/);
  assert.match(composer, /is-send/);
  assert.doesNotMatch(composer, /\bSend\b/);
});

test('uses a compact attachment popover without redundant heading copy', () => {
  assert.doesNotMatch(attachmentMenu, /Agregar información/i);
  assert.doesNotMatch(attachmentMenu, /Adjuntar a Atal IA/);
  for (const action of ['Cámara', 'Fotos', 'Archivo', 'Escanear archivo']) {
    assert.match(attachmentMenu, new RegExp(action));
  }
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(css, /\.atal-ai-attachment-menu[^}]*width:\s*min\(280px/);
  assert.match(css, /\.atal-ai-attachment-backdrop[^}]*backdrop-filter:\s*none/);
});
