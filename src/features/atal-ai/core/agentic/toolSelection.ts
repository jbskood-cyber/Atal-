import { isContextualToolAllowed, type ContextualAgentSurface } from './contextualToolPolicy';
import { classifyAgentTurn } from './generalTurnMode';

const MAX_ACTIVE_TOOLS = 20;

const READ_BASE = ['app.read', 'patient.search'];
const PATIENT_TOOLS = ['patient.create', 'patient.update', 'patient.lifecycle', 'patient_note.add', 'patient_note.update', 'clinical_record.upsert'];
const PLAN_TOOLS = ['plan.create_simple', 'plan.update_fields', 'plan.duplicate', 'plan.membership', 'plan.activate', 'plan.pause', 'plan.complete', 'plan.archive', 'plan.restore', 'plan.replace_active'];
const EXERCISE_TOOLS = ['exercise.create_simple', 'exercise.update_fields', 'exercise.duplicate', 'exercise.lifecycle', 'exercise.media'];
const SESSION_TOOLS = ['session.start_or_resume', 'session.update_draft', 'session.complete', 'report.review'];
const SETTINGS_TOOLS = ['settings.update', 'settings.profile_update', 'settings.appearance'];
const DELIVERY_TOOLS = ['delivery.open', 'delivery.action', 'data.export_local'];
const DRAFT_COMMIT_PATTERN = /\b(?:guárdalo|guardalo|guárdala|guardala|hazlo|hazla|apl[ií]calo|apl[ií]cala)\b|\bahora s[ií]\b.{0,24}\b(?:guarda|aplica|haz|registra)\b/i;

const PATIENT_INTENTS = new Set(['create_patient_plan', 'update_patient_record', 'search_patient', 'summarize_patient', 'add_patient_note']);
const PLAN_INTENTS = new Set(['create_plan_for_existing_patient', 'update_existing_plan', 'update_plan_status', 'archive_plan', 'restore_plan', 'replace_active_plan']);
const EXERCISE_INTENTS = new Set(['create_exercise', 'update_existing_exercise']);
const SESSION_INTENTS = new Set(['summarize_sessions', 'create_report']);
const SETTINGS_INTENTS = new Set(['update_settings']);
const DELIVERY_INTENTS = new Set(['export_data']);

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
  selectionHints?: string;
  hasImageOrPdf: boolean;
  hasAudio: boolean;
  contextSurface?: ContextualAgentSurface;
};

function scopeTools(tools: string[], surface?: ContextualAgentSurface): string[] {
  const scoped = surface ? tools.filter((tool) => isContextualToolAllowed(surface, tool)) : tools;
  return scoped.slice(0, MAX_ACTIVE_TOOLS);
}

function selectPatientMaintenanceTools(rawText: string): string[] {
  const selected: string[] = [];

  if (includesAny(rawText, ['teléfono', 'telefono', 'correo', 'email', 'contacto', 'nombre', 'nacimiento', 'dirección', 'direccion', 'emergencia'])) {
    append(selected, ['patient.update']);
  }
  if (includesAny(rawText, ['archiva', 'archivar', 'archivo', 'restaura', 'restaurar', 'reactiva', 'reactivar'])) {
    append(selected, ['patient.lifecycle']);
  }
  if (includesAny(rawText, ['añade una nota', 'anade una nota', 'agrega una nota', 'agregar una nota', 'nueva nota'])) {
    append(selected, ['patient_note.add']);
  }
  if (includesAny(rawText, ['edita la nota', 'editar la nota', 'actualiza la nota', 'actualizar la nota', 'cambia la nota'])) {
    append(selected, ['patient_note.update']);
  }
  if (includesAny(rawText, ['dolor', 'diagnóstico', 'diagnostico', 'expediente', 'clinical record', 'registro clínico', 'registro clinico'])) {
    append(selected, ['clinical_record.upsert']);
  }

  return selected;
}

