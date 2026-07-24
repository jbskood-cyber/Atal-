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
  phone: text('Teléfono.'), email: text('Correo electrónico.'), address: text('Dirección.'), emergencyContact: text('Contacto de emergencia.'),
});
const patientPatchSchema = object({
  name: text('Nombre del paciente.', 180), diagnosis: text('Diagnóstico proporcionado.', 1_000), age: number('Edad entre 0 y 130.', 0, 130),
  birthDate: text('Fecha de nacimiento.'), sex: text('Sexo o género registrado.'), affectedArea: text('Zona afectada.'),
  visitType: enumText(['first', 'followup'], 'Tipo de consulta.'), contact: contactSchema,
});
const recordPatchSchema = object({
  reasonForVisit: text('Motivo de consulta.'), evolution: text('Evolución.'), affectedArea: text('Zona afectada.'),
  symptoms: stringArray('Síntomas.'), painLevel: number('Dolor entre 0 y 10.', 0, 10), providedDiagnosis: text('Diagnóstico proporcionado.'),
  functionalLimitations: stringArray('Limitaciones funcionales.'), goals: stringArray('Objetivos.'), relevantHistory: stringArray('Antecedentes relevantes.'),
  precautions: stringArray('Precauciones.'), clinicalNotes: text('Notas clínicas.', 10_000), planId: text('ID del plan relacionado.'),
});
const planFields = {
  title: text('Título del plan.', 220), focus: text('Enfoque del plan.'), duration: text('Duración.'), frequency: text('Frecuencia.'),
  goal: text('Objetivo.'), progression: text('Progresión.'), reportCriteria: text('Criterios de reporte.'), generalInstructions: text('Indicaciones generales.'),
};
const exerciseFields = {
  name: text('Nombre del ejercicio.', 220), region: text('Región corporal.'), category: text('Categoría.'), objective: text('Objetivo.'),
  startingPosition: text('Posición inicial.'), instructions: stringArray('Pasos o indicaciones.'), precautions: text('Precauciones.'),
  equipment: text('Equipo necesario.'), difficulty: text('Dificultad.'), sets: integer('Series, entre 1 y 100.', 1, 100),
  repetitions: integer('Repeticiones, entre 1 y 10000.', 1, 10_000), time: text('Tiempo de ejecución.'), rest: text('Descanso.'),
  maxPain: number('Dolor máximo permitido entre 0 y 10.', 0, 10), tags: stringArray('Etiquetas.'), notes: text('Notas.'),
};

function entry(name: string, kind: AgentToolCatalogEntry['kind'], contract: string, inputSchema: AgentJsonSchema): AgentToolCatalogEntry {
  return { name, functionName: `atal_${name.replaceAll('.', '_')}`, kind, contract, inputSchema };
}

