import { useMemo, useSyncExternalStore } from 'react';
import { exercises as demoExercises, patients as demoPatients, plans as demoPlans } from './atal-demo';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';
import type { GuidedSessionDraft, Symptom } from '@/src/features/guided-session/types';
import { mergeMissingById } from './demoSeed';

export const ATAL_STORE_KEY = 'atal:store:v2';
export const ATAL_STORE_VERSION = 2;
export const ATAL_DEMO_SEED_KEY = 'atal:demo-seed:v3';

export type PatientStatus = 'active' | 'attention' | 'archived';
export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type ExerciseStatus = 'active' | 'archived';

export type PatientEntity = {
  id: string; name: string; diagnosis: string; age: number | null; birthDate: string; sex: string; affectedArea: string;
  status: PatientStatus; visitType: 'first'|'followup'; contact: { phone: string; email: string; address: string; emergencyContact: string };
  createdAt: string; updatedAt: string;
};

export type PlanEntity = {
  id: string; patientId: string; title: string; focus: string; duration: string; frequency: string; goal: string;
  exerciseIds: string[]; status: PlanStatus; progression: string; reportCriteria: string; generalInstructions: string;
  createdAt: string; updatedAt: string;
};

export type ExerciseMediaRef = { type: 'image' | 'video' | 'animation' | 'sequence' | 'none'; mediaId?: string; thumbnailId?: string };
export type ExerciseEntity = {
  id: string; name: string; region: string; category: string; objective: string; startingPosition: string;
  instructions: string[]; precautions: string; equipment: string; difficulty: string; sets: number; repetitions?: number;
  time?: string; rest: string; maxPain: number | null; tags: string[]; notes: string; media: ExerciseMediaRef;
  status: ExerciseStatus; source: 'seed' | 'local'; createdAt: string; updatedAt: string;
};

export type SessionRecord = {
  id: string; patientId: string; planId: string; startedAt: string; completedAt: string; status: 'partial' | 'completed';
  startPain: number; startEnergy: number; startComment: string; exercises: GuidedSessionDraft['exercises']; endPain: number;
  endEnergy: number; effort: number; symptoms: Symptom[]; comment: string; easiest: string; hardest: string; discomfort: string;
  durationMinutes: number; reviewedAt?: string; clinicalObservation: string; createdAt: string; updatedAt: string;
};

export type PatientNote = { id: string; patientId: string; content: string; professional: string; createdAt: string; updatedAt: string };
export type ActivityKind = 'patient_created'|'patient_updated'|'patient_archived'|'patient_restored'|'record_created'|'record_updated'|'plan_created'|'plan_updated'|'plan_activated'|'plan_paused'|'plan_completed'|'plan_archived'|'plan_restored'|'session_started'|'session_completed'|'session_partial'|'report_reviewed'|'observation_added'|'exercise_created'|'ai_applied';
export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  patientId?: string;
  planId?: string;
  sessionId?: string;
  title: string;
  detail: string;
  createdAt: string;
  origin?: 'manual' | 'atal-ai';
  intent?: string;
  entity?: string;
  entityId?: string;
  changedFields?: string[];
  previousValue?: unknown;
  nextValue?: unknown;
  conversationId?: string;
  draftId?: string;
};
export type AppNotification = { id: string; title: string; detail: string; severity: 'urgent'|'attention'|'stable'; href: string; read: boolean; createdAt: string };
export type AppSettings = {
  notifications: boolean; haptics: boolean; compact: boolean; professionalName: string; specialty: string; clinic: string;
  sessionLock: boolean; clinicalPrivacy: boolean; aiSuggestions: boolean; aiAlerts: boolean; aiInstructions: string;
};
export type FeedbackEntry = { id: string; category: string; title: string; description: string; screen: string; appVersion: string; device: string; email: string; contactAllowed: boolean; screenshotName?: string; createdAt: string; status: 'prepared'|'shared'|'downloaded'|'copied' };
export type ClinicalRecordVersion = { id: string; recordId: string; patientId: string; version: number; snapshot: ClinicalRecord; createdAt: string };

export type AtalState = {
  version: 2; seededAt: string; updatedAt: string; patients: PatientEntity[]; plans: PlanEntity[]; exercises: ExerciseEntity[];
  clinicalRecords: ClinicalRecord[]; clinicalRecordVersions: ClinicalRecordVersion[]; sessions: SessionRecord[]; notes: PatientNote[];
  events: ActivityEvent[]; notifications: AppNotification[]; settings: AppSettings; feedback: FeedbackEntry[];
};