function selectPlanMaintenanceTools(rawText: string): string[] {
  const selected: string[] = [];

  if (includesAny(rawText, [
    'frecuencia', 'título', 'titulo', 'nombre del plan', 'objetivo', 'enfoque', 'duración', 'duracion',
    'progresión', 'progresion', 'criterio', 'instrucciones',
  ])) {
    append(selected, ['plan.update_fields']);
  }
  if (includesAny(rawText, [
    'añade el ejercicio', 'anade el ejercicio', 'agrega el ejercicio', 'agregar el ejercicio',
    'quita el ejercicio', 'quitar el ejercicio', 'elimina el ejercicio', 'eliminar el ejercicio',
    'reordena', 'reordenar', 'ordena los ejercicios', 'ordenar los ejercicios',
  ])) {
    append(selected, ['plan.membership']);
  }

  return selected;
}

function selectPlanLifecycleTools(rawText: string, intent: string): string[] {
  if (intent === 'archive_plan') return ['plan.archive'];
  if (intent === 'restore_plan') return ['plan.restore'];
  if (intent === 'replace_active_plan') return ['plan.replace_active'];

  if (intent === 'update_plan_status') {
    if (includesAny(rawText, ['activa', 'activar', 'activar el plan'])) return ['plan.activate'];
    if (includesAny(rawText, ['pausa', 'pausar', 'suspende', 'suspender'])) return ['plan.pause'];
    if (includesAny(rawText, ['completa', 'completar', 'finaliza', 'finalizar', 'termina', 'terminar'])) return ['plan.complete'];
  }

  return [];
}

function selectExerciseMaintenanceTools(rawText: string): string[] {
  if (includesAny(rawText, ['archiva', 'archivar', 'restaura', 'restaurar', 'reactiva', 'reactivar'])) {
    return ['exercise.lifecycle'];
  }
  if (includesAny(rawText, ['duplica', 'duplicar', 'copia', 'copiar'])) {
    return ['exercise.duplicate'];
  }
  if (includesAny(rawText, ['imagen', 'foto', 'secuencia', 'multimedia', 'media'])) {
    return ['exercise.media'];
  }
  if (includesAny(rawText, [
    'nombre', 'región', 'region', 'categoría', 'categoria', 'objetivo', 'posición', 'posicion',
    'instrucciones', 'precauciones', 'equipo', 'dificultad', 'serie', 'series', 'repetición', 'repeticion',
    'repeticiones', 'tiempo', 'descanso', 'dolor', 'etiqueta', 'etiquetas', 'nota', 'notas',
  ])) {
    return ['exercise.update_fields'];
  }
  return ['exercise.update_fields'];
}

function selectSessionActionTools(rawText: string): string[] {
  if (includesAny(rawText, ['inicia una sesión', 'inicia una sesion', 'iniciar una sesión', 'iniciar una sesion', 'reanuda la sesión', 'reanuda la sesion', 'reanudar la sesión', 'reanudar la sesion'])) {
    return ['session.start_or_resume'];
  }
  if (includesAny(rawText, ['actualiza el borrador', 'actualizar el borrador', 'borrador de la sesión', 'borrador de la sesion'])) {
    return ['session.update_draft'];
  }
  if (includesAny(rawText, ['completa la sesión', 'completa la sesion', 'completar la sesión', 'completar la sesion', 'finaliza la sesión', 'finaliza la sesion', 'guárdala como completada', 'guardala como completada', 'guarda como parcial'])) {
    return ['session.complete'];
  }
  if (includesAny(rawText, ['revisa el reporte', 'revisar el reporte', 'observación clínica', 'observacion clinica', 'guarda la observación', 'guarda la observacion'])) {
    return ['report.review'];
  }
  return [];
}

