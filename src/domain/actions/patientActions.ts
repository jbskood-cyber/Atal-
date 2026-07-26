import type { AtalState, PatientEntity } from '../../data/atalStore';
import { actionError } from './contracts';

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const INTERNAL_WHITESPACE = /\s+/g;

function normalizePatientName(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .replace(INTERNAL_WHITESPACE, ' ');
}

function ensureUniquePatientName(state: AtalState, name: string, exceptPatientId?: string): void {
  const normalized = normalizePatientName(name);
  const duplicate = state.patients.find((patient) => patient.id !== exceptPatientId && normalizePatientName(patient.name) === normalized);
  if (duplicate) {
    throw actionError('CORE_ENTITY_AMBIGUOUS', `Ya existe el paciente “${duplicate.name}”. Usa ese expediente o indica un nombre distinto.`);
  }
}

export type PatientCreateData = Omit<PatientEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type PatientUpdatePatch = Partial<Omit<PatientEntity, 'id' | 'createdAt' | 'updatedAt' | 'contact'>> & {
  contact?: Partial<PatientEntity['contact']>;
};

export type PatientCreateActionInput = {
  patientId: string;
  patient: PatientCreateData;
  now: string;
  createEventId: () => string;
};

export type PatientUpdateActionInput = {
  patientId: string;
  patch: PatientUpdatePatch;
  now: string;
  createEventId: () => string;
};

export function applyCreatePatient(state: AtalState, input: PatientCreateActionInput) {
  const name = input.patient.name.trim();
  if (!name) throw actionError('CORE_INPUT_INVALID', 'Añade el nombre del paciente.');
  ensureUniquePatientName(state, name);

  const patient: PatientEntity = {
    ...structuredClone(input.patient),
    id: input.patientId,
    name,
    diagnosis: input.patient.diagnosis.trim() || 'Motivo por completar',
    contact: {
      phone: input.patient.contact.phone ?? '',
      email: input.patient.contact.email ?? '',
      address: input.patient.contact.address ?? '',
      emergencyContact: input.patient.contact.emergencyContact ?? '',
    },
    createdAt: input.now,
    updatedAt: input.now,
  };

  const eventId = input.createEventId();
  state.patients.push(patient);
  state.events.unshift({
    id: eventId,
    kind: 'patient_created',
    patientId: patient.id,
    title: 'Paciente creado',
    detail: patient.name,
    createdAt: input.now,
  });

  return { patient, eventId };
}

export function applyUpdatePatient(state: AtalState, input: PatientUpdateActionInput) {
  const patient = state.patients.find((item) => item.id === input.patientId);
  if (!patient) throw actionError('CORE_ENTITY_NOT_FOUND', 'Paciente no encontrado.');

  const nextName = input.patch.name === undefined ? patient.name : input.patch.name.trim();
  if (!nextName) throw actionError('CORE_INPUT_INVALID', 'El nombre del paciente no puede quedar vacío.');
  ensureUniquePatientName(state, nextName, patient.id);

  const contact = input.patch.contact
    ? { ...patient.contact, ...input.patch.contact }
    : patient.contact;
  const immutableId = patient.id;
  const immutableCreatedAt = patient.createdAt;

  Object.assign(patient, input.patch, {
    id: immutableId,
    name: nextName,
    contact,
    createdAt: immutableCreatedAt,
    updatedAt: input.now,
  });

  if (typeof patient.diagnosis === 'string') patient.diagnosis = patient.diagnosis.trim() || 'Motivo por completar';

  const eventId = input.createEventId();
  state.events.unshift({
    id: eventId,
    kind: 'patient_updated',
    patientId: patient.id,
    title: 'Paciente actualizado',
    detail: patient.name,
    createdAt: input.now,
  });

  return { patient, eventId };
}
