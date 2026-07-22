import type { AppSettings } from '@/src/data/atalStore';
import { coreError, type ToolDefinition } from '../contracts';

const ALLOWED = new Set<keyof AppSettings>([
  'notifications', 'haptics', 'compact', 'sessionLock', 'clinicalPrivacy',
  'aiSuggestions', 'aiAlerts', 'aiInstructions',
]);

export const settingsTools: ToolDefinition[] = [{
  name: 'settings.update',
  version: 1,
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['settings'],
  validateInput(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', 'Los ajustes no son válidos.');
    const patch = (input as Record<string, unknown>).patch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw coreError('CORE_INPUT_INVALID', 'Falta el cambio de ajustes.');
    const entries = Object.entries(patch as Record<string, unknown>);
    if (!entries.length) throw coreError('CORE_INPUT_INVALID', 'No hay ajustes para cambiar.');
    for (const [key, value] of entries) {
      if (!ALLOWED.has(key as keyof AppSettings)) throw coreError('CORE_INPUT_INVALID', `El ajuste ${key} no está permitido.`);
      if (key === 'aiInstructions' ? typeof value !== 'string' : typeof value !== 'boolean') {
        throw coreError('CORE_INPUT_INVALID', `El valor de ${key} no es válido.`);
      }
    }
    return { patch: Object.fromEntries(entries) as Partial<AppSettings> };
  },
  preconditions() {},
  execute(environment, input) {
    const { patch } = input as { patch: Partial<AppSettings> };
    environment.state.settings = { ...environment.state.settings, ...patch };
    return {
      status: 'success',
      message: 'Preferencias de Atal actualizadas.',
      summary: [`Ajustes actualizados: ${Object.keys(patch).join(', ')}.`],
      href: '/settings',
      affected: [{ type: 'settings', id: 'settings' }],
    };
  },
}];
