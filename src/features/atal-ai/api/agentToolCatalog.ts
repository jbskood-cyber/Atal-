export type AgentJsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
};

export type AgentToolCatalogEntry = {
  name: string;
  functionName: string;
  kind: 'read' | 'action';
  contract: string;
  inputSchema: AgentJsonSchema;
};

type JsonSchema = Record<string, unknown>;

const text = (description: string, maxLength?: number): JsonSchema => ({
  type: 'string',
  description,
  ...(maxLength ? { maxLength } : {}),
});
const integer = (description: string, minimum: number, maximum: number): JsonSchema => ({ type: 'integer', description, minimum, maximum });
const number = (description: string, minimum: number, maximum: number): JsonSchema => ({ type: 'number', description, minimum, maximum });
const stringArray = (description: string, maxItems = 100): JsonSchema => ({ type: 'array', description, items: { type: 'string' }, maxItems });
const object = (properties: Record<string, unknown>, required: string[] = [], additionalProperties = false): AgentJsonSchema => ({
  type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties,
});
const ref = (type: string, description: string): JsonSchema => ({
  type: 'object',
  description,
  properties: {
    type: { type: 'string', enum: [type] },
    id: { type: 'string', description: 'ID canónico cuando esté disponible.' },
    label: { type: 'string', description: 'Nombre exacto cuando no exista un ID conocido.' },
  },
  required: ['type'],
  additionalProperties: false,
});
const enumText = (values: string[], description: string): JsonSchema => ({ type: 'string', enum: values, description });

const patientRef = ref('patient', 'Referencia al paciente objetivo.');
const planRef = ref('plan', 'Referencia al plan objetivo.');
const exerciseRef = ref('exercise', 'Referencia al ejercicio objetivo.');
const sessionRef = ref('session', 'Referencia a la sesión objetivo.');

