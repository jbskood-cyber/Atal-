import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

type AddNoteInput = { patient: EntityRef; content: string };

export const patientTools: ToolDefinition[] = [
  {
    name: 'patient_note.add',
    version: 1,
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['patient'],
    validateInput(input): AddNoteInput {
      if (!input || typeof input !== 'object') throw coreError('CORE_INPUT_INVALID', 'La nota no es válida.');
      const value = input as Record<string, unknown>;
      const patient = value.patient as EntityRef;
      const content = typeof value.content === 'string' ? value.content.trim() : '';
      if (!patient || patient.type !== 'patient') throw coreError('CORE_INPUT_INVALID', 'Selecciona un paciente válido.');
      if (!content) throw coreError('CORE_INPUT_INVALID', 'Escribe la nota clínica.');
      if (content.length > 10_000) throw coreError('CORE_INPUT_INVALID', 'La nota supera el máximo de 10,000 caracteres.');
      return { patient, content };
    },
    preconditions(environment) {
      if (!environment.state.patients.some((patient) => patient.id === environment.resolved.patient?.id)) {
        throw coreError('CORE_PRECONDITION_FAILED', 'El paciente ya no existe.');
      }
    },
    execute(environment, input) {
      const { content } = input as AddNoteInput;
      const patient = environment.resolved.patient!;
      const note = {
        id: `${environment.transactionId}-note`,
        patientId: patient.id,
        content,
        professional: environment.state.settings.professionalName,
        createdAt: environment.context.now,
        updatedAt: environment.context.now,
      };
      environment.state.notes.unshift(note);
      return {
        status: 'success',
        message: `Nota añadida al historial de ${patient.name}.`,
        summary: [`Nota añadida a ${patient.name}.`],
        href: `/patients/${patient.id}`,
        affected: [{ type: 'patient', id: patient.id }],
      };
    },
  },
];
