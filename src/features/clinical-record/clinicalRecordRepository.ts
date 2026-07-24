import { createEntityId, getAtalState, mutateAtalStore, useAtalStore } from '@/src/data/atalStore';
import { applyUpsertClinicalRecord, type ClinicalRecordPatch } from '@/src/domain/actions/clinicalRecordActions';
import type { ClinicalRecord } from './types';

export const CLINICAL_RECORDS_KEY='atal:clinical-records:v1';
export type NewClinicalRecord=Omit<ClinicalRecord,'id'|'version'|'createdAt'|'updatedAt'>;
export function readClinicalRecords(){return getAtalState().clinicalRecords;}
export function getClinicalRecordByPatient(patientId:string){return getAtalState().clinicalRecords.filter((record)=>record.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null;}
export function useClinicalRecord(patientId:string){return useAtalStore((state)=>state.clinicalRecords.filter((record)=>record.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null);}
export function createClinicalRecord(input:NewClinicalRecord){
  const timestamp=new Date().toISOString();
  const {patientId,...patch}=input;
  let result:ClinicalRecord|null=null;
  mutateAtalStore((draft)=>{
    result=applyUpsertClinicalRecord(draft,{
      patientId,
      patch:patch as ClinicalRecordPatch,
      recordId:createEntityId('record'),
      versionId:createEntityId('record-version'),
      now:timestamp,
      createEventId:()=>createEntityId('event'),
    }).record;
  });
  return result!;
}
export function updateClinicalRecord(id:string,patch:Partial<ClinicalRecord>){
  const current=getAtalState().clinicalRecords.find((record)=>record.id===id);
  if(!current)return null;
  const {id:_id,patientId:_patientId,version:_version,createdAt:_createdAt,updatedAt:_updatedAt,...safePatch}=patch;
  const timestamp=new Date().toISOString();
  let result:ClinicalRecord|null=null;
  mutateAtalStore((draft)=>{
    result=applyUpsertClinicalRecord(draft,{
      patientId:current.patientId,
      patch:safePatch as ClinicalRecordPatch,
      recordId:createEntityId('record'),
      versionId:createEntityId('record-version'),
      now:timestamp,
      createEventId:()=>createEntityId('event'),
    }).record;
  });
  return result;
}
