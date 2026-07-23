import { coreError, type ToolDefinition } from '../contracts';

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export const exportTools: ToolDefinition[] = [{
  name: 'data.export_local',
  version: 1,
  risk: 'sensitive-write',
  mutates: true,
  supportsUndo: false,
  requiredEntities: [],
  validateInput(input) {
    const kind = input && typeof input === 'object' ? (input as Record<string, unknown>).kind : undefined;
    if (!['patients', 'progress', 'plans', 'backup'].includes(String(kind))) throw coreError('CORE_INPUT_INVALID', 'Selecciona un tipo de exportación válido.');
    return { kind: kind as 'patients' | 'progress' | 'plans' | 'backup' };
  },
  preconditions() {},
  execute(environment, input) {
    const { kind } = input as { kind: 'patients' | 'progress' | 'plans' | 'backup' };
    const date = environment.context.now.slice(0, 10);
    let filename: string;
    let mimeType: string;
    let content: string;
    let message: string;
    if (kind === 'patients') {
      const rows = [['ID', 'Paciente', 'Motivo clínico', 'Estado', 'Última actualización'], ...environment.state.patients.map((item) => [item.id, item.name, item.diagnosis, item.status, item.updatedAt])];
      filename = `atal-pacientes-${date}.csv`;
      mimeType = 'text/csv;charset=utf-8';
      content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
      message = 'Directorio de pacientes preparado.';
    } else if (kind === 'progress') {
      const rows = [['Sesión', 'Paciente', 'Plan', 'Estado', 'Dolor inicial', 'Dolor final', 'Duración (min)', 'Fecha'], ...environment.state.sessions.map((item) => [item.id, item.patientId, item.planId, item.status, item.startPain, item.endPain, item.durationMinutes, item.completedAt])];
      filename = `atal-progreso-${date}.csv`;
      mimeType = 'text/csv;charset=utf-8';
      content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
      message = 'Progreso clínico preparado.';
    } else if (kind === 'plans') {
      filename = `atal-planes-${date}.json`;
      mimeType = 'application/json';
      content = JSON.stringify(environment.state.plans, null, 2);
      message = 'Resumen de planes preparado.';
    } else {
      filename = `atal-respaldo-${date}.json`;
      mimeType = 'application/json';
      content = JSON.stringify({ ...environment.state, exportedAt: environment.context.now, mediaExcluded: true }, null, 2);
      message = 'Respaldo local preparado.';
    }
    return {
      status: 'success',
      message,
      summary: [message],
      affected: [],
      clientEffect: { type: 'download', filename, mimeType, content },
    };
  },
}];

function blocked(name: string, risk: 'destructive' | 'external', reason: string): ToolDefinition {
  return {
    name,
    version: 1,
    risk,
    blockedReason: reason,
    mutates: false,
    supportsUndo: false,
    requiredEntities: [],
    validateInput: (input) => input,
    preconditions() {},
    execute() {
      throw coreError(risk === 'external' ? 'CORE_EXTERNAL_BLOCKED' : 'CORE_EXECUTION_FAILED', reason);
    },
  };
}

export const blockedTools: ToolDefinition[] = [
  blocked('patient.delete_permanently', 'destructive', 'La eliminación permanente de pacientes no está disponible.'),
  blocked('plan.delete_permanently', 'destructive', 'La eliminación permanente de planes no está disponible; usa archivar.'),
  blocked('message.send_patient', 'external', 'Las integraciones de mensajería están bloqueadas en el Bloque 4.1.'),
  blocked('email.send_report', 'external', 'El envío por correo está bloqueado en el Bloque 4.1.'),
  blocked('cloud.sync', 'external', 'La sincronización en nube está bloqueada en el Bloque 4.1.'),
];
