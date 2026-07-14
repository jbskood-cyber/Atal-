import { createEntityId, getAtalState, saveClinicalRecord, useAtalStore } from '@/src/data/atalStore';
import type { ClinicalRecord } from './types';

export const CLINICAL_RECORDS_KEY='atal:clinical-records:v1';
export type NewClinicalRecord=Omit<ClinicalRecord,'id'|'version'|'createdAt'|'updatedAt'>;
export function readClinicalRecords(){return getAtalState().clinicalRecords;}
export function getClinicalRecordByPatient(patientId:string){return getAtalState().clinicalRecords.filter((record)=>record.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null;}
export function useClinicalRecord(patientId:string){return useAtalStore((state)=>state.clinicalRecords.filter((record)=>record.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null);}
export function createClinicalRecord(input:NewClinicalRecord){const timestamp=new Date().toISOString();return saveClinicalRecord({...input,id:createEntityId('record'),version:1,createdAt:timestamp,updatedAt:timestamp});}
export function updateClinicalRecord(id:string,patch:Partial<ClinicalRecord>){const current=getAtalState().clinicalRecords.find((record)=>record.id===id);if(!current)return null;return saveClinicalRecord({...current,...patch,id:current.id});}
