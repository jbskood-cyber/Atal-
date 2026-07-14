import { createPlan, deletePlan, duplicatePlan, findActivePlanConflict, getAtalState, mutateAtalStore, updatePlan, updatePlanStatus, useAtalStore, type PlanEntity, type PlanStatus } from './atalStore';

export const LOCAL_PLANS_KEY='atal:local-plans:v1';
export type LocalPlanStatus=PlanStatus;
export type LocalPlan=PlanEntity;
export type NewLocalPlan={patientId:string;title:string;focus:string;duration:string;frequency:string;goal:string;exerciseIds:string[];status:PlanStatus;progression?:string;reportCriteria?:string;generalInstructions?:string};
export function readLocalPlans(){return getAtalState().plans;}
export function writeLocalPlans(items:LocalPlan[]){mutateAtalStore((draft)=>{draft.plans=items;});}
export function createLocalPlan(input:NewLocalPlan){return createPlan({...input,progression:input.progression??'',reportCriteria:input.reportCriteria??'',generalInstructions:input.generalInstructions??''});}
export function updateLocalPlan(id:string,patch:Partial<LocalPlan>){return updatePlan(id,patch);}
export const activatePlan=(id:string,resolution?:'pause'|'complete'|'archive')=>updatePlanStatus(id,'active',resolution);
export const pausePlan=(id:string)=>updatePlanStatus(id,'paused');
export const completePlan=(id:string)=>updatePlanStatus(id,'completed');
export const archivePlan=(id:string)=>updatePlanStatus(id,'archived');
export const restorePlan=(id:string)=>updatePlanStatus(id,'draft');
export {duplicatePlan,deletePlan,findActivePlanConflict};
export function getPatientLocalPlans(patientId:string){return getAtalState().plans.filter((plan)=>plan.patientId===patientId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function getCurrentPatientLocalPlan(patientId:string){return getPatientLocalPlans(patientId).find((plan)=>plan.status==='active')??null;}
export function getLocalPlanById(id:string){return getAtalState().plans.find((plan)=>plan.id===id)??null;}
export function useLocalPlans(){return useAtalStore((state)=>state.plans);}
export type { PlanStatus };
