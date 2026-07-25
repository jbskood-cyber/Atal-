import { createEntityId, getAtalState, mutateAtalStore, useAtalStore, type PatientEntity, type PatientStatus } from './atalStore';
import { executeActionTransaction } from '@/src/domain/actions/actionTransaction';
import { applyCreatePatient, applyUpdatePatient, type PatientUpdatePatch } from '@/src/domain/actions/patientActions';
import { applyPatientLifecycle } from '@/src/domain/actions/patientLifecycle';
import { applyUpsertClinicalRecord, type ClinicalRecordPatch } from '@/src/domain/actions/clinicalRecordActions';
import { buildPatientCatalog, buildPatientView, type PatientCatalogView } from '@/src/domain/queries/patientCatalog';

export const LOCAL_PATIENTS_KEY = 'atal:local-patients:v1';
export type PatientContact = PatientEntity['contact'];
export type LocalPatient = PatientEntity;
export type NewLocalPatient = { name:string; diagnosis:string; age?:number|null; birthDate?:string; sex?:string; affectedArea?:string; contact?:Partial<PatientContact>; status?:PatientStatus; visitType?:'first'|'followup' };
export type PatientView = PatientCatalogView;

export const statusColor:Record<PatientStatus,string>={active:'#16a36a',attention:'#f4a61d',archived:'#7f8582'};

const localPatientPort={read:getAtalState,mutate:mutateAtalStore};

function patientCreateData(input:NewLocalPatient){
  return {
    name:input.name,
    diagnosis:input.diagnosis,
    age:input.age??null,
    birthDate:input.birthDate??'',
    sex:input.sex??'',
    affectedArea:input.affectedArea??'',
    status:input.status??'active' as PatientStatus,
    visitType:input.visitType??'first' as const,
    contact:{phone:input.contact?.phone??'',email:input.contact?.email??'',address:input.contact?.address??'',emergencyContact:input.contact?.emergencyContact??''},
  };
}

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
      patient:patientCreateData(input),
    }).patient;
  });
  return result!;
}
export function createLocalPatientWithRecord(input:NewLocalPatient,record:ClinicalRecordPatch){
  const now=new Date().toISOString();
  return executeActionTransaction({
    action:'patient.create',
    now,
    origin:{type:'manual-ui'},
    supportsUndo:true,
    mutate(draft,transactionId){
      let eventIndex=0;
      const patient=applyCreatePatient(draft,{
        patientId:`${transactionId}-patient`,
        now,
        createEventId:()=>`${transactionId}-event-${eventIndex++}`,
        patient:patientCreateData(input),
      }).patient;
      const clinicalRecord=applyUpsertClinicalRecord(draft,{
        patientId:patient.id,
        patch:record,
        recordId:`${transactionId}-record`,
        versionId:`${transactionId}-record-version`,
        now,
        createEventId:()=>`${transactionId}-event-${eventIndex++}`,
      }).record;
      return {
        status:'success' as const,
        message:'Paciente creado.',
        summary:['Paciente creado.','Expediente inicial creado.'],
        data:{patientId:patient.id,clinicalRecordId:clinicalRecord.id},
        affected:[{type:'patient' as const,id:patient.id},{type:'clinical-record' as const,id:clinicalRecord.id}],
      };
    },
  },localPatientPort);
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