const listeners = new Set<() => void>();
let cache: AtalState | null = null;

const now = () => new Date().toISOString();
export function createEntityId(prefix: string) { return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`; }
function safeArray(value: unknown) { return Array.isArray(value) ? value : []; }
function safeJson(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
function iso(value: unknown, fallback: string) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback; }

function seedState(): AtalState {
  const timestamp = now();
  const areas=['Rodilla','Hombro','Columna','Cadera','Tobillo','Cuello'];
  const patients: PatientEntity[] = demoPatients.map((patient,index) => ({ id: patient.id, name: patient.name, diagnosis: patient.diagnosis, age: 24+(index*3)%48, birthDate: '', sex: '', affectedArea: areas[index%areas.length], status: patient.status, visitType:index%3===0?'followup':'first', contact: { phone:'',email:'',address:'',emergencyContact:'' }, createdAt: timestamp, updatedAt: timestamp }));
  const exercises: ExerciseEntity[] = demoExercises.map((exercise, index) => ({ id: exercise.id, name: exercise.name, region: exercise.region, category: exercise.category, objective: 'Mejorar control, movilidad y tolerancia al esfuerzo.', startingPosition: 'Posición estable y cómoda.', instructions: ['Realiza el movimiento con control.','Respira con normalidad y evita compensaciones.'], precautions: 'Detente ante dolor intenso o síntomas nuevos.', equipment: ['Sin equipo','Banda elástica','Mancuernas'][index%3], difficulty: ['Inicial','Intermedio','Avanzado'][index%3], sets: 2+(index%3), repetitions: 8+(index%5)*2, rest: `${30+(index%3)*15} segundos`, maxPain: index%4===3?5:3, tags: [exercise.region, exercise.category], notes: '', media: { type: 'image' }, status: 'active', source: 'seed', createdAt: timestamp, updatedAt: timestamp }));
  const plans: PlanEntity[] = demoPlans.map((plan, index) => ({ id: plan.id, patientId: patients.find((patient) => patient.name === plan.patient)?.id ?? patients[index % patients.length].id, title: plan.title, focus: plan.phase, duration: plan.duration, frequency: plan.frequency, goal: 'Recuperar función y tolerancia al movimiento.', exerciseIds: exercises.slice(index % 6, index % 6 + 3).map((exercise) => exercise.id), status: plan.status, progression: 'Aumentar según tolerancia y calidad del movimiento.', reportCriteria: 'Reportar dolor elevado, síntomas o imposibilidad para completar.', generalInstructions: 'Realiza los ejercicios con calma y sigue las indicaciones de tu fisioterapeuta.', createdAt: timestamp, updatedAt: timestamp }));
  const session=(id:string,patientId:string,planId:string,days:number,status:'partial'|'completed',endPain:number,reviewed:boolean):SessionRecord=>{const completedAt=new Date(Date.now()-days*86400000).toISOString();return{id,patientId,planId,startedAt:new Date(Date.parse(completedAt)-32*60000).toISOString(),completedAt,status,startPain:Math.min(10,endPain+2),startEnergy:6,startComment:'',exercises:{},endPain,endEnergy:status==='completed'?7:4,effort:endPain>=7?5:3,symptoms:endPain>=7?['dolor']:['ninguno'],comment:status==='partial'?'Sesión interrumpida por molestia.':'Sesión completada.',easiest:'',hardest:'',discomfort:endPain>=7?'Molestia durante el último ejercicio.':'',durationMinutes:status==='completed'?32:18,reviewedAt:reviewed?completedAt:undefined,clinicalObservation:reviewed?'Evolución revisada.':'',createdAt:completedAt,updatedAt:completedAt};};
  const sessions:SessionRecord[]=[session('seed-session-01','p01','pl01',0,'completed',2,true),session('seed-session-02','p01','pl01',3,'completed',3,true),session('seed-session-03','p02','pl02',0,'partial',8,false),session('seed-session-04','p03','pl03',1,'completed',5,false),session('seed-session-05','p14','pl09',2,'partial',6,false),session('seed-session-06','p15','pl10',5,'completed',1,true)];
  const clinicalRecords:ClinicalRecord[]=patients.slice(0,8).map((patient,index)=>({id:`seed-record-${patient.id}`,patientId:patient.id,version:1,date:timestamp,reasonForVisit:patient.diagnosis,evolution:`${2+index} semanas`,affectedArea:patient.affectedArea,symptoms:index%3===0?['dolor','rigidez']:['dolor'],painLevel:[2,8,5,4,3,6,2,7][index],providedDiagnosis:patient.diagnosis,functionalLimitations:['Actividad demostrativa limitada'],goals:['Recuperar movilidad funcional'],relevantHistory:[],precautions:index===1?['Vigilar dolor irradiado']:[],clinicalNotes:'Expediente demostrativo para evaluación visual.',planId:plans.find((plan)=>plan.patientId===patient.id)?.id??'',professional:'Cuenta demo',createdAt:timestamp,updatedAt:timestamp}));
  const notes:PatientNote[]=[{id:'seed-note-01',patientId:'p01',content:'Tolera mejor la progresión de carga.',professional:'Cuenta demo',createdAt:timestamp,updatedAt:timestamp},{id:'seed-note-02',patientId:'p02',content:'Revisar dolor alto antes de continuar.',professional:'Cuenta demo',createdAt:timestamp,updatedAt:timestamp},{id:'seed-note-03',patientId:'p14',content:'Plan pausado de forma preventiva.',professional:'Cuenta demo',createdAt:timestamp,updatedAt:timestamp}];
  const events: ActivityEvent[] = [...sessions.map((item)=>({id:`seed-event-${item.id}`,kind:item.status==='completed'?'session_completed' as const:'session_partial' as const,patientId:item.patientId,planId:item.planId,sessionId:item.id,title:item.status==='completed'?'Sesión completada':'Sesión parcial',detail:patients.find((patient)=>patient.id===item.patientId)?.name??'Paciente demo',createdAt:item.completedAt})),...patients.slice(0,4).map((patient, index) => ({ id: `seed-event-${patient.id}`, kind: 'patient_created' as const, patientId: patient.id, title: 'Paciente', detail: patient.name, createdAt: new Date(Date.now() - (index+8) * 3600000).toISOString() }))];
  const notifications:AppNotification[]=[{id:'seed-notification-critical',title:'Dolor alto',detail:'Paciente Demo 02 · Dolor 8/10',severity:'urgent',href:'/activity/seed-session-03',read:false,createdAt:sessions[2].completedAt},{id:'seed-notification-review',title:'Reporte pendiente',detail:'Paciente Demo 03 · Dolor 5/10',severity:'attention',href:'/activity/seed-session-04',read:false,createdAt:sessions[3].completedAt},{id:'seed-notification-stable',title:'Evolución estable',detail:'Paciente Demo 01 · Dolor 2/10',severity:'stable',href:'/activity/seed-session-01',read:true,createdAt:sessions[0].completedAt}];
  return { version: 2, seededAt: timestamp, updatedAt: timestamp, patients, plans, exercises, clinicalRecords, clinicalRecordVersions: [], sessions, notes, events, notifications, settings: { notifications: true, haptics: true, compact: true, professionalName: 'Cuenta demo', specialty: 'Fisioterapeuta', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: 'Prioriza claridad, seguridad clínica y decisiones fáciles de revisar.' }, feedback: [] };
}

function mergeDemoSeed(state:AtalState):AtalState{const seed=seedState();return{...state,patients:mergeMissingById(state.patients,seed.patients),plans:mergeMissingById(state.plans,seed.plans),exercises:mergeMissingById(state.exercises,seed.exercises),clinicalRecords:mergeMissingById(state.clinicalRecords,seed.clinicalRecords),sessions:mergeMissingById(state.sessions,seed.sessions),notes:mergeMissingById(state.notes,seed.notes),events:mergeMissingById(state.events,seed.events),notifications:mergeMissingById(state.notifications,seed.notifications)};}

function mergeLegacy(base: AtalState): AtalState {
  const timestamp = now();
  const next = structuredClone(base);
  for (const raw of safeArray(safeJson('atal:local-patients:v1'))) {
    if (!raw || typeof raw !== 'object') continue; const item = raw as Record<string, unknown>; if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const patient: PatientEntity = { id:item.id,name:item.name,diagnosis:typeof item.diagnosis==='string'?item.diagnosis:'Motivo por completar',age:typeof item.age==='number'?item.age:null,birthDate:typeof item.birthDate==='string'?item.birthDate:'',sex:typeof item.sex==='string'?item.sex:'',affectedArea:typeof item.affectedArea==='string'?item.affectedArea:'',status:item.status==='archived'?'archived':item.status==='attention'?'attention':'active',visitType:item.visitType==='followup'?'followup':'first',contact:{phone:'',email:'',address:'',emergencyContact:'',...(item.contact && typeof item.contact==='object'?item.contact as object:{})},createdAt:iso(item.createdAt,timestamp),updatedAt:iso(item.updatedAt,timestamp)};
    next.patients = [...next.patients.filter((entry) => entry.id !== patient.id), patient];
  }
  for (const raw of safeArray(safeJson('atal:local-exercises:v1'))) {
    if (!raw || typeof raw !== 'object') continue; const item = raw as Record<string, unknown>; if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const exercise: ExerciseEntity = { id:item.id,name:item.name,region:typeof item.region==='string'?item.region:'Personalizada',category:typeof item.category==='string'?item.category:'Personalizado',objective:typeof item.objective==='string'?item.objective:'',startingPosition:typeof item.startingPosition==='string'?item.startingPosition:'',instructions:safeArray(item.instructions).filter((value):value is string=>typeof value==='string'),precautions:typeof item.precautions==='string'?item.precautions:'',equipment:typeof item.equipment==='string'?item.equipment:'',difficulty:typeof item.difficulty==='string'?item.difficulty:'',sets:typeof item.sets==='number'?item.sets:1,repetitions:typeof item.repetitions==='number'?item.repetitions:undefined,time:typeof item.time==='string'?item.time:undefined,rest:typeof item.rest==='string'?item.rest:'',maxPain:typeof item.maxPain==='number'?item.maxPain:null,tags:safeArray(item.tags).filter((value):value is string=>typeof value==='string'),notes:typeof item.notes==='string'?item.notes:'',media:item.media && typeof item.media==='object'?item.media as ExerciseMediaRef:{type:'none'},status:'active',source:'local',createdAt:iso(item.createdAt,timestamp),updatedAt:iso(item.updatedAt,timestamp)};
    next.exercises = [...next.exercises.filter((entry) => entry.id !== exercise.id), exercise];
  }
  for (const raw of safeArray(safeJson('atal:local-plans:v1'))) {
    if (!raw || typeof raw !== 'object') continue; const item = raw as Record<string, unknown>; if (typeof item.id !== 'string' || typeof item.patientId !== 'string' || typeof item.title !== 'string') continue;
    const status: PlanStatus = ['active','draft','paused','completed','archived'].includes(String(item.status)) ? item.status as PlanStatus : 'draft';
    const plan: PlanEntity = { id:item.id,patientId:item.patientId,title:item.title,focus:typeof item.focus==='string'?item.focus:'',duration:typeof item.duration==='string'?item.duration:'Por definir',frequency:typeof item.frequency==='string'?item.frequency:'Por definir',goal:typeof item.goal==='string'?item.goal:'',exerciseIds:safeArray(item.exerciseIds).filter((value):value is string=>typeof value==='string'),status,progression:typeof item.progression==='string'?item.progression:'',reportCriteria:typeof item.reportCriteria==='string'?item.reportCriteria:'',generalInstructions:typeof item.generalInstructions==='string'?item.generalInstructions:'',createdAt:iso(item.createdAt,timestamp),updatedAt:iso(item.updatedAt,timestamp)};
    next.plans = [...next.plans.filter((entry) => entry.id !== plan.id), plan];
  }
  for (const raw of safeArray(safeJson('atal:clinical-records:v1'))) if (raw && typeof raw === 'object' && typeof (raw as ClinicalRecord).id === 'string') next.clinicalRecords = [...next.clinicalRecords.filter((record) => record.id !== (raw as ClinicalRecord).id), raw as ClinicalRecord];
  next.updatedAt = timestamp;
  return next;
}

function isState(value: unknown): value is AtalState { const state = value as Partial<AtalState>; return Boolean(value && typeof value==='object' && state.version===2 && Array.isArray(state.patients) && Array.isArray(state.plans) && Array.isArray(state.exercises)); }
function loadState() {
  if (cache) return cache;
  const stored = typeof window !== 'undefined' ? safeJson(ATAL_STORE_KEY) : null;
  if (isState(stored)) {
    const timestamp = now();
    let normalized: AtalState = {
      ...stored,
      patients: stored.patients.map((patient) => ({
        ...patient,
        age: typeof patient.age === 'number' ? patient.age : null,
        birthDate: patient.birthDate ?? '',
        sex: patient.sex ?? '',
        affectedArea: patient.affectedArea ?? '',
        visitType: patient.visitType === 'followup' ? 'followup' : 'first',
        contact: {
          phone: patient.contact?.phone ?? '',
          email: patient.contact?.email ?? '',
          address: patient.contact?.address ?? '',
          emergencyContact: patient.contact?.emergencyContact ?? '',
        },
        createdAt: iso(patient.createdAt, timestamp),
        updatedAt: iso(patient.updatedAt, timestamp),
      })),
      plans: stored.plans.map((plan) => ({
        ...plan,
        exerciseIds: safeArray(plan.exerciseIds).filter((value): value is string => typeof value === 'string'),
        progression: plan.progression ?? '',
        reportCriteria: plan.reportCriteria ?? '',
        generalInstructions: plan.generalInstructions ?? '',
        createdAt: iso(plan.createdAt, timestamp),
        updatedAt: iso(plan.updatedAt, timestamp),
      })),
      exercises: stored.exercises.map((exercise) => ({
        ...exercise,
        instructions: safeArray(exercise.instructions).filter((value): value is string => typeof value === 'string'),
        tags: safeArray(exercise.tags).filter((value): value is string => typeof value === 'string'),
        media: exercise.media ?? { type: 'none' },
        status: exercise.status === 'archived' ? 'archived' : 'active',
        createdAt: iso(exercise.createdAt, timestamp),
        updatedAt: iso(exercise.updatedAt, timestamp),
      })),
      clinicalRecords: safeArray(stored.clinicalRecords) as ClinicalRecord[],
      clinicalRecordVersions: safeArray(stored.clinicalRecordVersions) as ClinicalRecordVersion[],
      sessions: safeArray(stored.sessions) as SessionRecord[],
      notes: safeArray(stored.notes) as PatientNote[],
      events: safeArray(stored.events) as ActivityEvent[],
      notifications: safeArray(stored.notifications) as AppNotification[],
      feedback: safeArray(stored.feedback) as FeedbackEntry[],
      settings: { ...seedState().settings, ...stored.settings },
    };
    if (typeof window !== 'undefined' && localStorage.getItem(ATAL_DEMO_SEED_KEY) !== '1') {
      normalized = mergeDemoSeed(normalized);
      localStorage.setItem(ATAL_DEMO_SEED_KEY, '1');
    }
    cache = normalized;
    if (typeof window !== 'undefined') localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(cache));
    return cache;
  }
  cache = mergeLegacy(seedState());
  if (typeof window !== 'undefined') {
    localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(cache));
    localStorage.setItem(ATAL_DEMO_SEED_KEY, '1');
  }
  return cache;
}

function emit() { for (const listener of listeners) listener(); }
export function subscribeAtalStore(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getAtalState() { return loadState(); }
export function useAtalStore<T>(selector: (state: AtalState) => T) { const state=useSyncExternalStore(subscribeAtalStore,loadState,loadState);return useMemo(()=>selector(state),[state,selector]); }
export function mutateAtalStore(mutator: (draft: AtalState) => void) {
  const previous = loadState(); const next = structuredClone(previous); mutator(next); next.updatedAt = now();
  try { localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(next)); cache = next; emit();if(next.settings.haptics&&typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(8);return next; } catch (error) { cache = previous; throw error; }
}

function addEvent(draft: AtalState, event: Omit<ActivityEvent,'id'|'createdAt'>) { draft.events.unshift({ id:createEntityId('event'),createdAt:now(),...event }); }
function addNotification(draft: AtalState, notification: Omit<AppNotification,'id'|'read'|'createdAt'>) { if (!draft.settings.notifications) return; draft.notifications.unshift({ id:createEntityId('notification'),read:false,createdAt:now(),...notification }); }

export function createPatient(input: Omit<PatientEntity,'id'|'createdAt'|'updatedAt'>) { const timestamp=now(); const patient={...input,id:createEntityId('patient'),createdAt:timestamp,updatedAt:timestamp}; mutateAtalStore((draft)=>{draft.patients.push(patient);addEvent(draft,{kind:'patient_created',patientId:patient.id,title:'Paciente creado',detail:patient.name});}); return patient; }
export function createPatientWithRecord(patientInput:Omit<PatientEntity,'id'|'createdAt'|'updatedAt'>,recordInput:Omit<ClinicalRecord,'id'|'patientId'|'version'|'createdAt'|'updatedAt'>){const timestamp=now();const patient:PatientEntity={...patientInput,id:createEntityId('patient'),createdAt:timestamp,updatedAt:timestamp};const record:ClinicalRecord={...recordInput,id:createEntityId('record'),patientId:patient.id,version:1,createdAt:timestamp,updatedAt:timestamp};mutateAtalStore((draft)=>{draft.patients.push(patient);draft.clinicalRecords.push(record);addEvent(draft,{kind:'patient_created',patientId:patient.id,title:'Paciente creado',detail:patient.name});addEvent(draft,{kind:'record_created',patientId:patient.id,title:'Expediente creado',detail:'Versión 1'});});return{patient,record};}
export function updatePatient(id:string, patch:Partial<PatientEntity>) { let result:PatientEntity|null=null; mutateAtalStore((draft)=>{const index=draft.patients.findIndex((item)=>item.id===id);if(index<0)throw new Error('Paciente no encontrado.');result={...draft.patients[index],...patch,id,updatedAt:now()};draft.patients[index]=result;addEvent(draft,{kind:'patient_updated',patientId:id,title:'Paciente actualizado',detail:result.name});}); return result; }
export function setPatientArchived(id:string,archived:boolean){let result:PatientEntity|null=null;mutateAtalStore((draft)=>{const patient=draft.patients.find((item)=>item.id===id);if(!patient)throw new Error('Paciente no encontrado.');patient.status=archived?'archived':'active';patient.updatedAt=now();result=patient;addEvent(draft,{kind:archived?'patient_archived':'patient_restored',patientId:id,title:archived?'Paciente archivado':'Paciente restaurado',detail:patient.name});});return result;}
export function addPatientNote(patientId:string,content:string,professional:string){const timestamp=now();const note:PatientNote={id:createEntityId('note'),patientId,content:content.trim(),professional,createdAt:timestamp,updatedAt:timestamp};mutateAtalStore((draft)=>{draft.notes.unshift(note);addEvent(draft,{kind:'observation_added',patientId,title:'Observación añadida',detail:note.content.slice(0,90)});});return note;}
export function updatePatientNote(id:string,content:string){mutateAtalStore((draft)=>{const note=draft.notes.find((item)=>item.id===id);if(!note)throw new Error('Nota no encontrada.');note.content=content.trim();note.updatedAt=now();});}
export function deletePatientNote(id:string){mutateAtalStore((draft)=>{draft.notes=draft.notes.filter((item)=>item.id!==id);});}

export function createPlan(input:Omit<PlanEntity,'id'|'createdAt'|'updatedAt'>){const timestamp=now();const plan={...input,id:createEntityId('plan'),exerciseIds:[...new Set(input.exerciseIds)],createdAt:timestamp,updatedAt:timestamp};mutateAtalStore((draft)=>{draft.plans.push(plan);const record=draft.clinicalRecords.find((item)=>item.patientId===plan.patientId);if(record){record.planId=plan.id;record.updatedAt=timestamp;}addEvent(draft,{kind:'plan_created',patientId:plan.patientId,planId:plan.id,title:'Plan creado',detail:plan.title});});return plan;}
export function updatePlan(id:string,patch:Partial<PlanEntity>){let result:PlanEntity|null=null;mutateAtalStore((draft)=>{const index=draft.plans.findIndex((item)=>item.id===id);if(index<0)throw new Error('Plan no encontrado.');result={...draft.plans[index],...patch,id,exerciseIds:patch.exerciseIds?[...new Set(patch.exerciseIds)]:draft.plans[index].exerciseIds,updatedAt:now()};draft.plans[index]=result;addEvent(draft,{kind:'plan_updated',patientId:result.patientId,planId:id,title:'Plan actualizado',detail:result.title});});return result;}
export function findActivePlanConflict(planId:string){const state=loadState();const plan=state.plans.find((item)=>item.id===planId);return plan?state.plans.find((item)=>item.patientId===plan.patientId&&item.status==='active'&&item.id!==planId)??null:null;}
export function updatePlanStatus(id:string,status:PlanStatus,resolveConflict?:'pause'|'complete'|'archive'){mutateAtalStore((draft)=>{const plan=draft.plans.find((item)=>item.id===id);if(!plan)throw new Error('Plan no encontrado.');if(status==='active'){const current=draft.plans.find((item)=>item.patientId===plan.patientId&&item.status==='active'&&item.id!==id);if(current&&!resolveConflict)throw new Error(`ACTIVE_PLAN_CONFLICT:${current.id}`);if(current){current.status=resolveConflict==='complete'?'completed':resolveConflict==='archive'?'archived':'paused';current.updatedAt=now();const previousKind:ActivityKind=current.status==='completed'?'plan_completed':current.status==='archived'?'plan_archived':'plan_paused';addEvent(draft,{kind:previousKind,patientId:current.patientId,planId:current.id,title:`Plan ${current.status==='completed'?'completado':current.status==='archived'?'archivado':'pausado'}`,detail:current.title});}}plan.status=status;plan.updatedAt=now();const kind:ActivityKind=status==='active'?'plan_activated':status==='paused'?'plan_paused':status==='completed'?'plan_completed':status==='archived'?'plan_archived':'plan_restored';addEvent(draft,{kind,patientId:plan.patientId,planId:id,title:`Plan ${status==='active'?'activado':status==='paused'?'pausado':status==='completed'?'completado':status==='archived'?'archivado':'restaurado'}`,detail:plan.title});if(status==='active')addNotification(draft,{title:'Plan activo',detail:`${plan.title} ya está disponible para el paciente.`,severity:'stable',href:`/plans/${id}`});});}
export function duplicatePlan(id:string){const source=loadState().plans.find((item)=>item.id===id);if(!source)throw new Error('Plan no encontrado.');return createPlan({...source,id:undefined,createdAt:undefined,updatedAt:undefined,title:`${source.title} — copia`,status:'draft'} as unknown as Omit<PlanEntity,'id'|'createdAt'|'updatedAt'>);}
export function deletePlan(id:string){const state=loadState();if(state.sessions.some((session)=>session.planId===id))throw new Error('Este plan tiene sesiones y no puede eliminarse. Archívalo para conservar el historial.');mutateAtalStore((draft)=>{draft.plans=draft.plans.filter((item)=>item.id!==id);});}

export function createExercise(input:Omit<ExerciseEntity,'id'|'createdAt'|'updatedAt'>){const timestamp=now();const exercise={...input,id:createEntityId('exercise'),createdAt:timestamp,updatedAt:timestamp};mutateAtalStore((draft)=>{draft.exercises.push(exercise);addEvent(draft,{kind:'exercise_created',title:'Ejercicio creado',detail:exercise.name});});return exercise;}
export function updateExercise(id:string,patch:Partial<ExerciseEntity>){let result:ExerciseEntity|null=null;mutateAtalStore((draft)=>{const index=draft.exercises.findIndex((item)=>item.id===id);if(index<0)throw new Error('Ejercicio no encontrado.');result={...draft.exercises[index],...patch,id,updatedAt:now()};draft.exercises[index]=result;});return result;}
export function duplicateExercise(id:string){const source=loadState().exercises.find((item)=>item.id===id);if(!source)throw new Error('Ejercicio no encontrado.');return createExercise({...source,id:undefined,createdAt:undefined,updatedAt:undefined,name:`${source.name} — copia`,status:'active',source:'local'} as unknown as Omit<ExerciseEntity,'id'|'createdAt'|'updatedAt'>);}
export function archiveExercise(id:string,archived:boolean){return updateExercise(id,{status:archived?'archived':'active'});}
export function deleteExercise(id:string){const state=loadState();if(state.plans.some((plan)=>plan.exerciseIds.includes(id)))throw new Error('Este ejercicio está relacionado con un plan y no puede eliminarse.');mutateAtalStore((draft)=>{draft.exercises=draft.exercises.filter((item)=>item.id!==id);});}

export function saveClinicalRecord(input:ClinicalRecord){let result=input;mutateAtalStore((draft)=>{const existing=draft.clinicalRecords.find((item)=>item.patientId===input.patientId);if(existing){draft.clinicalRecordVersions.push({id:createEntityId('record-version'),recordId:existing.id,patientId:existing.patientId,version:existing.version,snapshot:structuredClone(existing),createdAt:now()});result={...existing,...input,id:existing.id,version:existing.version+1,createdAt:existing.createdAt,updatedAt:now()};draft.clinicalRecords=draft.clinicalRecords.map((item)=>item.id===existing.id?result:item);addEvent(draft,{kind:'record_updated',patientId:input.patientId,title:'Expediente actualizado',detail:`Versión ${result.version}`});}else{result={...input,id:input.id||createEntityId('record'),version:Math.max(1,input.version||1),createdAt:input.createdAt||now(),updatedAt:now()};draft.clinicalRecords.push(result);addEvent(draft,{kind:'record_created',patientId:input.patientId,title:'Expediente creado',detail:`Versión ${result.version}`});}});return result;}
export function saveCompletedSession(patientId:string,planId:string,draftSession:GuidedSessionDraft){const existing=loadState().sessions.find((item)=>item.patientId===patientId&&item.planId===planId&&item.startedAt===draftSession.startedAt);if(existing)return existing;const completedAt=draftSession.completedAt??now();const durationMinutes=Math.max(1,Math.round((Date.parse(completedAt)-Date.parse(draftSession.startedAt??completedAt))/60000));const session:SessionRecord={id:createEntityId('session'),patientId,planId,startedAt:draftSession.startedAt??completedAt,completedAt,status:draftSession.status==='completed'?'completed':'partial',startPain:draftSession.start.pain,startEnergy:draftSession.start.energy,startComment:draftSession.start.comment,exercises:structuredClone(draftSession.exercises),endPain:draftSession.end.pain,endEnergy:draftSession.end.energy,effort:draftSession.end.effort,symptoms:draftSession.end.symptoms,comment:draftSession.end.comment,easiest:draftSession.end.easiest,hardest:draftSession.end.hardest,discomfort:draftSession.end.discomfort,durationMinutes,clinicalObservation:'',createdAt:completedAt,updatedAt:completedAt};mutateAtalStore((state)=>{state.sessions.unshift(session);const patient=state.patients.find((item)=>item.id===patientId);const alert=session.endPain>=7||session.symptoms.some((item)=>!['ninguno','otro'].includes(item));addEvent(state,{kind:session.status==='completed'?'session_completed':'session_partial',patientId,planId,sessionId:session.id,title:session.status==='completed'?'Sesión completada':'Sesión parcial',detail:patient?.name??'Paciente'});addNotification(state,{title:alert?'Sesión requiere atención':'Sesión lista para revisar',detail:`${patient?.name??'Paciente'} · Dolor ${session.endPain}/10`,severity:alert?'urgent':'attention',href:`/activity/${session.id}`});});return session;}
export function recordSessionStarted(patientId:string,planId:string,startedAt:string){mutateAtalStore((draft)=>{if(draft.events.some((event)=>event.kind==='session_started'&&event.patientId===patientId&&event.planId===planId&&event.createdAt===startedAt))return;const patient=draft.patients.find((item)=>item.id===patientId);addEvent(draft,{kind:'session_started',patientId,planId,title:'Sesión iniciada',detail:patient?.name??'Paciente'});});}
export function reviewSession(id:string,observation:string){mutateAtalStore((draft)=>{const session=draft.sessions.find((item)=>item.id===id);if(!session)throw new Error('Sesión no encontrada.');session.clinicalObservation=observation.trim();session.reviewedAt=now();session.updatedAt=now();addEvent(draft,{kind:'report_reviewed',patientId:session.patientId,planId:session.planId,sessionId:id,title:'Reporte revisado',detail:observation.trim()||'Sin observación adicional'});draft.notifications=draft.notifications.map((item)=>item.href===`/activity/${id}`?{...item,read:true}:item);});}

export function updateSettings(patch:Partial<AppSettings>){mutateAtalStore((draft)=>{draft.settings={...draft.settings,...patch};});}
export function markNotificationRead(id:string){mutateAtalStore((draft)=>{const item=draft.notifications.find((entry)=>entry.id===id);if(item)item.read=true;});}
export function markAllNotificationsRead(){mutateAtalStore((draft)=>{draft.notifications.forEach((item)=>{item.read=true;});});}
export function addFeedback(input:Omit<FeedbackEntry,'id'|'createdAt'>){const item={...input,id:createEntityId('feedback'),createdAt:now()};mutateAtalStore((draft)=>{draft.feedback.unshift(item);});return item;}
export function updateFeedbackStatus(id:string,status:FeedbackEntry['status']){mutateAtalStore((draft)=>{const item=draft.feedback.find((entry)=>entry.id===id);if(item)item.status=status;});}
export function addSuccessNotification(title:string,detail:string,href:string){mutateAtalStore((draft)=>{addNotification(draft,{title,detail,severity:'stable',href});addEvent(draft,{kind:'ai_applied',title,detail});});}
export function recordAtalAIEvent(input: Omit<ActivityEvent,'id'|'createdAt'|'kind'|'origin'>) {
  mutateAtalStore((draft) => addEvent(draft, { ...input, kind: 'ai_applied', origin: 'atal-ai' }));
}
export function exportStoreSnapshot(){const state=loadState();return {...state,exportedAt:now(),mediaExcluded:true};}

if (typeof window !== 'undefined') window.addEventListener('storage',(event)=>{if(event.key===ATAL_STORE_KEY){cache=null;emit();}});
