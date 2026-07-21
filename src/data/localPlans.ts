import {
  createPlan,
  deletePlan as deletePlanFromStore,
  duplicatePlan as duplicatePlanFromStore,
  findActivePlanConflict,
  getAtalState,
  mutateAtalStore,
  updatePlan,
  updatePlanStatus,
  useAtalStore,
  type PlanEntity,
  type PlanStatus,
} from './atalStore';
import { syncClinicalRecordPlanAssociation } from '@/src/domain/planAssociation';

export const LOCAL_PLANS_KEY='atal:local-plans:v1';
export type LocalPlanStatus=PlanStatus;
export type LocalPlan=PlanEntity;
export type NewLocalPlan={patientId:string;title:string;focus:string;duration:string;frequency:string;goal:string;exerciseIds:string[];status:PlanStatus;progression?:string;reportCriteria?:string;generalInstructions?:string};

function resyncPatient(patientId:string,preferredPlanId=''){
  mutateAtalStore((draft)=>{syncClinicalRecordPlanAssociation(draft,patientId,preferredPlanId);});
}

export function readLocalPlans(){return getAtalState().plans;}
export function writeLocalPlans(items:LocalPlan[]){mutateAtalStore((draft)=>{draft.plans=items;const patientIds=[...new Set(items.map((item)=>item.patientId))];patientIds.forEach((patientId)=>syncClinicalRecordPlanAssociation(draft,patientId));});}
export function createLocalPlan(input:NewLocalPlan){const plan=createPlan({...input,progression:input.progression??'',reportCriteria:input.reportCriteria??'',generalInstructions:input.generalInstructions??''});resyncPatient(plan.patientId,plan.id);return plan;}
export function updateLocalPlan(id:string,patch:Partial<LocalPlan>){const plan=updatePlan(id,patch);if(plan)resyncPatient(plan.patientId,plan.id);return plan;}
export const activatePlan=(id:string,resolution?:'pause'|'complete'|'archive')=>{const plan=getAtalState().plans.find((item)=>item.id===id);const result=updatePlanStatus(id,'active',resolution);if(plan)resyncPatient(plan.patientId,id);return result;};
export const pausePlan=(id:string)=>{const plan=getAtalState().plans.find((item)=>item.id===id);const result=updatePlanStatus(id,'paused');if(plan)resyncPatient(plan.patientId,id);return result;};
export const completePlan=(id:string)=>{const plan=getAtalState().plans.find((item)=>item.id===id);const result=updatePlanStatus(id,'completed');if(plan)resyncPatient(plan.patientId,id);return result;};
export const archivePlan=(id:string)=>{const plan=getAtalState().plans.find((item)=>item.id===id);const result=updatePlanStatus(id,'archived');if(plan)resyncPatient(plan.patientId);return result;};
export const restorePlan=(id:string)=>{const plan=getAtalState().plans.find((item)=>item.id===id);const result=updatePlanStatus(id,'draft');if(plan)resyncPatient(plan.patientId,id);return result;};
export function duplicatePlan(id:string){const source=getAtalState().plans.find((item)=>item.id===id);const copy=duplicatePlanFromStore(id);if(source)resyncPatient(source.patientId,source.id);return copy;}
export function deletePlan(id:string){const source=getAtalState().plans.find((item)=>item.id===id);deletePlanFromStore(id);if(source)resyncPatient(source.patientId);}
export {findActivePlanConflict};
export function getPatientLocalPlans(patientId:string){return getAtalState().plans.filter((plan)=>plan.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function getCurrentPatientLocalPlan(patientId:string){return getPatientLocalPlans(patientId).find((plan)=>plan.status==='active')??null;}
export function getLocalPlanById(id:string){return getAtalState().plans.find((plan)=>plan.id===id)??null;}
export function useLocalPlans(){return useAtalStore((state)=>state.plans);}
export type { PlanStatus };
