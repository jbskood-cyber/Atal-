import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const catalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');
const selection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');
const preferenceSelection = () => loadCore('src/features/atal-ai/core/agentic/settingsPreferenceSelection.js');

test('settings.update exposes the exact canonical preference keys to Gemini', () => {
  const { agentToolCatalogByName } = catalog();
  const tool = agentToolCatalogByName.get('settings.update');
  assert.ok(tool);
  const patch = tool.inputSchema.properties.patch;
  assert.equal(patch.type, 'object');
  assert.equal(patch.additionalProperties, false);
  assert.deepEqual(Object.keys(patch.properties).sort(), [
    'aiAlerts',
    'aiInstructions',
    'aiSuggestions',
    'clinicalPrivacy',
    'compact',
    'haptics',
    'notifications',
    'sessionLock',
  ]);
  assert.equal(patch.properties.haptics.type, 'boolean');
  assert.equal(patch.properties.aiSuggestions.type, 'boolean');
});

test('combined natural preference request resolves the exact canonical settings keys', () => {
  const { selectSettingsPreferenceKeys } = preferenceSelection();
  assert.deepEqual(
    selectSettingsPreferenceKeys('Activa la vibración y desactiva las sugerencias de IA. Hazlo ahora.'),
    ['haptics', 'aiSuggestions'],
  );
});

test('natural preference request exposes only settings.update plus read helpers', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Activa la vibración y desactiva las sugerencias de IA. Hazlo ahora.',
    route: '/assistant',
    intent: 'update_settings',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'settings.update']);
});

test('professional profile request exposes only settings.profile_update plus read helpers', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Actualiza mi perfil profesional: nombre Dra. Ana, especialidad deportiva y clínica Norte. Hazlo ahora.',
    route: '/assistant',
    intent: 'update_settings',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'settings.profile_update']);
});

test('appearance request exposes only settings.appearance plus read helpers', () => {
  const { selectAgentTools } = selection();
  const tools = selectAgentTools({
    text: 'Cambia la apariencia de Atal a modo oscuro. Hazlo ahora.',
    route: '/assistant',
    intent: 'update_settings',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.deepEqual(tools, ['app.read', 'patient.search', 'settings.appearance']);
});
