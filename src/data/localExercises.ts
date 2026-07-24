import { createEntityId, deleteExercise, getAtalState, mutateAtalStore, useAtalStore, type ExerciseEntity, type ExerciseMediaRef } from './atalStore';
import { cloneExerciseMedia, deleteExerciseMedia } from './exerciseMediaRepository';
import { applyCreateExercise, applyDuplicateExercise, applyExerciseLifecycle, applyUpdateExercise, type ExerciseActionPatch } from '../domain/actions/exerciseActions';

export const LOCAL_EXERCISES_KEY='atal:local-exercises:v1';
export type ExerciseMedia=ExerciseMediaRef&{url?:string};
export type LocalExercise=ExerciseEntity;
export type NewLocalExercise=Omit<ExerciseEntity,'id'|'createdAt'|'updatedAt'|'status'|'source'>&{status?:'active'|'archived';source?:'seed'|'local'};
export type ExerciseCatalogItem={id:string;name:string;region:string;category:string;image:string;source:'seed'|'local';details:LocalExercise};

function now(){return new Date().toISOString();}
function eventId(){return createEntityId('event');}
function setExerciseMediaRef(id:string,media:ExerciseMediaRef){let result:ExerciseEntity|null=null;mutateAtalStore((draft)=>{const exercise=draft.exercises.find((item)=>item.id===id);if(!exercise)return;exercise.media=structuredClone(media);exercise.updatedAt=now();result=exercise;});return result;}
function removeExerciseState(id:string){deleteExercise(id);}

export function readLocalExercises(){return getAtalState().exercises;}
export function writeLocalExercises(items:LocalExercise[]){mutateAtalStore((draft)=>{draft.exercises=items;});}

export function createLocalExercise(input:NewLocalExercise){
  const timestamp=now();
  const {status,source,...exercise}=input;
  let result:ExerciseEntity|null=null;
  mutateAtalStore((draft)=>{
    result=applyCreateExercise(draft,{exerciseId:createEntityId('exercise'),exercise,now:timestamp,createEventId:eventId}).exercise;
    if(result){result.status=status??'active';result.source=source??'local';}
  });
  return result;
}

export function updateLocalExercise(id:string,patch:Partial<LocalExercise>){
  const current=getAtalState().exercises.find((item)=>item.id===id);
  if(!current)throw new Error('Ejercicio no encontrado.');
  const next:ExerciseActionPatch={};
  if(patch.name!==undefined)next.name=patch.name.trim()||current.name;
  if(patch.region!==undefined)next.region=patch.region;
  if(patch.category!==undefined)next.category=patch.category;
  if(patch.objective!==undefined)next.objective=patch.objective;
  if(patch.startingPosition!==undefined)next.startingPosition=patch.startingPosition;
  if(patch.instructions!==undefined){const instructions=patch.instructions.map((item)=>item.trim()).filter(Boolean);next.instructions=instructions.length?instructions:current.instructions;}
  if(patch.precautions!==undefined)next.precautions=patch.precautions;
  if(patch.equipment!==undefined)next.equipment=patch.equipment;
  if(patch.difficulty!==undefined)next.difficulty=patch.difficulty;
  if(patch.sets!==undefined)next.sets=Number.isInteger(patch.sets)&&patch.sets>0?patch.sets:current.sets;
  if(patch.repetitions!==undefined)next.repetitions=Number.isInteger(patch.repetitions)&&patch.repetitions>0?patch.repetitions:current.repetitions;
  if(patch.time!==undefined)next.time=patch.time;
  if(patch.rest!==undefined)next.rest=patch.rest;
  if(patch.maxPain!==undefined)next.maxPain=patch.maxPain===null?null:Math.min(10,Math.max(0,patch.maxPain));
  if(patch.tags!==undefined)next.tags=patch.tags;
  if(patch.notes!==undefined)next.notes=patch.notes;
  const timestamp=now();
  let result:ExerciseEntity|null=null;
  mutateAtalStore((draft)=>{result=applyUpdateExercise(draft,{exerciseId:id,patch:next,now:timestamp}).exercise;if(result&&patch.media!==undefined)result.media=structuredClone(patch.media);if(result&&patch.source!==undefined)result.source=patch.source;if(result&&patch.status!==undefined)result.status=patch.status;});
  return result;
}

function duplicateExerciseState(id:string){
  const source=getAtalState().exercises.find((item)=>item.id===id);
  if(!source)throw new Error('Ejercicio no encontrado.');
  const timestamp=now();
  let result:ExerciseEntity|null=null;
  mutateAtalStore((draft)=>{result=applyDuplicateExercise(draft,{exerciseId:id,duplicateId:createEntityId('exercise'),now:timestamp,createEventId:eventId}).exercise;if(result&&source.media.mediaId)result.media={type:'none'};});
  if(!result)throw new Error('No pudimos duplicar el ejercicio.');
  return {source,copy:result};
}

export function duplicateExercise(id:string){
  const {source,copy}=duplicateExerciseState(id);
  const mediaId=source.media.mediaId;
  if(!mediaId)return copy;
  void cloneExerciseMedia(mediaId,copy.id).then((media)=>{if(media)setExerciseMediaRef(copy.id,{...source.media,mediaId:media.id});}).catch(()=>undefined);
  return copy;
}

export async function duplicateExerciseWithMedia(id:string){
  const {source,copy}=duplicateExerciseState(id);
  const mediaId=source.media.mediaId;
  if(!mediaId)return copy;
  try{
    const media=await cloneExerciseMedia(mediaId,copy.id);
    if(!media)return copy;
    return setExerciseMediaRef(copy.id,{...source.media,mediaId:media.id})??copy;
  }catch(error){
    try{removeExerciseState(copy.id);}catch{}
    throw error;
  }
}

export async function deleteExerciseWithMedia(id:string){const exercise=getAtalState().exercises.find((item)=>item.id===id);removeExerciseState(id);const mediaId=exercise?.media.mediaId;if(mediaId)await deleteExerciseMedia(mediaId);}
export {deleteExercise};

function setExerciseArchived(id:string,archived:boolean){const timestamp=now();let result:ExerciseEntity|null=null;mutateAtalStore((draft)=>{result=applyExerciseLifecycle(draft,{exerciseId:id,archived,now:timestamp}).exercise;});return result;}
export const archiveLocalExercise=(id:string)=>setExerciseArchived(id,true);
export const restoreLocalExercise=(id:string)=>setExerciseArchived(id,false);
export function getLocalExerciseById(id:string){return getAtalState().exercises.find((exercise)=>exercise.id===id)??null;}
function catalog(exercise:ExerciseEntity):ExerciseCatalogItem{return {id:exercise.id,name:exercise.name,region:exercise.region,category:exercise.category,image:'/icon.svg',source:exercise.source,details:exercise};}
export function getExerciseCatalog(){return getAtalState().exercises.filter((exercise)=>exercise.status==='active').map(catalog);}
export function useExerciseCatalog(includeArchived=false){return useAtalStore((state)=>state.exercises.filter((exercise)=>includeArchived||exercise.status==='active').map(catalog));}
export function getExerciseCatalogItem(id:string){const exercise=getAtalState().exercises.find((item)=>item.id===id);return exercise?catalog(exercise):null;}
