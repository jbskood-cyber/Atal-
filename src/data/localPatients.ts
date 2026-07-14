import { patients, type Patient, type PatientStatus } from './atal-demo';

export const LOCAL_PATIENTS_KEY = 'atal:local-patients:v1';

export type PatientContact = {
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
};

export type LocalPatient = Patient & {
  age: number | null;
  birthDate: string;
  sex: string;
  affectedArea: string;
  contact: PatientContact;
  createdAt: string;
  updatedAt: string;
};

export type NewLocalPatient = {
  name: string;
  diagnosis: string;
  age?: number | null;
  birthDate?: string;
  sex?: string;
  affectedArea?: string;
  contact?: Partial<PatientContact>;
  status?: PatientStatus;
};

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `patient-${crypto.randomUUID()}`;
  return `patient-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalPatient(value: unknown): value is LocalPatient {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LocalPatient>;
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.diagnosis === 'string'
    && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string' && Boolean(item.contact);
}

export function readLocalPatients(): LocalPatient[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_PATIENTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isLocalPatient) : [];
  } catch {
    return [];
  }
}

export function writeLocalPatients(items: LocalPatient[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_PATIENTS_KEY, JSON.stringify(items));
}

export function createLocalPatient(input: NewLocalPatient): LocalPatient {
  const now = new Date().toISOString();
  const patient: LocalPatient = {
    id: createId(),
    name: input.name.trim(),
    diagnosis: input.diagnosis.trim() || 'Motivo por completar',
    plan: 'Sin plan',
    progress: 0,
    time: 'Ahora',
    status: input.status ?? 'active',
    adherence: 0,
    age: input.age ?? null,
    birthDate: input.birthDate ?? '',
    sex: input.sex ?? '',
    affectedArea: input.affectedArea ?? '',
    contact: {
      phone: input.contact?.phone ?? '',
      email: input.contact?.email ?? '',
      address: input.contact?.address ?? '',
      emergencyContact: input.contact?.emergencyContact ?? '',
    },
    createdAt: now,
    updatedAt: now,
  };
  writeLocalPatients([...readLocalPatients(), patient]);
  return patient;
}

export function updateLocalPatient(id: string, patch: Partial<LocalPatient>) {
  let updated: LocalPatient | null = null;
  const next = readLocalPatients().map((patient) => {
    if (patient.id !== id) return patient;
    updated = { ...patient, ...patch, id, updatedAt: new Date().toISOString() };
    return updated;
  });
  writeLocalPatients(next);
  return updated;
}

export function getPatientCatalog(): Patient[] {
  return [...readLocalPatients(), ...patients];
}

export function getPatientById(id: string) {
  return getPatientCatalog().find((patient) => patient.id === id) ?? null;
}
