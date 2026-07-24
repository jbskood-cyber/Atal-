import { isContextualToolAllowed, type ContextualAgentSurface } from './contextualToolPolicy';
import { classifyAgentTurn } from './generalTurnMode';

const MAX_ACTIVE_TOOLS = 20;

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
  for (const value of values) {
    if (!target.includes(value) && target.length < MAX_ACTIVE_TOOLS) target.push(value);
  }
}

export type ToolSelectionInput = {
  text: string;
  route: string;
  intent?: string;
  hasImageOrPdf: boolean;
  hasAudio: boolean;
  contextSurface?: ContextualAgentSurface;
};

export function selectAgentTools(input: ToolSelectionInput): string[] {
  const classification = classifyAgentTurn(input.text);
  if (classification.kind === 'conversation' && !input.hasImageOrPdf && !input.hasAudio) return [];

  const value = `${input.text} ${input.route} ${input.intent ?? ''}`.toLocaleLowerCase('es-MX');
  const selected = classification.allowedToolKinds.includes('read') || input.hasImageOrPdf || input.hasAudio
    ? [...READ_BASE]
    : [];
  const allowMutations = classification.allowedToolKinds.includes('action');

  const patient = includesAny(value, ['paciente', 'patient', 'expediente', 'record', 'diagnóstico', 'diagnostico', 'nota', 'note', 'teléfono', 'telefono', 'correo', 'contacto', '/patients']);
  const plan = includesAny(value, ['plan', 'tratamiento', 'activar', 'pausar', 'completar', 'archivar', 'progresión', 'progresion', '/plans']);
  const exercise = includesAny(value, ['ejercicio', 'exercise', 'serie', 'repetición', 'repeticion', 'movilidad', 'fuerza', 'multimedia', 'secuencia', '/exercises']);
  const session = includesAny(value, ['sesión', 'sesion', 'session', 'dolor', 'energía', 'energia', 'esfuerzo', 'síntoma', 'sintoma', 'reporte', 'actividad', '/activity']);
  const settings = includesAny(value, ['ajuste', 'setting', 'preferencia', 'perfil profesional', 'profile', 'tema', 'oscuro', 'claro', 'privacidad', '/settings']);
  const delivery = includesAny(value, ['entrega', 'delivery', 'pdf', 'imprimir', 'descargar', 'compartir', 'exportar', 'export', 'respaldo', '/exports', '/delivery']);

  if (allowMutations && patient) append(selected, PATIENT_TOOLS);
  if (allowMutations && plan) append(selected, PLAN_TOOLS);
  if (allowMutations && exercise) append(selected, EXERCISE_TOOLS);
  if (allowMutations && session) append(selected, SESSION_TOOLS);
  if (allowMutations && settings) append(selected, SETTINGS_TOOLS);
  if (allowMutations && delivery) append(selected, DELIVERY_TOOLS);

  const scoped = input.contextSurface
    ? selected.filter((tool) => isContextualToolAllowed(input.contextSurface!, tool))
    : selected;
  return scoped.slice(0, MAX_ACTIVE_TOOLS);
}

export const AGENT_MAX_ACTIVE_TOOLS = MAX_ACTIVE_TOOLS;
