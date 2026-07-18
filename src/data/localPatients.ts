import { createPatient, getAtalState, mutateAtalStore, setPatientArchived, updatePatient, useAtalStore, type PatientEntity, type PatientStatus } from './atalStore';

export const LOCAL_PATIENTS_KEY = 'atal:local-patients:v1';
export type PatientContact = PatientEntity['contact'];
export type LocalPatient = PatientEntity;
export type NewLocalPatient = { name:string; diagnosis:string; age?:number|null; birthDate?:string; sex?:string; affectedArea?:string; contact?:Partial<PatientContact>; status?:PatientStatus; visitType?:'first'|'followup' };
export type PatientView = PatientEntity & { plan:string; progress:number; time:string; adherence:number };

export const statusColor:Record<PatientStatus,string>={active:'#16a36a',attention:'#2563eb',archived:'#7f8582'};

function toView(patient:PatientEntity):PatientView{
  const state=getAtalState(); const plans=state.plans.filter((plan)=>plan.patientId===patient.id); const active=plans.find((plan)=>plan.status==='active');
  const sessions=state.sessions.filter((session)=>session.patientId===patient.id); const planSessions=active?sessions.filter((session)=>session.planId===active.id):[];
  const completed=planSessions.filter((session)=>session.status==='completed').length; const progress=planSessions.length?Math.min(100,Math.round((completed/Math.max(1,planSessions.length))*100)):0;
  const adherence=planSessions.length?Math.round((completed/planSessions.length)*100):0; const latest=sessions[0];
  return {...patient,plan:active?.title??'Sin plan activo',progress,adherence,time:latest?new Date(latest.completedAt).toLocaleDateString('es-MX',{day:'numeric',month:'short'}):'Sin sesiones'};
}

export function readLocalPatients(){return getAtalState().patients;}
export function writeLocalPatients(items:LocalPatient[]){mutateAtalStore((draft)=>{draft.patients=items;});}
export function createLocalPatient(input:NewLocalPatient){return createPatient({name:input.name.trim(),diagnosis:input.diagnosis.trim()||'Motivo por completar',age:input.age??null,birthDate:input.birthDate??'',sex:input.sex??'',affectedArea:input.affectedArea??'',status:input.status??'active',visitType:input.visitType??'first',contact:{phone:input.contact?.phone??'',email:input.contact?.email??'',address:input.contact?.address??'',emergencyContact:input.contact?.emergencyContact??''}});}
export function updateLocalPatient(id:string,patch:Partial<LocalPatient>){return updatePatient(id,patch);}
export function archiveLocalPatient(id:string){return setPatientArchived(id,true);}
export function restoreLocalPatient(id:string){return setPatientArchived(id,false);}
export function getPatientCatalog(){return getAtalState().patients.map(toView);}
export function usePatientCatalog(){return useAtalStore((state)=>state.patients.map((patient)=>{const plans=state.plans.filter((plan)=>plan.patientId===patient.id);const active=plans.find((plan)=>plan.status==='active');const sessions=state.sessions.filter((session)=>session.patientId===patient.id);const planSessions=active?sessions.filter((session)=>session.planId===active.id):[];const completed=planSessions.filter((session)=>session.status==='completed').length;return {...patient,plan:active?.title??'Sin plan activo',progress:planSessions.length?Math.round(completed/planSessions.length*100):0,adherence:planSessions.length?Math.round(completed/planSessions.length*100):0,time:sessions[0]?new Date(sessions[0].completedAt).toLocaleDateString('es-MX',{day:'numeric',month:'short'}):'Sin sesiones'};}));}
export function getPatientById(id:string){const patient=getAtalState().patients.find((item)=>item.id===id);return patient?toView(patient):null;}
export type { PatientStatus };