export function selectAgentTools(input: ToolSelectionInput): string[] {
  const classification = classifyAgentTurn(input.text);
  const rawText = input.text.toLocaleLowerCase('es-MX');
  const routeAndHints = `${input.route} ${input.selectionHints ?? ''}`.toLocaleLowerCase('es-MX');
  const intent = input.intent ?? '';
  const selected = classification.allowedToolKinds.includes('read') ? [...READ_BASE] : [];
  const allowMutations = classification.allowedToolKinds.includes('action');

  if (allowMutations && intent === 'create_patient_plan' && DRAFT_COMMIT_PATTERN.test(input.text)) {
    append(selected, ['patient.create']);
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'update_patient_record') {
    const maintenanceTools = selectPatientMaintenanceTools(rawText);
    if (maintenanceTools.length > 0) {
      append(selected, maintenanceTools);
      return scopeTools(selected, input.contextSurface);
    }
  }

  if (allowMutations && intent === 'create_plan_for_existing_patient') {
    append(selected, ['plan.create_simple']);
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'update_existing_plan') {
    const maintenanceTools = selectPlanMaintenanceTools(rawText);
    append(selected, maintenanceTools.length > 0 ? maintenanceTools : ['plan.update_fields']);
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && PLAN_INTENTS.has(intent)) {
    const lifecycleTools = selectPlanLifecycleTools(rawText, intent);
    if (lifecycleTools.length > 0) {
      append(selected, lifecycleTools);
      return scopeTools(selected, input.contextSurface);
    }
  }

  if (allowMutations && intent === 'create_exercise') {
    append(selected, ['exercise.create_simple']);
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'update_existing_exercise') {
    append(selected, selectExerciseMaintenanceTools(rawText));
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations) {
    const sessionTools = selectSessionActionTools(rawText);
    if (sessionTools.length > 0) {
      append(selected, sessionTools);
      return scopeTools(selected, input.contextSurface);
    }
  }

  const navigationRequested = includesAny(`${rawText} ${routeAndHints}`, ['abre ', 'abrir ', 'navega', 've a ', 'llévame', 'llevame', 'muéstrame la pantalla', 'muestrame la pantalla']);
  const patient = PATIENT_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['paciente', 'patient', 'expediente', 'record', 'diagnóstico', 'diagnostico', 'nota', 'note', 'teléfono', 'telefono', 'correo', 'contacto', '/patients']);
  const plan = PLAN_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['plan', 'tratamiento', 'progresión', 'progresion', '/plans']);
  const exercise = EXERCISE_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['ejercicio', 'exercise', 'rutina', 'serie', 'repetición', 'repeticion', 'movilidad', 'fuerza', 'multimedia', 'secuencia', '/exercises']);
  const session = SESSION_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['sesión', 'sesion', 'session', 'reporte', 'actividad', '/activity']);
  const settings = SETTINGS_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['ajuste', 'setting', 'preferencia', 'perfil profesional', 'profile', 'tema', 'oscuro', 'claro', 'privacidad', '/settings']);
  const delivery = DELIVERY_INTENTS.has(intent) || includesAny(`${rawText} ${routeAndHints}`, ['entrega', 'delivery', 'pdf', 'imprimir', 'descargar', 'compartir', 'exportar', 'export', 'respaldo', '/exports', '/delivery']);

  if (navigationRequested && classification.kind !== 'conversation') append(selected, ['navigation.open']);
  if (allowMutations && patient) append(selected, PATIENT_TOOLS);
  if (allowMutations && plan) append(selected, PLAN_TOOLS);
  if (allowMutations && exercise) append(selected, EXERCISE_TOOLS);
  if (allowMutations && session) append(selected, SESSION_TOOLS);
  if (allowMutations && settings) append(selected, SETTINGS_TOOLS);
  if (allowMutations && delivery) append(selected, DELIVERY_TOOLS);

  return scopeTools(selected, input.contextSurface);
}

export const AGENT_MAX_ACTIVE_TOOLS = MAX_ACTIVE_TOOLS;
