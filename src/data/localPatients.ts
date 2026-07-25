import { createEntityId, getAtalState, mutateAtalStore, useAtalStore, type PatientEntity, type PatientStatus } from './atalStore';
import { applyCreatePatient, applyUpdatePatient, type PatientUpdatePatch } from '@/src/domain/actions/patientActions';
import { applyPatientLifecycle } from '@/src/domain/actions/patientLifecycle';
import { buildPatientCatalog, buildPatientView, type PatientCatalogView } from '@/src/domain/queries/patientCatalog';

export const LOCAL_PATIENTS_KEY = 'atal:local-patients:v1';
export type PatientContact = PatientEntity['contact'];
export type LocalPatient = PatientEntity;
export type NewLocalPatient = { name:string; diagnosis:string; age?:number|null; birthDate?:string; sex?:string; affectedArea?:string; contact?:Partial<PatientContact>; status?:PatientStatus; visitType?:'first'|'followup' };
export type PatientView = PatientCatalogView;

export const statusColor:Record<PatientStatus,string>={active:'#16a36a',attention:'#f4a61d',archived:'#7f8582'};

function setLocalPatientArchived(id:string,archived:boolean):PatientEntity|null{
  const timestamp=new Date().toISOString();
  let result:PatientEntity|null=null;
  mutateAtalStore((draft)=>{
    result=applyPatientLifecycle(draft,{patientId:id,archived,now:timestamp,createEventId:()=>createEntityId('event')}).patient;
  });
  return result;
}

export function readLocalPatients(){return getAtalState().patients;}
export function writeLocalPatients(items:LocalPatient[]){mutateAtalStore((draft)=>{draft.patients=items;});}
export function createLocalPatient(input:NewLocalPatient){
  const timestamp=new Date().toISOString();
  let result:PatientEntity|null=null;
  mutateAtalStore((draft)=>{
    result=applyCreatePatient(draft,{
      patientId:createEntityId('patient'),
      now:timestamp,
      createEventId:()=>createEntityId('event'),
      patient:{
        name:input.name,
        diagnosis:input.diagnosis,
        age:input.age??null,
        birthDate:input.birthDate??'',
        sex:input.sex??'',
        affectedArea:input.affectedArea??'',
        status:input.status??'active',
        visitType:input.visitType??'first',
        contact:{phone:input.contact?.phone??'',email:input.contact?.email??'',address:input.contact?.address??'',emergencyContact:input.contact?.emergencyContact??''},
      },
    }).patient;
  });
  return result!;
}
export function updateLocalPatient(id:string,patch:Partial<LocalPatient>){
  const {id:_id,createdAt:_createdAt,updatedAt:_updatedAt,...safePatch}=patch;
  const timestamp=new Date().toISOString();
  let result:PatientEntity|null=null;
  mutateAtalStore((draft)=>{
    result=applyUpdatePatient(draft,{patientId:id,patch:safePatch as PatientUpdatePatch,now:timestamp,createEventId:()=>createEntityId('event')}).patient;
  });
  return result!;
}
export function archiveLocalPatient(id:string){return setLocalPatientArchived(id,true);}
export function restoreLocalPatient(id:string){return setLocalPatientArchived(id,false);}
export function getPatientCatalog(){return buildPatientCatalog(getAtalState());}
export function usePatientCatalog(){return useAtalStore((state)=>buildPatientCatalog(state));}
export function getPatientById(id:string){return buildPatientView(getAtalState(),id);}
export type { PatientStatus };
