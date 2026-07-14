import { createEntityId } from './atalStore';

const DATABASE='atal-media-v1';
const STORE='exercise-media';
const DB_VERSION=1;
export const MAX_IMAGE_BYTES=8*1024*1024;
export const MAX_VIDEO_BYTES=25*1024*1024;

export type ExerciseMediaRecord={id:string;exerciseId:string;type:'image'|'video'|'sequence';files:Blob[];names:string[];mimeTypes:string[];size:number;createdAt:string;updatedAt:string};

function openDatabase(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DATABASE,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('exerciseId','exerciseId',{unique:false});}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('No pudimos abrir el almacenamiento multimedia local.'));});}
function requestResult<T>(request:IDBRequest<T>){return new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('No pudimos completar la operación multimedia.'));});}

export async function saveExerciseMedia(exerciseId:string,type:ExerciseMediaRecord['type'],files:File[],existingId?:string){
  if(!files.length)throw new Error('Selecciona al menos un archivo.');
  if(type==='video'&&files.some((file)=>!file.type.startsWith('video/')))throw new Error('El recurso debe ser un video compatible.');
  if(type!=='video'&&files.some((file)=>!file.type.startsWith('image/')))throw new Error('Selecciona únicamente imágenes compatibles.');
  if(type==='video'&&files.some((file)=>file.size>MAX_VIDEO_BYTES))throw new Error('El video supera el límite de 25 MB.');
  if(type!=='video'&&files.some((file)=>file.size>MAX_IMAGE_BYTES))throw new Error('Una imagen supera el límite de 8 MB.');
  if(type==='sequence'&&files.length>12)throw new Error('La secuencia admite hasta 12 imágenes.');
  const timestamp=new Date().toISOString();const record:ExerciseMediaRecord={id:existingId??createEntityId('media'),exerciseId,type,files,names:files.map((file)=>file.name),mimeTypes:files.map((file)=>file.type),size:files.reduce((sum,file)=>sum+file.size,0),createdAt:timestamp,updatedAt:timestamp};
  const db=await openDatabase();const transaction=db.transaction(STORE,'readwrite');await requestResult(transaction.objectStore(STORE).put(record));db.close();return record;
}
export async function getExerciseMedia(id:string){const db=await openDatabase();const result=await requestResult(db.transaction(STORE,'readonly').objectStore(STORE).get(id)) as ExerciseMediaRecord|undefined;db.close();return result??null;}
export async function getExerciseMediaByExercise(exerciseId:string){const db=await openDatabase();const result=await requestResult(db.transaction(STORE,'readonly').objectStore(STORE).index('exerciseId').get(exerciseId)) as ExerciseMediaRecord|undefined;db.close();return result??null;}
export async function deleteExerciseMedia(id:string){const db=await openDatabase();await requestResult(db.transaction(STORE,'readwrite').objectStore(STORE).delete(id));db.close();}
export function mediaObjectUrls(record:ExerciseMediaRecord){return record.files.map((file)=>URL.createObjectURL(file));}
