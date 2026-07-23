const MAX_ACTIVE_TOOLS = 16;

const READ_BASE = ['app.read', 'patient.search', 'navigation.open'];
const PATIENT_TOOLS = ['patient.create', 'patient.update', 'patient.lifecycle', 'patient_note.add', 'patient_note.update', 'clinical_record.upsert'];
const PLAN_TOOLS = ['plan.create_simple', 'plan.update_fields', 'plan.duplicate', 'plan.membership', 'plan.activate', 'plan.pause', 'plan.complete', 'plan.archive', 'plan.restore', 'plan.replace_active'];
const EXERCISE_TOOLS = ['exercise.create_simple', 'exercise.update_fields', 'exercise.duplicate', 'exercise.lifecycle', 'exercise.media'];
const SESSION_TOOLS = ['session.start_or_resume', 'session.update_draft', 'session.complete', 'report.review'];
const SETTINGS_TOOLS = ['settings.update', 'settings.profile_update', 'settings.appearance'];
const DELIVERY_TOOLS = ['delivery.open', 'delivery.action', 'data.export_local'];

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function append(target: string[], values: string[]): void {
  for (const value of values) if (!target.includes(value) && target.length < MAX_ACTIVE_TOOLS) target.push(value);
}

export type ToolSelectionInput = {
  text: string;
  route: string;
  hasImageOrPdf: boolean;
  hasAudio: boolean;
};

export function selectAgentTools(input: ToolSelectionInput): string[] {
  const value = `${input.text} ${input.route}`.toLocaleLowerCase('es-MX');
  const selected = [...READ_BASE];

  const patient = includesAny(value, ['paciente', 'expediente', 'diagnóstico', 'diagnostico', 'nota', 'teléfono', 'telefono', 'correo', 'contacto', '/patients']);
  const plan = includesAny(value, ['plan', 'tratamiento', 'activar', 'pausar', 'completar', 'archivar', 'progresión', 'progresion', '/plans']);
  const exercise = includesAny(value, ['ejercicio', 'serie', 'repetición', 'repeticion', 'movilidad', 'fuerza', 'multimedia', 'imagen', 'secuencia', '/exercises']);
  const session = includesAny(value, ['sesión', 'sesion', 'dolor', 'energía', 'energia', 'esfuerzo', 'síntoma', 'sintoma', 'reporte', 'actividad', '/activity']);
  const settings = includesAny(value, ['ajuste', 'preferencia', 'perfil profesional', 'tema', 'oscuro', 'claro', 'privacidad', '/settings']);
  const delivery = includesAny(value, ['entrega', 'pdf', 'imprimir', 'descargar', 'compartir', 'exportar', 'respaldo', '/exports', '/delivery']);

  if (patient || input.hasImageOrPdf) append(selected, PATIENT_TOOLS);
  if (plan) append(selected, PLAN_TOOLS);
  if (exercise || input.hasImageOrPdf) append(selected, EXERCISE_TOOLS);
  if (session || input.hasAudio) append(selected, SESSION_TOOLS);
  if (settings) append(selected, SETTINGS_TOOLS);
  if (delivery) append(selected, DELIVERY_TOOLS);

  if (selected.length === READ_BASE.length) {
    if (input.route.startsWith('/plans')) append(selected, PLAN_TOOLS);
    else if (input.route.startsWith('/exercises')) append(selected, EXERCISE_TOOLS);
    else if (input.route.startsWith('/activity')) append(selected, SESSION_TOOLS);
    else if (input.route.startsWith('/settings')) append(selected, SETTINGS_TOOLS);
    else append(selected, PATIENT_TOOLS);
  }

  return selected.slice(0, MAX_ACTIVE_TOOLS);
}

export const AGENT_MAX_ACTIVE_TOOLS = MAX_ACTIVE_TOOLS;
