import {
  createEntityId,
  deletePlan as deletePlanFromStore,
  duplicatePlan as duplicatePlanFromStore,
  findActivePlanConflict,
  getAtalState,
  mutateAtalStore,
  useAtalStore,
  type PlanEntity,
  type PlanStatus,
} from './atalStore';
import { applyCreatePlan, applyPlanLifecycle, applyUpdatePlan, type PlanConflictResolution, type PlanUpdatePatch } from '../domain/actions/planActions';
import { syncClinicalRecordPlanAssociation } from '@/src/domain/planAssociation';

export const LOCAL_PLANS_KEY='atal:local-plans:v1';
export type LocalPlanStatus=PlanStatus;
export type LocalPlan=PlanEntity;
export type NewLocalPlan={patientId:string;title:string;focus:string;duration:string;frequency:string;goal:string;exerciseIds:string[];status:PlanStatus;progression?:string;reportCriteria?:string;generalInstructions?:string};

function resyncPatient(patientId:string,preferredPlanId=''){
  mutateAtalStore((draft)=>{syncClinicalRecordPlanAssociation(draft,patientId,preferredPlanId);});
}

function transitionPlan(id:string,status:PlanStatus,resolution?:PlanConflictResolution){
  const now=new Date().toISOString();
  const holder:{result?:ReturnType<typeof applyPlanLifecycle>}={};
  mutateAtalStore((draft)=>{holder.result=applyPlanLifecycle(draft,{planId:id,status,resolveActiveConflict:resolution,now,createEventId:()=>createEntityId('event'),createNotificationId:()=>createEntityId('notification')});});
  return holder.result?.plan??null;
}

export function readLocalPlans(){return getAtalState().plans;}
export function writeLocalPlans(items:LocalPlan[]){mutateAtalStore((draft)=>{draft.plans=items;const patientIds=[...new Set(items.map((item)=>item.patientId))];patientIds.forEach((patientId)=>syncClinicalRecordPlanAssociation(draft,patientId));});}
export function createLocalPlan(input:NewLocalPlan){
  const now=new Date().toISOString();
  const planId=createEntityId('plan');
  const holder:{result?:ReturnType<typeof applyCreatePlan>}={};
  mutateAtalStore((draft)=>{holder.result=applyCreatePlan(draft,{patientId:input.patientId,planId,now,createEventId:()=>createEntityId('event'),plan:{title:input.title,focus:input.focus,duration:input.duration,frequency:input.frequency,goal:input.goal,exerciseIds:input.exerciseIds,status:input.status,progression:input.progression??'',reportCriteria:input.reportCriteria??'',generalInstructions:input.generalInstructions??''}});});
  return holder.result!.plan;
}
export function updateLocalPlan(id:string,patch:PlanUpdatePatch){
  const now=new Date().toISOString();
  const holder:{result?:ReturnType<typeof applyUpdatePlan>}={};
  mutateAtalStore((draft)=>{holder.result=applyUpdatePlan(draft,{planId:id,patch,now,createEventId:()=>createEntityId('event')});});
  return holder.result?.plan??null;
}
export const activatePlan=(id:string,resolution?:PlanConflictResolution)=>transitionPlan(id,'active',resolution);
export const pausePlan=(id:string)=>transitionPlan(id,'paused');
export const completePlan=(id:string)=>transitionPlan(id,'completed');
export const archivePlan=(id:string)=>transitionPlan(id,'archived');
export const restorePlan=(id:string)=>transitionPlan(id,'draft');
export function duplicatePlan(id:string){const source=getAtalState().plans.find((item)=>item.id===id);const copy=duplicatePlanFromStore(id);if(source)resyncPatient(source.patientId,source.id);return copy;}
export function deletePlan(id:string){const source=getAtalState().plans.find((item)=>item.id===id);deletePlanFromStore(id);if(source)resyncPatient(source.patientId);}
export {findActivePlanConflict};
export function getPatientLocalPlans(patientId:string){return getAtalState().plans.filter((plan)=>plan.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function getCurrentPatientLocalPlan(patientId:string){return getPatientLocalPlans(patientId).find((plan)=>plan.status==='active')??null;}
export function getLocalPlanById(id:string){return getAtalState().plans.find((plan)=>plan.id===id)??null;}
export function useLocalPlans(){return useAtalStore((state)=>state.plans);}
export type { PlanStatus };