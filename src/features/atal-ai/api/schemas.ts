import type { AtalAIDraft, AIExerciseDraft } from '../types';

const stringArray = { type: 'array', items: { type: 'string' } } as const;
const nullableNumber = { type: ['number', 'null'] } as const;

export const atalAIDraftJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    intent: { type: 'string', enum: ['create_patient_plan','create_plan_for_existing_patient','create_exercise','update_patient_record','update_existing_plan'] },
    selectedPatientId:{type:'string'},selectedPlanId:{type:'string'},
    patient: { type: 'object', additionalProperties: false, properties: {
      name: { type: 'string' }, age: nullableNumber, birthDate: { type: 'string' }, sex: { type: 'string' },
      reasonForVisit: { type: 'string' }, affectedArea: { type: 'string' }, evolutionTime: { type: 'string' },
      providedDiagnosis: { type: 'string' }, painLevel: nullableNumber, functionalLimitations: stringArray,
      symptoms: stringArray, goals: stringArray, relevantHistory: stringArray, precautions: stringArray, clinicalNotes: { type: 'string' },
    }, required: ['name','age','birthDate','sex','reasonForVisit','affectedArea','evolutionTime','providedDiagnosis','painLevel','symptoms','functionalLimitations','goals','relevantHistory','precautions','clinicalNotes'] },
    plan: { type: 'object', additionalProperties: false, properties: {
      title: { type: 'string' }, goal: { type: 'string' }, focus: { type: 'string' },
      duration: { type: 'object', additionalProperties: false, properties: { value: nullableNumber, unit: { type: 'string', enum: ['days','weeks','months','custom'] }, customText: { type: 'string' } }, required: ['value','unit','customText'] },
      frequency: { type: 'object', additionalProperties: false, properties: { value: nullableNumber, period: { type: 'string', enum: ['day','week','month','custom'] }, customText: { type: 'string' } }, required: ['value','period','customText'] },
      phases: stringArray, generalInstructions: { type: 'string' }, status: { type: 'string', enum: ['draft','active'] },
    }, required: ['title','goal','focus','duration','frequency','phases','generalInstructions','status'] },
    exercises: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      name: { type: 'string' }, region: { type: 'string' }, category: { type: 'string' }, objective: { type: 'string' },
      startingPosition: { type: 'string' }, instructions: stringArray, precautions: stringArray, equipment: { type: 'string' },
      difficulty: { type: 'string' }, sets: nullableNumber, repetitions: { type: 'string' }, duration: { type: 'string' },
      rest: { type: 'string' }, maxPain: nullableNumber, tags: stringArray, notes: { type: 'string' },
    }, required: ['name','region','category','objective','startingPosition','instructions','precautions','equipment','difficulty','sets','repetitions','duration','rest','maxPain','tags','notes'] } },
    missingFields: stringArray, uncertainFields: stringArray, contradictions: stringArray, followUpQuestion: { type: 'string' },proposedActions:stringArray,
  },
  required: ['intent','selectedPatientId','selectedPlanId','patient','plan','exercises','missingFields','uncertainFields','contradictions','followUpQuestion','proposedActions'],
} as const;

function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function list(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function numberOrNull(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function localId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }

export function normalizeAtalAIDraft(value: unknown, existingId?: string): AtalAIDraft {
  if (!value || typeof value !== 'object') throw new Error('La respuesta de Atal IA no contiene un borrador válido.');
  const source = value as Record<string, unknown>;
  const patient = (source.patient ?? {}) as Record<string, unknown>;
  const plan = (source.plan ?? {}) as Record<string, unknown>;
  const duration = (plan.duration ?? {}) as Record<string, unknown>;
  const frequency = (plan.frequency ?? {}) as Record<string, unknown>;
  const exercises = Array.isArray(source.exercises) ? source.exercises : [];
  const now = new Date().toISOString();
  const exerciseDrafts: AIExerciseDraft[] = exercises.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return { id: localId('ai-exercise'), name: text(item.name), region: text(item.region), category: text(item.category), objective: text(item.objective), startingPosition: text(item.startingPosition), instructions: list(item.instructions), precautions: list(item.precautions), equipment: text(item.equipment), difficulty: text(item.difficulty), sets: numberOrNull(item.sets), repetitions: text(item.repetitions), duration: text(item.duration), rest: text(item.rest), maxPain: numberOrNull(item.maxPain), tags: list(item.tags), notes: text(item.notes), reusePreference: 'reuse-exact' };
  });
  const intents=['create_patient_plan','create_plan_for_existing_patient','create_exercise','update_patient_record','update_existing_plan'] as const;const intent=intents.includes(source.intent as typeof intents[number])?source.intent as typeof intents[number]:'create_patient_plan';
  return {
    id: existingId ?? localId('ai-draft'), intent,selectedPatientId:text(source.selectedPatientId),selectedPlanId:text(source.selectedPlanId),
    patient: { name: text(patient.name), age: numberOrNull(patient.age), birthDate: text(patient.birthDate), sex: text(patient.sex), reasonForVisit: text(patient.reasonForVisit), affectedArea: text(patient.affectedArea), evolutionTime: text(patient.evolutionTime), providedDiagnosis: text(patient.providedDiagnosis), painLevel: numberOrNull(patient.painLevel), symptoms: list(patient.symptoms), functionalLimitations: list(patient.functionalLimitations), goals: list(patient.goals), relevantHistory: list(patient.relevantHistory), precautions: list(patient.precautions), clinicalNotes: text(patient.clinicalNotes) },
    plan: { title: text(plan.title), goal: text(plan.goal), focus: text(plan.focus), duration: { value: numberOrNull(duration.value), unit: ['days','weeks','months','custom'].includes(text(duration.unit)) ? text(duration.unit) as 'days'|'weeks'|'months'|'custom' : 'custom', customText: text(duration.customText) }, frequency: { value: numberOrNull(frequency.value), period: ['day','week','month','custom'].includes(text(frequency.period)) ? text(frequency.period) as 'day'|'week'|'month'|'custom' : 'custom', customText: text(frequency.customText) }, phases: list(plan.phases), generalInstructions: text(plan.generalInstructions), status: plan.status === 'active' ? 'active' : 'draft' },
    exercises: exerciseDrafts, missingFields: list(source.missingFields), uncertainFields: list(source.uncertainFields), contradictions: list(source.contradictions), followUpQuestion: text(source.followUpQuestion),proposedActions:list(source.proposedActions), createdAt: now, updatedAt: now,
  };
}