export const APP_READ_RESOURCES = [
  'patient_profile', 'clinical_record', 'clinical_record_versions', 'plans', 'plan', 'exercises', 'exercise',
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
      name: text('Nombre del paciente.', 180), diagnosis: text('Diagnóstico.'), age: number('Edad entre 0 y 130.', 0, 130),
      birthDate: text('Fecha de nacimiento.'), sex: text('Sexo o género.'), affectedArea: text('Zona afectada.'),
      visitType: enumText(['first', 'followup'], 'Tipo de consulta.'), phone: text('Teléfono.'), email: text('Correo.'),
      address: text('Dirección.'), emergencyContact: text('Contacto de emergencia.'),
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
  entry('plan.duplicate', 'action', 'Duplica un plan.', object({ plan: planRef, title: text('Título opcional para la copia.', 220) }, ['plan'])),
  entry('plan.membership', 'action', 'Añade, retira o reordena ejercicios de un plan.', object({
    plan: planRef, operation: enumText(['add', 'remove', 'reorder'], 'Operación de membresía.'), exerciseIds: stringArray('IDs de ejercicios.'),
  }, ['plan', 'operation', 'exerciseIds'])),
  entry('plan.activate', 'action', 'Activa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.pause', 'action', 'Pausa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.complete', 'action', 'Completa un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.archive', 'action', 'Archiva un plan.', object({ plan: planRef }, ['plan'])),
  entry('plan.restore', 'action', 'Restaura un plan archivado.', object({ plan: planRef }, ['plan'])),
  entry('plan.replace_active', 'action', 'Reemplaza el plan activo del paciente.', object({ patient: patientRef, targetPlan: planRef, replaceCurrent: { type: 'boolean', enum: [true] } }, ['patient', 'targetPlan', 'replaceCurrent'])),

  entry('exercise.create_simple', 'action', 'Crea un ejercicio canónico.', object(exerciseFields, ['name'])),
  entry('exercise.update_fields', 'action', 'Actualiza un ejercicio.', object({ exercise: exerciseRef, patch: object(exerciseFields) }, ['exercise', 'patch'])),
  entry('exercise.duplicate', 'action', 'Duplica un ejercicio.', object({ exercise: exerciseRef, name: text('Nombre opcional para la copia.', 220) }, ['exercise'])),
  entry('exercise.lifecycle', 'action', 'Archiva o restaura un ejercicio.', object({ exercise: exerciseRef, archived: { type: 'boolean' } }, ['exercise', 'archived'])),
  entry('exercise.media', 'action', 'Vincula artefactos visuales locales a un ejercicio.', object({
    exercise: exerciseRef, mediaType: enumText(['image', 'sequence'], 'Tipo de recurso.'), artifactIds: stringArray('IDs de artefactos locales.', 12),
  }, ['exercise', 'mediaType', 'artifactIds'])),

  entry('session.start_or_resume', 'action', 'Inicia o recupera una sesión guiada.', object({
    patient: patientRef, plan: planRef, startPain: number('Dolor inicial entre 0 y 10.', 0, 10), startEnergy: number('Energía inicial entre 0 y 10.', 0, 10), comment: text('Comentario inicial.'),
  }, ['patient', 'plan'])),
  entry('session.update_draft', 'action', 'Actualiza el borrador de sesión.', object({ patient: patientRef, plan: planRef, patch: object({}, [], true) }, ['patient', 'plan', 'patch'])),
  entry('session.complete', 'action', 'Completa o guarda como parcial una sesión.', object({
    patient: patientRef, plan: planRef, status: enumText(['completed', 'partial'], 'Estado final.'), patch: object({}, [], true),
  }, ['patient', 'plan', 'status'])),
  entry('report.review', 'action', 'Guarda una observación clínica en el reporte.', object({ session: sessionRef, observation: text('Observación clínica.', 10_000) }, ['session', 'observation'])),

  entry('settings.update', 'action', 'Actualiza preferencias compatibles.', object({ settings: ref('settings', 'Referencia a ajustes.'), patch: object({}, [], true) }, ['settings', 'patch'])),
  entry('settings.profile_update', 'action', 'Actualiza el perfil profesional.', object({
    professionalName: text('Nombre profesional.', 180), specialty: text('Especialidad.', 180), clinic: text('Clínica.', 300),
  })),
  entry('settings.appearance', 'action', 'Cambia el tema local.', object({ mode: enumText(['light', 'dark', 'system'], 'Modo visual.') }, ['mode'])),
  entry('delivery.open', 'read', 'Abre la entrega de un plan.', object({ plan: planRef }, ['plan'])),
  entry('delivery.action', 'action', 'Descarga, comparte o imprime una entrega.', object({
    plan: planRef, action: enumText(['download', 'share', 'print'], 'Acción local.'), options: object({}, [], true),
  }, ['plan', 'action'])),
  entry('data.export_local', 'action', 'Genera una exportación local.', object({ exportType: enumText(['patients', 'progress', 'plans', 'backup'], 'Tipo de exportación.') }, ['exportType'])),
];

export const agentToolCatalogByName = new Map(agentToolCatalog.map((item) => [item.name, item]));
export const agentToolCatalogByFunctionName = new Map(agentToolCatalog.map((item) => [item.functionName, item]));
