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
const BARE_CONFIRMATION_PATTERN = /^\s*(?:(?:por favor|ahora s[ií])[,\s]*)?(?:guárdalo|guardalo|guárdala|guardala|hazlo|hazla|apl[ií]calo|apl[ií]cala)[.!?¡¿]*\s*$/i;
const GENERIC_PLAN_MUTATION_PATTERN = /\b(?:actualiza|actualizar|modifica|modificar|cambia|cambiar|ajusta|ajustar|edita|editar)\b.{0,64}\b(?:tratamiento|plan)\b|\b(?:tratamiento|plan)\b.{0,64}\b(?:actualiza|actualizar|modifica|modificar|cambia|cambiar|ajusta|ajustar|edita|editar)\b/i;
const EXPLICIT_EXERCISE_ACTION_PATTERN = /\b(?:añade|anade|agrega|agregar|quita|quitar|elimina|eliminar|reordena|reordenar|ordena|ordenar|crea|crear|duplica|duplicar)\b.{0,40}\bejercicios?\b/i;
const PLAN_MEMBERSHIP_ACTION_PATTERN = /\b(?:añade|anade|agrega|agregar|quita|quitar|elimina|eliminar|reordena|reordenar|ordena|ordenar)\b.{0,64}\bejercicios?\b/i;
const PLAN_COMPLETE_ACTION_PATTERN = /\b(?:completa|completar|finaliza|finalizar|termina|terminar)\b|\b(?:da|dar|marca|marcar)\b.{0,24}\b(?:por\s+)?(?:terminado|terminada|completado|completada|finalizado|finalizada)\b/i;
const PLAN_REPLACE_ACTIVE_PATTERN = /\b(?:reemplaza|reemplazar|sustituye|sustituir)\b.{0,64}\bplan activo\b/i;
const PLAN_FIELD_EDIT_PATTERN = /\b(?:actualiza|actualizar|actualízale|actualizale|modifica|modificar|modifícale|modificale|cambia|cambiar|cámbiale|cambiale|ajusta|ajustar|ajústale|ajustale|edita|editar|edítale|editale|pon|poner|define|definir)\b.{0,80}\b(?:frecuencia|título|titulo|nombre del plan|objetivo|enfoque|duración|duracion|progresión|progresion|criterio|instrucciones)\b/i;
const PLAN_EXPLICIT_FIELD_EDIT_PATTERN = /\b(?:plan|tratamiento)\b.{0,64}\b(?:actualiza|actualizar|actualízale|actualizale|modifica|modificar|modifícale|modificale|cambia|cambiar|cámbiale|cambiale|ajusta|ajustar|ajústale|ajustale|edita|editar|edítale|editale|pon|poner|define|definir)\b.{0,80}\b(?:frecuencia|título|titulo|nombre del plan|objetivo|enfoque|duración|duracion|progresión|progresion|criterio|instrucciones)\b|\b(?:actualiza|actualizar|actualízale|actualizale|modifica|modificar|modifícale|modificale|cambia|cambiar|cámbiale|cambiale|ajusta|ajustar|ajústale|ajustale|edita|editar|edítale|editale|pon|poner|define|definir)\b.{0,80}\b(?:frecuencia|título|titulo|nombre del plan|objetivo|enfoque|duración|duracion|progresión|progresion|criterio|instrucciones)\b.{0,24}\b(?:del|de este|en el|en este)\s+(?:plan|tratamiento)\b/i;

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
  hasConversationContext?: boolean;
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

  if (/\b(?:duplica|duplicar|copia|copiar)\b/i.test(rawText)) append(selected, ['plan.duplicate']);
  if (/\b(?:pausa|pausar|suspende|suspender)\b/i.test(rawText)) append(selected, ['plan.pause']);
  if (PLAN_COMPLETE_ACTION_PATTERN.test(rawText)) append(selected, ['plan.complete']);
  if (/\b(?:archiva|archivar)\b/i.test(rawText)) append(selected, ['plan.archive']);
  if (/\b(?:restaura|restaurar|reactiva|reactivar)\b/i.test(rawText)) append(selected, ['plan.restore']);
  if (/\b(?:activa|activar)\b/i.test(rawText)) append(selected, ['plan.activate']);
  if (PLAN_REPLACE_ACTIVE_PATTERN.test(rawText)) append(selected, ['plan.replace_active']);

  const mentionsPlanField = includesAny(rawText, [
    'frecuencia', 'título', 'titulo', 'nombre del plan', 'objetivo', 'enfoque', 'duración', 'duracion',
    'progresión', 'progresion', 'criterio', 'instrucciones',
  ]);
  if (mentionsPlanField && (selected.length === 0 || PLAN_FIELD_EDIT_PATTERN.test(rawText))) {
    append(selected, ['plan.update_fields']);
  }
  if (PLAN_MEMBERSHIP_ACTION_PATTERN.test(rawText) || includesAny(rawText, [
    'añádele', 'anadele', 'agrégale', 'agregale', 'quítale', 'quitale',
  ])) {
    append(selected, ['plan.membership']);
  }

  return selected;
}

function selectPlanExerciseMutationTools(rawText: string): string[] {
  if (!includesAny(rawText, ['ejercicio', 'ejercicios'])) return [];

  if (includesAny(rawText, [
    'dosis', 'serie', 'series', 'repetición', 'repeticion', 'repeticiones', 'tiempo', 'descanso',
    'instrucciones', 'precauciones', 'dolor', 'equipo', 'dificultad',
  ])) {
    return ['exercise.update_fields'];
  }

  if (/\b(?:sustituye|sustituir|reemplaza|reemplazar|cambia|cambiar)\b.{0,48}\bejercicios?\b.{0,40}\bpor\b/i.test(rawText)) {
    return ['plan.membership'];
  }

  return [];
}

