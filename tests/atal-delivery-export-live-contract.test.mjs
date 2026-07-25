import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const catalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');
const selection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');

test('data.export_local exposes the canonical exportType input used by the public agent contract', () => {
  const { agentToolCatalogByName } = catalog();
  const tool = agentToolCatalogByName.get('data.export_local');
  assert.ok(tool);
  assert.deepEqual(Object.keys(tool.inputSchema.properties), ['exportType']);
  assert.deepEqual(tool.inputSchema.required, ['exportType']);
  assert.deepEqual(tool.inputSchema.properties.exportType.enum, ['patients', 'progress', 'plans', 'backup']);
});

test('export_data intent exposes only data.export_local plus read helpers', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Exporta un respaldo local completo de Atal. Hazlo ahora.',
    route: '/assistant',
    intent: 'export_data',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'data.export_local']);
});

test('open delivery request exposes delivery.open without unrelated delivery actions', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Abre la entrega de este plan.',
    route: '/plans/plan-e2e',
    intent: 'update_existing_plan',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'delivery.open']);
});

test('download delivery request exposes delivery.action without plan mutation tools', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Descarga la entrega de este plan. Hazlo ahora.',
    route: '/plans/plan-e2e',
    intent: 'update_existing_plan',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'delivery.action']);
});