const contactSchema = object({
  phone: text('Solo el teléfono, sin etiquetas ni explicación adicional.'),
  email: text('Solo el correo electrónico, sin etiquetas ni explicación adicional.'),
  address: text('Solo la dirección, sin etiquetas ni explicación adicional.'),
  emergencyContact: text('Solo el contacto de emergencia, sin etiquetas ni explicación adicional.'),
});
const patientPatchSchema = object({
  name: text('Solo el nombre del paciente, sin frases introductorias ni etiquetas narrativas.', 180), diagnosis: text('Solo el diagnóstico proporcionado, sin frases introductorias.', 1_000), age: number('Edad entre 0 y 130.', 0, 130),
  birthDate: text('Fecha de nacimiento.'), sex: text('Sexo o género registrado.'), affectedArea: text('Solo la zona afectada, sin explicación adicional.'),
  visitType: enumText(['first', 'followup'], 'Tipo de consulta.'), contact: contactSchema,
});
const recordPatchSchema = object({
  reasonForVisit: text('Solo el motivo de consulta, sin encabezados ni frases introductorias.'), evolution: text('Solo la evolución clínica descrita.'), affectedArea: text('Solo la zona afectada, sin explicación adicional.'),
  symptoms: stringArray('Solo síntomas, un síntoma por elemento.'), painLevel: number('Dolor entre 0 y 10.', 0, 10), providedDiagnosis: text('Solo el diagnóstico proporcionado por el usuario, sin convertirlo en explicación.'),
  functionalLimitations: stringArray('Solo limitaciones funcionales, una por elemento.'), goals: stringArray('Solo objetivos clínicos o funcionales, uno por elemento.'), relevantHistory: stringArray('Solo antecedentes relevantes, uno por elemento.'),
  precautions: stringArray('Solo precauciones clínicas, una por elemento.'), clinicalNotes: text('Solo notas clínicas pertinentes al expediente.', 10_000), planId: text('ID del plan relacionado.'),
});
const planFields = {
  title: text('Solo el título del plan, sin frases introductorias ni etiquetas narrativas.', 220), focus: text('Solo el enfoque clínico del plan, sin objetivo, duración ni frecuencia.'), duration: text('Solo la duración del plan, por ejemplo “6 semanas”, sin explicación adicional.'), frequency: text('Solo la frecuencia del plan, sin objetivo, duración ni explicación adicional.'),
  goal: text('Solo el objetivo del plan, sin título, frecuencia ni explicación narrativa.'), progression: text('Solo la progresión prevista del plan, sin mezclar dosis específicas de ejercicios.'), reportCriteria: text('Solo criterios de reporte o seguimiento, sin explicación narrativa adicional.'), generalInstructions: text('Solo indicaciones generales del plan; no mezcles dosis específicas de ejercicios, frecuencia ni precauciones.'),
};
const exerciseFields = {
  name: text('Solo el nombre del ejercicio, sin frases introductorias ni etiquetas narrativas.', 220), region: text('Solo la región corporal del ejercicio.'), category: text('Solo la categoría del ejercicio.'), objective: text('Solo el objetivo del ejercicio, sin instrucciones ni dosis.'),
  startingPosition: text('Solo la posición inicial del ejercicio, sin instrucciones de ejecución ni dosis.'), instructions: stringArray('Solo pasos o instrucciones de ejecución; no incluyas series, repeticiones, frecuencia, descanso ni precauciones.'), precautions: text('Solo precauciones del ejercicio; no mezcles instrucciones ni dosis.'),
  equipment: text('Equipo necesario.'), difficulty: text('Dificultad.'), sets: integer('Series, entre 1 y 100.', 1, 100),
  repetitions: integer('Repeticiones, entre 1 y 10000.', 1, 10_000), time: text('Tiempo de ejecución.'), rest: text('Descanso.'),
  maxPain: number('Dolor máximo permitido entre 0 y 10.', 0, 10), tags: stringArray('Etiquetas.'), notes: text('Notas.'),
};
const sessionPatchSchema = object({
  stage: enumText(['prepare', 'exercise', 'close', 'summary'], 'Etapa de la sesión cuando el usuario la especifica.'),
  currentExerciseIndex: integer('Índice del ejercicio actual.', 0, 999),
  startPain: number('Dolor inicial entre 0 y 10.', 0, 10),
  startEnergy: number('Energía inicial entre 0 y 10.', 0, 10),
  startComment: text('Comentario inicial de la sesión.', 2_000),
  endPain: number('Dolor final entre 0 y 10.', 0, 10),
  endEnergy: number('Energía final entre 0 y 10.', 0, 10),
  effort: number('Esfuerzo final entre 0 y 10.', 0, 10),
  symptoms: stringArray('Síntomas finales reportados.'),
  endComment: text('Comentario final de la sesión.', 2_000),
  easiest: text('Qué fue lo más fácil.', 2_000),
  hardest: text('Qué fue lo más difícil.', 2_000),
  discomfort: text('Molestia o incomodidad reportada.', 2_000),
  exercises: object({}, [], true),
});
const settingsPatchSchema = object({
  notifications: { type: 'boolean', description: 'Activa o desactiva las notificaciones.' },
  haptics: { type: 'boolean', description: 'Activa o desactiva la vibración háptica.' },
  compact: { type: 'boolean', description: 'Activa o desactiva el modo compacto.' },
  sessionLock: { type: 'boolean', description: 'Activa o desactiva el bloqueo de sesión.' },
  clinicalPrivacy: { type: 'boolean', description: 'Activa o desactiva la privacidad clínica.' },
  aiSuggestions: { type: 'boolean', description: 'Activa o desactiva las sugerencias de Atal IA.' },
  aiAlerts: { type: 'boolean', description: 'Activa o desactiva las alertas de Atal IA.' },
  aiInstructions: text('Instrucciones personalizadas para Atal IA.'),
});

function entry(name: string, kind: AgentToolCatalogEntry['kind'], contract: string, inputSchema: AgentJsonSchema): AgentToolCatalogEntry {
  return { name, functionName: `atal_${name.replaceAll('.', '_')}`, kind, contract, inputSchema };
}

export const APP_READ_RESOURCES = [
  'patients', 'patient_profile', 'clinical_record', 'clinical_record_versions', 'plans', 'plan', 'exercises', 'exercise',
  'session_preparation', 'sessions', 'report', 'activity', 'settings', 'delivery',
] as const;