function isUnderspecifiedPlanMutation(rawText: string): boolean {
  if (!GENERIC_PLAN_MUTATION_PATTERN.test(rawText)) return false;
  if (selectPlanMaintenanceTools(rawText).length > 0) return false;
  if (selectPlanExerciseMutationTools(rawText).length > 0) return false;
  if (EXPLICIT_EXERCISE_ACTION_PATTERN.test(rawText)) return false;
  return !includesAny(rawText, [
    'activa', 'activar', 'pausa', 'pausar', 'suspende', 'suspender', 'completa', 'completar',
    'finaliza', 'finalizar', 'termina', 'terminar', 'archiva', 'archivar', 'restaura', 'restaurar',
    'reactiva', 'reactivar', 'reemplaza', 'reemplazar', 'sustituye', 'sustituir', 'duplica', 'duplicar',
    'crea', 'crear', 'nuevo plan', 'plan nuevo',
  ]);
}

function selectPlanLifecycleTools(rawText: string, intent: string): string[] {
  if (intent === 'archive_plan') return ['plan.archive'];
  if (intent === 'restore_plan') return ['plan.restore'];
  if (intent === 'replace_active_plan') return ['plan.replace_active'];

  if (intent === 'update_plan_status') {
    if (includesAny(rawText, ['activa', 'activar', 'activar el plan'])) return ['plan.activate'];
    if (includesAny(rawText, ['pausa', 'pausar', 'suspende', 'suspender'])) return ['plan.pause'];
    if (PLAN_COMPLETE_ACTION_PATTERN.test(rawText)) return ['plan.complete'];
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

function selectSettingsActionTools(rawText: string): string[] {
  if (includesAny(rawText, ['modo oscuro', 'modo claro', 'apariencia', 'tema', 'dark mode', 'light mode'])) {
    return ['settings.appearance'];
  }
  if (includesAny(rawText, ['perfil profesional', 'nombre profesional', 'especialidad', 'clínica', 'clinica'])) {
    return ['settings.profile_update'];
  }
  if (includesAny(rawText, [
    'vibración', 'vibracion', 'háptica', 'haptica', 'haptics', 'sugerencias de ia', 'sugerencias ia',
    'notificaciones', 'compacto', 'bloqueo de sesión', 'bloqueo de sesion', 'privacidad', 'alertas de ia',
    'alertas ia', 'instrucciones de atal', 'preferencia', 'preferencias',
  ])) {
    return ['settings.update'];
  }
  return [];
}

function deliveryRequestTool(rawText: string): 'delivery.open' | 'delivery.action' | undefined {
  const mentionsDelivery = includesAny(rawText, ['entrega', 'delivery']);
  if (!mentionsDelivery) return undefined;
  if (includesAny(rawText, ['descarga', 'descargar', 'comparte', 'compartir', 'imprime', 'imprimir'])) return 'delivery.action';
  if (includesAny(rawText, ['abre', 'abrir', 'muestra', 'mostrar', 'previsualiza', 'previsualizar'])) return 'delivery.open';
  return undefined;
}

export function selectAgentTools(input: ToolSelectionInput): string[] {
  const classification = classifyAgentTurn(input.text);
  const rawText = input.text.toLocaleLowerCase('es-MX');
  const routeAndHints = `${input.route} ${input.selectionHints ?? ''}`.toLocaleLowerCase('es-MX');
  const intent = input.intent ?? '';
  const selected = classification.allowedToolKinds.includes('read') ? [...READ_BASE] : [];
  const allowMutations = classification.allowedToolKinds.includes('action');

  if (allowMutations && input.hasConversationContext === false && BARE_CONFIRMATION_PATTERN.test(input.text)) {
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'export_data') {
    append(selected, ['data.export_local']);
    return scopeTools(selected, input.contextSurface);
  }

  const requestedDeliveryTool = deliveryRequestTool(rawText);
  if (requestedDeliveryTool === 'delivery.open') {
    append(selected, ['delivery.open']);
    return scopeTools(selected, input.contextSurface);
  }
  if (allowMutations && requestedDeliveryTool === 'delivery.action') {
    append(selected, ['delivery.action']);
    return scopeTools(selected, input.contextSurface);
  }

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

  if (allowMutations && isUnderspecifiedPlanMutation(rawText)) {
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'create_plan_for_existing_patient') {
    append(selected, ['plan.create_simple']);
    return scopeTools(selected, input.contextSurface);
  }

  if (allowMutations && intent === 'update_existing_plan') {
    const maintenanceTools = selectPlanMaintenanceTools(rawText);
    const exerciseTools = selectPlanExerciseMutationTools(rawText);
    const scopedMaintenanceTools = exerciseTools.length > 0 && !PLAN_EXPLICIT_FIELD_EDIT_PATTERN.test(rawText)
      ? maintenanceTools.filter((tool) => tool !== 'plan.update_fields')
      : maintenanceTools;
    const requestedTools = [...scopedMaintenanceTools, ...exerciseTools];
    append(selected, requestedTools.length > 0 ? requestedTools : ['plan.update_fields']);
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

  if (allowMutations && SETTINGS_INTENTS.has(intent)) {
    const settingsTools = selectSettingsActionTools(rawText);
    if (settingsTools.length > 0) {
      append(selected, settingsTools);
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
