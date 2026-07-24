import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const formatting = () => loadCore('src/features/atal-ai/core/agentic/messageFormatting.js');

test('assistant text is split into paragraphs, headings and lists without HTML', () => {
  const blocks = formatting().parseAssistantMessage('## Resumen\n\nEl paciente mejoró.\n\n- Dolor menor\n- Mejor movilidad');
  assert.deepEqual(blocks, [
    { type: 'heading', level: 2, text: 'Resumen' },
    { type: 'paragraph', text: 'El paciente mejoró.' },
    { type: 'list', ordered: false, items: ['Dolor menor', 'Mejor movilidad'] },
  ]);
});

test('numbered steps stay ordered and unsafe html remains plain text', () => {
  const blocks = formatting().parseAssistantMessage('1. Revisar expediente\n2. Confirmar plan\n\n<script>alert(1)</script>');
  assert.deepEqual(blocks, [
    { type: 'list', ordered: true, items: ['Revisar expediente', 'Confirmar plan'] },
    { type: 'paragraph', text: '<script>alert(1)</script>' },
  ]);
});
