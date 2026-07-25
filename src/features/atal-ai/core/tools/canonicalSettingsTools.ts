import type { AppSettings } from '../../../../data/atalStore';
import { applyUpdateSettings } from '../../../../domain/actions/settingsActions';
import { coreError, type ToolDefinition } from '../contracts';

const preferenceKeys = new Set<keyof AppSettings>([
  'notifications', 'haptics', 'compact', 'sessionLock', 'clinicalPrivacy', 'aiSuggestions', 'aiAlerts', 'aiInstructions',
]);

const profileKeys = new Set<keyof AppSettings>(['professionalName', 'specialty', 'clinic']);

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function preferencePatch(input: unknown): Partial<AppSettings> & Record<string, unknown> {
  const value = objectInput(input, 'Los cambios de ajustes no son válidos.');
  const patchValue = objectInput(value.patch, 'No se indicaron ajustes para cambiar.');
  const entries = Object.entries(patchValue);
  if (!entries.length) throw coreError('CORE_INPUT_INVALID', 'No se indicaron ajustes para cambiar.');

  const patch: Partial<AppSettings> & Record<string, unknown> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey as keyof AppSettings;
    if (!preferenceKeys.has(key)) throw coreError('CORE_INPUT_INVALID', `El ajuste ${rawKey} no está permitido en esta acción.`);
    if (key === 'aiInstructions') {
      if (typeof rawValue !== 'string') throw coreError('CORE_INPUT_INVALID', 'Las instrucciones de Atal deben ser texto.');
      patch.aiInstructions = rawValue;
      continue;
    }
    if (typeof rawValue !== 'boolean') throw coreError('CORE_INPUT_INVALID', `El ajuste ${rawKey} debe ser verdadero o falso.`);
    (patch as Record<string, unknown>)[rawKey] = rawValue;
  }
  return patch;
}

function profilePatch(input: unknown): Partial<AppSettings> & Record<string, unknown> {
  const value = objectInput(input, 'Los datos del perfil profesional no son válidos.');
  const profile = value.profile === undefined
    ? value
    : objectInput(value.profile, 'No se indicaron cambios para el perfil profesional.');
  const entries = Object.entries(profile);
  if (!entries.length) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el perfil profesional.');

  const patch: Partial<AppSettings> & Record<string, unknown> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey as keyof AppSettings;
    if (!profileKeys.has(key)) throw coreError('CORE_INPUT_INVALID', `El campo ${rawKey} no pertenece al perfil profesional.`);
    if (typeof rawValue !== 'string') throw coreError('CORE_INPUT_INVALID', `El campo ${rawKey} debe ser texto.`);
    (patch as Record<string, unknown>)[rawKey] = rawValue;
  }
  return patch;
}

export const canonicalSettingsToolNames = new Set(['settings.update', 'settings.profile_update']);

export const canonicalSettingsTools: ToolDefinition<any>[] = [
  {
    name: 'settings.update',
    version: 1,
    description: 'Actualiza preferencias locales de Atal.',
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['settings'],
    validateInput(input) {
      return { patch: preferencePatch(input) };
    },
    preconditions() {},
    execute(environment, input) {
      const result = applyUpdateSettings(environment.state, { patch: input.patch });
      return {
        status: 'success',
        message: 'Preferencias de Atal actualizadas.',
        summary: [`Ajustes actualizados: ${result.changedFields.join(', ')}.`],
        href: '/settings',
        affected: [{ type: 'settings', id: 'settings' }],
      };
    },
  },
  {
    name: 'settings.profile_update',
    version: 1,
    description: 'Actualiza el perfil profesional local del fisioterapeuta.',
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['settings'],
    validateInput(input) {
      return { patch: profilePatch(input) };
    },
    preconditions() {},
    execute(environment, input) {
      const result = applyUpdateSettings(environment.state, { patch: input.patch });
      return {
        status: 'success',
        message: 'Perfil profesional actualizado.',
        summary: [`Perfil actualizado: ${result.changedFields.join(', ')}.`],
        href: '/settings/profile',
        affected: [{ type: 'settings', id: 'settings' }],
      };
    },
  },
];
