import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ruleBody = (source, marker) => {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing CSS rule: ${marker}`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  assert.ok(open > start && close > open, `Invalid CSS rule: ${marker}`);
  return source.slice(open + 1, close);
};

const main = read('src/main.tsx');
const conversation = read('src/features/atal-ai/AtalAIConversationScreen.tsx');
const draftCard = read('src/features/atal-ai/components/ConversationalDraftCard.tsx');
const composer = read('src/features/atal-ai/components/AIComposer.tsx');
const attachmentMenu = read('src/features/atal-ai/components/AttachmentMenu.tsx');
const css = read('src/styles/atal-ai-surgical-polish.css');

const polishImport = "import '@/src/styles/atal-ai-surgical-polish.css';";

test('loads the surgical polish stylesheet after the existing visual layers', () => {
  assert.match(main, /atal-ai-surgical-polish\.css/);
  assert.ok(main.lastIndexOf(polishImport) > main.lastIndexOf("atal-context-menu-fix.css"));
});

test('keeps home alert icon surfaces neutral while preserving semantic icon color', () => {
  const body = ruleBody(css, '.atal-home-v2 .atal-home-row .atal-home-row-icon');
  assert.match(body, /background:\s*var\(--surface\)\s*!important/);
  assert.match(body, /border-color:\s*var\(--surface\)\s*!important/);
  assert.doesNotMatch(body, /(?:^|;)\s*color\s*:/);
});

test('keeps the real draft in the visible flow without legacy composer clearance', () => {
  assert.match(conversation, /<ConversationalDraftCard/);
  assert.match(draftCard, /cardOpen\s*&&\s*<div className="atal-draft-sections"/);
  assert.match(draftCard, /cardOpen\s*&&\s*<footer/);

  const thread = ruleBody(css, '.atal-command-thread {');
  assert.match(thread, /display:\s*flex/);
  assert.match(thread, /flex-direction:\s*column/);
  assert.match(thread, /padding-bottom:\s*16px\s*!important/);
  assert.match(thread, /scroll-padding-bottom:\s*16px\s*!important/);

  const anchor = ruleBody(css, '.atal-command-thread > :first-child');
  assert.match(anchor, /margin-top:\s*auto/);

  const endAnchor = ruleBody(css, '.atal-command-thread > div:last-child');
  assert.match(endAnchor, /min-height:\s*0\s*!important/);
  assert.match(endAnchor, /scroll-margin-bottom:\s*0\s*!important/);

  const draft = ruleBody(css, '.atal-draft-card {');
  assert.match(draft, /scroll-margin-bottom:\s*8px\s*!important/);
  assert.doesNotMatch(css, /padding-bottom:\s*calc\(148px/);
});

test('automatically dismisses notices with an exit state while preserving manual close', () => {
  assert.match(conversation, /noticeLeaving/);
  assert.match(conversation, /window\.setTimeout/);
  assert.match(conversation, /is-leaving/);
  assert.match(conversation, /aria-label="Cerrar aviso"/);
  assert.match(css, /\.atal-command-toast\.is-leaving/);
});

test('uses stable official Atal controls without emerald pulse or glow', () => {
  assert.match(composer, /import \{ ArrowUp, Mic, Plus, Square \}/);
  assert.match(composer, /<ArrowUp strokeWidth=\{2\.4\}\/>/);
  assert.doesNotMatch(composer, /atal-command-send-glyph/);

  const controls = ruleBody(css, '.atal-command-composer .atal-command-dynamic.is-send,');
  assert.match(controls, /background:\s*var\(--atal-official-green\)\s*!important/);
  assert.match(controls, /border-color:\s*var\(--atal-official-green\)\s*!important/);
  assert.match(controls, /box-shadow:\s*none\s*!important/);
  assert.match(controls, /filter:\s*none\s*!important/);
  assert.match(controls, /animation:\s*none\s*!important/);

  const hover = ruleBody(css, '.atal-command-composer .atal-command-dynamic.is-processing:hover');
  assert.match(hover, /filter:\s*none\s*!important/);

  const sendIcon = ruleBody(css, '.atal-command-composer .atal-command-dynamic.is-send svg');
  assert.match(sendIcon, /width:\s*24px/);
  assert.match(sendIcon, /color:\s*#fff/);

  const stopIcon = ruleBody(css, '.atal-command-composer .atal-command-dynamic.is-processing svg');
  assert.match(stopIcon, /color:\s*#fff/);
  assert.match(stopIcon, /fill:\s*#fff/);
});

test('uses a compact attachment popover without redundant heading copy', () => {
  assert.doesNotMatch(attachmentMenu, /Agregar información/i);
  assert.doesNotMatch(attachmentMenu, /Adjuntar a Atal IA/);
  for (const action of ['Cámara', 'Fotos', 'Archivo', 'Escanear archivo']) {
    assert.match(attachmentMenu, new RegExp(action));
  }
  assert.match(css, /\.atal-ai-attachment-menu[^}]*width:\s*min\(280px/s);
  assert.match(css, /\.atal-ai-attachment-backdrop[^}]*backdrop-filter:\s*none/s);
});
