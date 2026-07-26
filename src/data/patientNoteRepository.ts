import { getAtalState, mutateAtalStore, type PatientNote } from './atalStore';
import { applyUpdatePatientNote } from '../domain/actions/patientNoteActions';

export function updateClinicalPatientNote(id: string, content: string): PatientNote {
  const existing = getAtalState().notes.find((item) => item.id === id);
  if (!existing) throw new Error('Nota no encontrada.');

  let result: PatientNote | null = null;
  mutateAtalStore((draft) => {
    result = applyUpdatePatientNote(draft, {
      noteId: id,
      patientId: existing.patientId,
      content,
      now: new Date().toISOString(),
    }).note;
  });

  if (!result) throw new Error('No se pudo actualizar la nota.');
  return result;
}
