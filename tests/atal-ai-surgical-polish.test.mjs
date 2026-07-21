import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const main = read('src/main.tsx');
const conversation = read('src/features/atal-ai/AtalAIConversationScreen.tsx');
const draftCard = read('src/features/atal-ai/components/ConversationalDraftCard.tsx');
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

test('anchors a collapsed draft above the composer and keeps the expanded draft complete', () => {
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(conversation, /<ConversationalDraftCard/);
  assert.match(css, /\.atal-command-thread\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /flex-direction:\s*column/);
  assert.match(css, /\.atal-command-thread\s*>\s*:first-child\s*\{[^}]*margin-top:\s*auto/s);
  assert.doesNotMatch(css, /\.atal-command-thread::before/);
  assert.match(draftCard, /ref=\{cardRef\}/);
  assert.match(draftCard, /scrollIntoView\(\{behavior:'smooth',block:'end'\}\)/);
  assert.match(draftCard, /cardOpen\s*&&\s*<div className="atal-draft-sections"/);
  assert.match(draftCard, /cardOpen\s*&&\s*<footer/);
  assert.match(draftCard, /is-expanded/);
  assert.match(draftCard, /is-collapsed/);
});

test('automatically dismisses notices with an exit state while preserving manual close', () => {
  assert.match(conversation, /noticeLeaving/);
  assert.match(conversation, /window\.setTimeout/);
  assert.match(conversation, /is-leaving/);
  assert.match(conversation, /aria-label="Cerrar aviso"/);
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(css, /\.atal-command-toast\.is-leaving/);
});

test('uses a refined white ArrowUp icon and the official Atal green for send and processing', () => {
  const css = read('src/styles/atal-ai-surgical-polish.css');
  assert.match(composer, /import \{ ArrowUp, Mic, Plus, Square \}/);
  assert.match(composer, /<ArrowUp strokeWidth=\{2\.4\}\/>/);
  assert.doesNotMatch(composer, /atal-command-send-glyph/);
  assert.doesNotMatch(composer, />↑<\/span>/);
  assert.match(css, /\.atal-command-dynamic\.is-send\s*\{[^}]*background:\s*var\(--green\)/s);
  assert.match(css, /\.atal-command-dynamic\.is-processing\s*\{[^}]*background:\s*var\(--green\)/s);
  assert.match(css, /\.atal-command-dynamic\.is-send\s+svg\s*\{[^}]*width:\s*24px/s);
  assert.match(css, /\.atal-command-dynamic\.is-processing\s+svg\s*\{[^}]*color:\s*#fff/s);
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