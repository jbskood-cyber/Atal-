export type SettingsPreferenceKey =
  | 'notifications'
  | 'haptics'
  | 'compact'
  | 'sessionLock'
  | 'clinicalPrivacy'
  | 'aiSuggestions'
  | 'aiAlerts'
  | 'aiInstructions';

const TERMS: Array<[SettingsPreferenceKey, string[]]> = [
  ['haptics', ['vibración', 'vibracion', 'háptica', 'haptica', 'haptics']],
  ['aiSuggestions', ['sugerencias de ia', 'sugerencias ia', 'sugerencia de ia', 'sugerencia ia']],
  ['aiAlerts', ['alertas de ia', 'alertas ia', 'alerta de ia', 'alerta ia']],
  ['sessionLock', ['bloqueo de sesión', 'bloqueo de sesion', 'bloquear sesión', 'bloquear sesion']],
  ['clinicalPrivacy', ['privacidad clínica', 'privacidad clinica']],
  ['compact', ['modo compacto', 'vista compacta']],
  ['notifications', ['notificaciones', 'notificación', 'notificacion']],
  ['aiInstructions', ['instrucciones de atal', 'instrucciones para atal', 'instrucciones de ia']],
];

export function selectSettingsPreferenceKeys(text: string): SettingsPreferenceKey[] {
  const normalized = text.toLocaleLowerCase('es-MX');
  return TERMS
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([key]) => key);
}
