import type { AtalState, PatientNote } from '../../data/atalStore';

export type UpdatePatientNoteActionInput = {
  noteId: string;
  patientId: string;
  content: string;
  now: string;
};

export type UpdatePatientNoteActionResult = {
  note: PatientNote;
};

export function applyUpdatePatientNote(state: AtalState, input: UpdatePatientNoteActionInput): UpdatePatientNoteActionResult {
  const note = state.notes.find((item) => item.id === input.noteId);
  if (!note) throw new Error('Nota no encontrada.');
  if (note.patientId !== input.patientId) throw new Error('La nota no pertenece al paciente.');

  const content = input.content.trim();
  if (!content) throw new Error('La nota necesita contenido.');
  if (content.length > 1000) throw new Error('La nota supera 1000 caracteres.');

  note.content = content;
  note.updatedAt = input.now;
  return { note };
}