export const agentToolCatalog: AgentToolCatalogEntry[] = [
  entry('app.read', 'read', 'Consulta información canónica mínima de Atal.', object({
    resource: enumText([...APP_READ_RESOURCES], 'Recurso exacto que se desea consultar.'), query: text('Filtro de texto opcional.'),
    status: text('Estado opcional para filtrar.'), limit: integer('Máximo de resultados, entre 1 y 50.', 1, 50),
    patient: patientRef, plan: planRef, exercise: exerciseRef, session: sessionRef,
  }, ['resource'])),
  entry('patient.search', 'read', 'Busca pacientes por nombre o texto.', object({ query: text('Texto de búsqueda no vacío.', 180) }, ['query'])),
  entry('patient.summarize', 'read', 'Resume un paciente.', object({ patient: patientRef }, ['patient'])),
  entry('session.summarize_recent', 'read', 'Resume sesiones recientes de un paciente.', object({ patient: patientRef, limit: integer('Cantidad entre 1 y 10.', 1, 10) }, ['patient'])),
  entry('report.prepare_session_summary', 'read', 'Prepara el resumen de una sesión o del paciente indicado.', object({ session: sessionRef, patient: patientRef })),
  entry('navigation.open', 'read', 'Abre una ruta interna segura de Atal.', object({ route: text('Ruta interna que comienza con /.', 500) }, ['route'])),

  entry('patient.create', 'action', 'Crea paciente, expediente inicial y plan opcional.', object({
    patient: object({
      name: text('Solo el nombre del paciente, sin frases introductorias ni etiquetas narrativas.', 180), diagnosis: text('Solo el diagnóstico proporcionado, sin frases introductorias.', 1_000), age: number('Edad entre 0 y 130.', 0, 130),
      birthDate: text('Fecha de nacimiento.'), sex: text('Sexo o género.'), affectedArea: text('Solo la zona afectada, sin explicación adicional.'),
      visitType: enumText(['first', 'followup'], 'Tipo de consulta.'), phone: text('Solo el teléfono, sin etiquetas ni explicación adicional.'), email: text('Solo el correo electrónico, sin etiquetas ni explicación adicional.'),
      address: text('Solo la dirección, sin etiquetas ni explicación adicional.'), emergencyContact: text('Solo el contacto de emergencia, sin etiquetas ni explicación adicional.'),
    }, ['name']),
    record: recordPatchSchema,
    plan: object({ ...planFields, exerciseIds: stringArray('IDs de ejercicios existentes.'), status: enumText(['draft', 'active'], 'Estado inicial.') }, ['title']),
  }, ['patient'])),
  entry('patient.update', 'action', 'Actualiza datos demográficos o contacto.', object({ patient: patientRef, patch: patientPatchSchema }, ['patient', 'patch'])),
  entry('patient.lifecycle', 'action', 'Archiva o restaura un paciente.', object({ patient: patientRef, archived: { type: 'boolean', description: 'true para archivar; false para restaurar.' } }, ['patient', 'archived'])),
  entry('patient_note.add', 'action', 'Añade una nota al expediente.', object({ patient: patientRef, content: text('Contenido de la nota.', 10_000) }, ['patient', 'content'])),
  entry('patient_note.update', 'action', 'Actualiza una nota existente.', object({ patient: patientRef, noteId: text('ID de la nota.'), content: text('Nuevo contenido.', 10_000) }, ['patient', 'noteId', 'content'])),
  entry('clinical_record.upsert', 'action', 'Actualiza el expediente clínico.', object({ patient: patientRef, patch: recordPatchSchema }, ['patient', 'patch'])),

  entry('plan.create_simple', 'action', 'Crea un plan para un paciente existente.', object({
    patient: patientRef, ...planFields, exerciseIds: stringArray('IDs de ejercicios existentes.'), status: enumText(['draft', 'active'], 'Estado inicial.'),
  }, ['patient', 'title'])),
  entry('plan.update_fields', 'action', 'Actualiza campos de un plan.', object({ plan: planRef, patch: object(planFields) }, ['plan', 'patch'])),
  entry('plan.duplicate', 'action', 'Duplica un plan.', object({ plan: planRef, title: text('Solo el título de la copia, sin frases introductorias ni etiquetas narrativas.', 220) }, ['plan'])),
  entry('plan.membership', 'action', 'Añade, retira, reordena o reemplaza ejercicios de un plan.', object({
    plan: planRef,
    operation: enumText(['add', 'remove', 'reorder', 'replace'], 'Usa replace cuando el usuario sustituya un ejercicio; exerciseIds debe ser la lista final completa en el orden deseado.'),
    exerciseIds: stringArray('IDs de ejercicios. Para replace, envía la membresía final completa del plan.'),
  }, ['plan', 'operation', 'exerciseIds'])),
  entry('plan.activate', 'action', 'Activa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.pause', 'action', 'Pausa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.complete', 'action', 'Completa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.archive', 'action', 'Archiva un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.restore', 'action', 'Restaura un plan archivado.', object({ plan: planRef }, ['plan'])),
  entry('plan.replace_active', 'action', 'Reemplaza el plan activo del paciente.', object({
    patient: patientRef,
    targetPlan: planRef,
    replaceCurrent: { type: 'boolean', description: 'Debe ser true para confirmar que se desea reemplazar el plan activo.' },
  }, ['patient', 'targetPlan', 'replaceCurrent'])),

  entry('exercise.create_simple', 'action', 'Crea un ejercicio canónico.', object(exerciseFields, ['name'])),
  entry('exercise.update_fields', 'action', 'Actualiza un ejercicio.', object({ exercise: exerciseRef, patch: object(exerciseFields) }, ['exercise', 'patch'])),
  entry('exercise.duplicate', 'action', 'Duplica un ejercicio.', object({ exercise: exerciseRef, name: text('Solo el nombre de la copia, sin frases introductorias ni etiquetas narrativas.', 220) }, ['exercise'])),
  entry('exercise.lifecycle', 'action', 'Archiva o restaura un ejercicio.', object({ exercise: exerciseRef, archived: { type: 'boolean' } }, ['exercise', 'archived'])),
  entry('exercise.media', 'action', 'Vincula artefactos visuales locales a un ejercicio.', object({
    exercise: exerciseRef, mediaType: enumText(['image', 'sequence'], 'Tipo de recurso.'), artifactIds: stringArray('IDs de artefactos locales.', 12),
  }, ['exercise', 'mediaType', 'artifactIds'])),

  entry('session.start_or_resume', 'action', 'Inicia o recupera una sesión guiada.', object({
    patient: patientRef, plan: planRef, startPain: number('Dolor inicial entre 0 y 10.', 0, 10), startEnergy: number('Energía inicial entre 0 y 10.', 0, 10), comment: text('Comentario inicial.'),
  }, ['patient', 'plan'])),
  entry('session.update_draft', 'action', 'Actualiza el borrador de sesión. Incluye en patch cada dato de sesión proporcionado por el usuario.', object({ patient: patientRef, plan: planRef, patch: sessionPatchSchema }, ['patient', 'plan', 'patch'])),
  entry('session.complete', 'action', 'Completa o guarda como parcial una sesión. Incluye en patch cada dato final proporcionado por el usuario, usando endPain, endEnergy, effort y endComment cuando correspondan.', object({
    patient: patientRef, plan: planRef, status: enumText(['completed', 'partial'], 'Estado final.'), patch: sessionPatchSchema,
  }, ['patient', 'plan', 'status'])),
  entry('report.review', 'action', 'Guarda una observación clínica en el reporte.', object({ session: sessionRef, observation: text('Observación clínica.', 10_000) }, ['session', 'observation'])),

  entry('settings.update', 'action', 'Actualiza preferencias compatibles usando únicamente las claves canónicas indicadas en patch.', object({ patch: settingsPatchSchema }, ['patch'])),
  entry('settings.profile_update', 'action', 'Actualiza el perfil profesional.', object({
    professionalName: text('Solo el nombre profesional, sin frases introductorias ni etiquetas narrativas.', 180), specialty: text('Solo la especialidad profesional, sin explicación adicional.', 180), clinic: text('Solo el nombre de la clínica, sin explicación adicional.', 300),
  })),
  entry('settings.appearance', 'action', 'Cambia el tema local.', object({ mode: enumText(['light', 'dark', 'system'], 'Modo visual.') }, ['mode'])),
  entry('delivery.open', 'read', 'Abre la entrega de un plan.', object({ plan: planRef }, ['plan'])),
  entry('delivery.action', 'action', 'Descarga, comparte o imprime una entrega.', object({
    plan: planRef, action: enumText(['download', 'share', 'print'], 'Acción local.'), options: object({}, [], true),
  }, ['plan', 'action'])),
  entry('data.export_local', 'action', 'Genera una exportación local.', object({ kind: enumText(['patients', 'progress', 'plans', 'backup'], 'Tipo de exportación.') }, ['kind'])),
];

export const agentToolCatalogByName = new Map(agentToolCatalog.map((item) => [item.name, item]));
export const agentToolCatalogByFunctionName = new Map(agentToolCatalog.map((item) => [item.functionName, item]));
