import type { AIAttachmentKind, AIAttachmentMeta, AIAttachmentPayload } from '../types';

const DATABASE = 'atal-ai-artifacts-v1';
const STORE = 'artifacts';
const DB_VERSION = 1;

export type AIArtifactStatus = 'pending' | 'transcribed' | 'review-required' | 'applied' | 'failed';

export type AIArtifactRecord = {
  id: string;
  conversationId: string;
  name: string;
  type: string;
  size: number;
  kind: AIAttachmentKind;
  blob: Blob;
  transcript: string;
  extractedProposal?: unknown;
  linkedResult?: { entityType: string; entityId: string; href?: string };
  status: AIArtifactStatus;
  createdAt: string;
  updatedAt: string;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No pudimos abrir los archivos locales de Atal IA.'));
  });
}

function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No pudimos leer el archivo local de Atal IA.'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('No pudimos guardar el archivo local de Atal IA.'));
    transaction.onabort = () => reject(new Error('La operación con el archivo fue cancelada.'));
  });
}

export function dataUrlToBlob(dataUrl: string, fallbackType = 'application/octet-stream'): Blob {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('El archivo adjunto no tiene un formato válido.');
  const type = match[1] || fallbackType;
  const encoded = match[2];
  const bytes = dataUrl.includes(';base64,')
    ? Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(encoded));
  return new Blob([bytes], { type });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No pudimos recuperar el archivo local de Atal IA.'));
    reader.readAsDataURL(blob);
  });
}

export async function saveAIArtifact(conversationId: string, payload: AIAttachmentPayload): Promise<AIArtifactRecord> {
  const database = await openDatabase();
  const timestamp = new Date().toISOString();
  const existing = await result(database.transaction(STORE, 'readonly').objectStore(STORE).get(payload.id)) as AIArtifactRecord | undefined;
  const record: AIArtifactRecord = {
    id: payload.id,
    conversationId,
    name: payload.name,
    type: payload.type,
    size: payload.size,
    kind: payload.kind,
    blob: dataUrlToBlob(payload.data, payload.type),
    transcript: existing?.transcript ?? '',
    extractedProposal: existing?.extractedProposal,
    linkedResult: existing?.linkedResult,
    status: existing?.status ?? 'pending',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).put(record);
  await transactionDone(transaction);
  database.close();
  return record;
}

export async function getAIArtifact(id: string): Promise<AIArtifactRecord | null> {
  const database = await openDatabase();
  const record = await result(database.transaction(STORE, 'readonly').objectStore(STORE).get(id)) as AIArtifactRecord | undefined;
  database.close();
  return record ?? null;
}

export async function listAIArtifacts(conversationId: string): Promise<AIArtifactRecord[]> {
  const database = await openDatabase();
  const records = await result(database.transaction(STORE, 'readonly').objectStore(STORE).index('conversationId').getAll(conversationId)) as AIArtifactRecord[];
  database.close();
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function restoreAIArtifactPayload(id: string): Promise<AIAttachmentPayload | null> {
  const record = await getAIArtifact(id);
  if (!record) return null;
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    size: record.size,
    kind: record.kind,
    available: true,
    data: await blobToDataUrl(record.blob),
  };
}

export async function restoreAIArtifactPayloads(metadata: AIAttachmentMeta[]): Promise<AIAttachmentPayload[]> {
  const restored = await Promise.all(metadata.map((item) => restoreAIArtifactPayload(item.id)));
  return restored.filter((item): item is AIAttachmentPayload => Boolean(item));
}

export async function updateAIArtifact(id: string, patch: Partial<Pick<AIArtifactRecord, 'transcript' | 'extractedProposal' | 'linkedResult' | 'status'>>): Promise<AIArtifactRecord> {
  const database = await openDatabase();
  const existing = await result(database.transaction(STORE, 'readonly').objectStore(STORE).get(id)) as AIArtifactRecord | undefined;
  if (!existing) {
    database.close();
    throw new Error('El archivo local de Atal IA ya no existe.');
  }
  const next = { ...existing, ...structuredClone(patch), id: existing.id, conversationId: existing.conversationId, blob: existing.blob, updatedAt: new Date().toISOString() };
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).put(next);
  await transactionDone(transaction);
  database.close();
  return next;
}

export async function deleteAIArtifact(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}

export async function deleteAIConversationArtifacts(conversationId: string): Promise<void> {
  const records = await listAIArtifacts(conversationId);
  if (!records.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  for (const record of records) transaction.objectStore(STORE).delete(record.id);
  await transactionDone(transaction);
  database.close();
}
