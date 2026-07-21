export const MAX_AI_FILES=8;
export const MAX_AI_FILE_BYTES=8*1024*1024;
export const MAX_AI_REQUEST_BODY_BYTES=30*1024*1024;

export function serializedRequestBytes(value:unknown){
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function assertAIRequestSize(value:unknown){
  const size=serializedRequestBytes(value);
  if(size>MAX_AI_REQUEST_BODY_BYTES)throw new Error('La selección completa supera el límite seguro de envío. Reduce el número o tamaño de los archivos.');
  return size;
}
