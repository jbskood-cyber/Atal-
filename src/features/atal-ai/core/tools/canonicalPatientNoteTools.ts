import { applyUpdatePatientNote } from '../../../../domain/actions/patientNoteActions';
import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function ref(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  }
  return value as EntityRef;
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') throw coreError('CORE_INPUT_INVALID', 'La nota no es válida.');
  const normalized = value.trim();
  if (!normalized) throw coreError('CORE_INPUT_INVALID', 'Escribe el contenido de la nota.');
  if (normalized.length > max) throw coreError('CORE_INPUT_INVALID', `La nota supera ${max} caracteres.`);
  return normalized;
}

export const canonicalPatientNoteToolNames = new Set(['patient_note.update']);

export const canonicalPatientNoteTools: ToolDefinition<any>[] = [
  {
    name: 'patient_note.update',
    version: 1,
    description: 'Edita una nota existente del historial del paciente.',
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['patient'],
    validateInput(input) {
      const value = objectInput(input, 'La edición de la nota no es válida.');
      const noteId = text(value.noteId, 180);
      const content = text(value.content, 1000);
      return { patient: ref(value.patient, 'patient'), noteId, content };
    },
    preconditions(environment, input) {
      const note = environment.state.notes.find((item) => item.id === input.noteId);
      if (!note || note.patientId !== environment.resolved.patient?.id) {
        throw coreError('CORE_PRECONDITION_FAILED', 'La nota ya no existe o no pertenece al paciente.');
      }
    },
    execute(environment, input) {
      const { note } = applyUpdatePatientNote(environment.state, {
        noteId: input.noteId,
        patientId: environment.resolved.patient!.id,
        content: input.content,
        now: environment.context.now,
      });
      return {
        status: 'success',
        message: 'Nota actualizada.',
        summary: ['Nota clínica actualizada.'],
        data: { patientId: note.patientId, noteId: note.id },
        href: `/patients/${note.patientId}`,
        affected: [{ type: 'patient', id: note.patientId }],
      };
    },
  },
];
