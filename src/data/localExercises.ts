import { archiveExercise, createExercise, deleteExercise, duplicateExercise as duplicateExerciseFromStore, getAtalState, mutateAtalStore, updateExercise, useAtalStore, type ExerciseEntity, type ExerciseMediaRef } from './atalStore';
import { cloneExerciseMedia, deleteExerciseMedia } from './exerciseMediaRepository';

export const LOCAL_EXERCISES_KEY='atal:local-exercises:v1';
export type ExerciseMedia=ExerciseMediaRef&{url?:string};
export type LocalExercise=ExerciseEntity;
export type NewLocalExercise=Omit<ExerciseEntity,'id'|'createdAt'|'updatedAt'|'status'|'source'>&{status?:'active'|'archived';source?:'seed'|'local'};
export type ExerciseCatalogItem={id:string;name:string;region:string;category:string;image:string;source:'seed'|'local';details:LocalExercise};
export function readLocalExercises(){return getAtalState().exercises;}
export function writeLocalExercises(items:LocalExercise[]){mutateAtalStore((draft)=>{draft.exercises=items;});}
export function createLocalExercise(input:NewLocalExercise){return createExercise({...input,status:input.status??'active',source:input.source??'local'});}
export function updateLocalExercise(id:string,patch:Partial<LocalExercise>){return updateExercise(id,patch);}
export function duplicateExercise(id:string){const source=getAtalState().exercises.find((item)=>item.id===id);if(!source)throw new Error('Ejercicio no encontrado.');const copy=duplicateExerciseFromStore(id);if(!source.media.mediaId)return copy;updateExercise(copy.id,{media:{type:'none'}});void cloneExerciseMedia(source.media.mediaId,copy.id).then((media)=>{if(media)updateExercise(copy.id,{media:{...source.media,mediaId:media.id}});}).catch(()=>undefined);return{...copy,media:{type:'none'} as ExerciseMediaRef};}
export async function duplicateExerciseWithMedia(id:string){const source=getAtalState().exercises.find((item)=>item.id===id);if(!source)throw new Error('Ejercicio no encontrado.');const copy=duplicateExerciseFromStore(id);if(!source.media.mediaId)return copy;updateExercise(copy.id,{media:{type:'none'}});try{const media=await cloneExerciseMedia(source.media.mediaId,copy.id);if(!media)return copy;return updateExercise(copy.id,{media:{...source.media,mediaId:media.id}})??copy;}catch(error){try{deleteExercise(copy.id);}catch{}throw error;}}
export async function deleteExerciseWithMedia(id:string){const exercise=getAtalState().exercises.find((item)=>item.id===id);deleteExercise(id);if(exercise?.media.mediaId)await deleteExerciseMedia(exercise.media.mediaId);}
export {deleteExercise};
export const archiveLocalExercise=(id:string)=>archiveExercise(id,true);
export const restoreLocalExercise=(id:string)=>archiveExercise(id,false);
export function getLocalExerciseById(id:string){return getAtalState().exercises.find((exercise)=>exercise.id===id)??null;}
function catalog(exercise:ExerciseEntity):ExerciseCatalogItem{return {id:exercise.id,name:exercise.name,region:exercise.region,category:exercise.category,image:'/icon.svg',source:exercise.source,details:exercise};}
export function getExerciseCatalog(){return getAtalState().exercises.filter((exercise)=>exercise.status==='active').map(catalog);}
export function useExerciseCatalog(includeArchived=false){return useAtalStore((state)=>state.exercises.filter((exercise)=>includeArchived||exercise.status==='active').map(catalog));}
export function getExerciseCatalogItem(id:string){const exercise=getAtalState().exercises.find((item)=>item.id===id);return exercise?catalog(exercise):null;}
