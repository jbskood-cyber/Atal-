import type { AppSettings, AtalState } from '../../data/atalStore';

const BOOLEAN_KEYS = new Set<keyof AppSettings>([
  'notifications', 'haptics', 'compact', 'sessionLock', 'clinicalPrivacy', 'aiSuggestions', 'aiAlerts',
]);

const STRING_LIMITS: Partial<Record<keyof AppSettings, number>> = {
  professionalName: 180,
  specialty: 180,
  clinic: 300,
};

const STRING_KEYS = new Set<keyof AppSettings>([
  'professionalName', 'specialty', 'clinic', 'aiInstructions',
]);

const ALLOWED_KEYS = new Set<keyof AppSettings>([
  ...BOOLEAN_KEYS,
  ...STRING_KEYS,
]);

export type UpdateSettingsActionInput = {
  patch: Partial<AppSettings> & Record<string, unknown>;
};

export type UpdateSettingsActionResult = {
  settings: AppSettings;
  changedFields: Array<keyof AppSettings>;
};

export function applyUpdateSettings(state: AtalState, input: UpdateSettingsActionInput): UpdateSettingsActionResult {
  const patch = input.patch;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('El cambio de ajustes no es válido.');

  const entries = Object.entries(patch);
  if (!entries.length) throw new Error('No hay ajustes para cambiar.');

  const normalized: Partial<AppSettings> = {};
  for (const [rawKey, value] of entries) {
    const key = rawKey as keyof AppSettings;
    if (!ALLOWED_KEYS.has(key)) throw new Error(`El ajuste ${rawKey} no está permitido.`);

    if (BOOLEAN_KEYS.has(key)) {
      if (typeof value !== 'boolean') throw new Error(`El valor de ${rawKey} no es válido.`);
      (normalized as Record<string, unknown>)[key] = value;
      continue;
    }

    if (typeof value !== 'string') throw new Error(`El valor de ${rawKey} no es válido.`);
    const text = value.trim();
    const max = STRING_LIMITS[key];
    if (max !== undefined && text.length > max) throw new Error(`El ajuste ${rawKey} supera ${max} caracteres.`);
    (normalized as Record<string, unknown>)[key] = text;
  }

  state.settings = { ...state.settings, ...normalized };
  return { settings: state.settings, changedFields: Object.keys(normalized) as Array<keyof AppSettings> };
}
