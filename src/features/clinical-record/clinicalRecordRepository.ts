import type { ClinicalRecord, NewClinicalRecord } from './types';

export const CLINICAL_RECORDS_KEY = 'atal:clinical-records:v1';

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `record-${crypto.randomUUID()}`;
  return `record-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is ClinicalRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ClinicalRecord>;
  return typeof item.id === 'string' && typeof item.patientId === 'string' && typeof item.version === 'number'
    && Array.isArray(item.goals) && Array.isArray(item.precautions) && typeof item.updatedAt === 'string';
}

export function readClinicalRecords(): ClinicalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CLINICAL_RECORDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

export function writeClinicalRecords(records: ClinicalRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLINICAL_RECORDS_KEY, JSON.stringify(records));
}

export function createClinicalRecord(input: NewClinicalRecord) {
  const now = new Date().toISOString();
  const record: ClinicalRecord = { ...input, id: createId(), version: 1, createdAt: now, updatedAt: now };
  writeClinicalRecords([...readClinicalRecords(), record]);
  return record;
}

export function getClinicalRecordByPatient(patientId: string) {
  return readClinicalRecords().filter((record) => record.patientId === patientId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function updateClinicalRecord(id: string, patch: Partial<ClinicalRecord>) {
  let updated: ClinicalRecord | null = null;
  const next = readClinicalRecords().map((record) => {
    if (record.id !== id) return record;
    updated = { ...record, ...patch, id, version: record.version + 1, updatedAt: new Date().toISOString() };
    return updated;
  });
  writeClinicalRecords(next);
  return updated;
}
