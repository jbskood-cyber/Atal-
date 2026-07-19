import {
  addPatientNote,
  exportStoreSnapshot,
  getAtalState,
  mutateAtalStore,
  recordAtalAIEvent,
  updatePlan,
  updatePlanStatus,
  updateSettings,
  type AppSettings,
  type PlanEntity,
} from '@/src/data/atalStore';
import type { AICommand, AICommandResult, AIUndoToken, AIWorkContext } from '../types';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';

export type AICommandClass = 'query' | 'draft' | 'delicate';

const commandClass: Record<AICommand['type'], AICommandClass> = {
  search_patient: 'query',
  summarize_patient: 'query',
  summarize_sessions: 'query',
  create_report: 'query',
  add_patient_note: 'draft',
  activate_plan: 'delicate',
  pause_plan: 'delicate',
  complete_plan: 'delicate',
  archive_plan: 'delicate',
  restore_plan: 'delicate',
  replace_active_plan: 'delicate',
  export_data: 'delicate',
  update_settings: 'draft',
};

export function getAICommandClass(command: AICommand) { return commandClass[command.type]; }

function resolved(command: AICommand, context: AIWorkContext): AICommand {
  return {
    ...command,
    patientId: command.patientId || context.selectedPatientId,
    planId: command.planId || context.selectedPlanId,
    exerciseId: command.exerciseId || context.selectedExerciseId,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function csvCell(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

function download(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData(exportType: AICommand['exportType']) {
  const state = getAtalState();
  const date = new Date().toISOString().slice(0, 10);
  if (exportType === 'patients') {
    const rows = [['ID','Paciente','Motivo clínico','Estado','Última actualización'], ...state.patients.map((item) => [item.id,item.name,item.diagnosis,item.status,item.updatedAt])];
    download(`atal-pacientes-${date}.csv`, 'text/csv;charset=utf-8', `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`);
    return 'Directorio de pacientes descargado.';
  }
  if (exportType === 'progress') {
    const rows = [['Sesión','Paciente','Plan','Estado','Dolor inicial','Dolor final','Duración (min)','Fecha'], ...state.sessions.map((item) => [item.id,state.patients.find((patient) => patient.id === item.patientId)?.name ?? '',state.plans.find((plan) => plan.id === item.planId)?.title ?? '',item.status,item.startPain,item.endPain,item.durationMinutes,item.completedAt])];
    download(`atal-progreso-${date}.csv`, 'text/csv;charset=utf-8', `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`);
    return 'Progreso clínico descargado.';
  }
  if (exportType === 'plans') {
    download(`atal-planes-${date}.json`, 'application/json', JSON.stringify(state.plans, null, 2));
    return 'Resumen de planes descargado.';
  }
  download(`atal-respaldo-${date}.json`, 'application/json', JSON.stringify(exportStoreSnapshot(), null, 2));
  return 'Respaldo local descargado.';
}

function sessionSummary(patientId: string) {
  const state = getAtalState();
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) throw new Error('Selecciona un paciente válido.');
  const sessions = state.sessions.filter((item) => item.patientId === patientId).sort((a,b) => b.completedAt.localeCompare(a.completedAt)).slice(0,3);
  if (!sessions.length) return `${patient.name} todavía no tiene sesiones terminadas.`;
  const averagePain = Math.round((sessions.reduce((sum,item) => sum + item.endPain, 0) / sessions.length) * 10) / 10;
  const completed = sessions.filter((item) => item.status === 'completed').length;
  return `${patient.name}: ${sessions.length} sesiones recientes, ${completed} completadas y dolor final promedio ${averagePain}/10. Última sesión: ${formatDate(sessions[0].completedAt)}.`;
}

export function executeImmediateAICommand(raw: AICommand, context: AIWorkContext): AICommandResult {
  const command = resolved(raw, context);
  const state = getAtalState();
  if (command.type === 'search_patient') {
    const query = command.query.trim().toLocaleLowerCase('es');
    const matches = state.patients.filter((item) => `${item.name} ${item.diagnosis} ${item.affectedArea}`.toLocaleLowerCase('es').includes(query)).slice(0,5);
    return { message: matches.length ? `Encontré ${matches.length}: ${matches.map((item) => `${item.name} — ${item.diagnosis}`).join('; ')}.` : 'No encontré pacientes con ese criterio.' };
  }
  if (command.type === 'summarize_patient') {
    const patient = state.patients.find((item) => item.id === command.patientId);
    if (!patient) throw new Error('Selecciona el paciente que deseas resumir.');
    const plan = state.plans.find((item) => item.patientId === patient.id && item.status === 'active');
    const record = state.clinicalRecords.find((item) => item.patientId === patient.id);
    return { message: `${patient.name}. ${patient.diagnosis}. ${record?.evolution || 'Sin evolución documentada'}. ${plan ? `Plan activo: ${plan.title}.` : 'Sin plan activo.'}`, href: `/patients/${patient.id}` };
  }
  if (command.type === 'summarize_sessions') return { message: sessionSummary(command.patientId), href: command.patientId ? `/patients/${command.patientId}` : undefined };
  if (command.type === 'create_report') {
    const session = command.sessionId ? state.sessions.find((item) => item.id === command.sessionId) : state.sessions.find((item) => item.patientId === command.patientId);
    if (!session) throw new Error('No hay una sesión disponible para preparar el reporte.');
    return { message: `Reporte listo: sesión ${session.status === 'completed' ? 'completada' : 'parcial'}, dolor ${session.startPain}/10 → ${session.endPain}/10, esfuerzo ${session.effort}/5 y duración aproximada ${session.durationMinutes} minutos.`, href: `/activity/${session.id}` };
  }
  throw new Error('Esta acción necesita confirmación antes de ejecutarse.');
}

export function executeConfirmedAICommand(raw: AICommand, context: AIWorkContext, metadata: { conversationId: string; draftId: string }): AICommandResult {
  const command = resolved(raw, context);
  const state = getAtalState();
  let result: AICommandResult;
  if (command.type === 'add_patient_note') {
    const patient = state.patients.find((item) => item.id === command.patientId);
    if (!patient || !command.content.trim()) throw new Error('Selecciona un paciente y escribe la nota clínica.');
    addPatientNote(patient.id, command.content, state.settings.professionalName);
    result = { message: `Nota añadida al historial de ${patient.name}.`, href: `/patients/${patient.id}` };
  } else if (command.type === 'replace_active_plan') {
    const target = state.plans.find((item) => item.id === command.planId);
    if (!target) throw new Error('Selecciona el plan que deseas activar.');
    const current = state.plans.find((item) => item.patientId === target.patientId && item.status === 'active' && item.id !== target.id);
    const previous = [structuredClone(target), ...(current ? [structuredClone(current)] : [])];
    mutateAtalStore((draft) => {
      const nextTarget=draft.plans.find((item)=>item.id===target.id);if(!nextTarget)throw new Error('El plan seleccionado ya no existe.');
      const active=draft.plans.find((item)=>item.patientId===nextTarget.patientId&&item.status==='active'&&item.id!==nextTarget.id);if(active){active.status='paused';active.updatedAt=new Date().toISOString();}
      nextTarget.status='active';nextTarget.updatedAt=new Date().toISOString();
    });
    result = { message: current ? `Plan “${target.title}” activado y “${current.title}” pausado.` : `Plan “${target.title}” activado.`, href: `/plans/${target.id}`, undo: { entity:'plan',entityId:target.id,previous,expiresAt:new Date(Date.now()+30_000).toISOString() } };
  } else if (['activate_plan','pause_plan','complete_plan','archive_plan','restore_plan'].includes(command.type)) {
    const plan = state.plans.find((item) => item.id === command.planId);
    if (!plan) throw new Error('Selecciona un plan válido.');
    const status = command.type === 'activate_plan' ? 'active' : command.type === 'pause_plan' ? 'paused' : command.type === 'complete_plan' ? 'completed' : command.type === 'archive_plan' ? 'archived' : 'draft';
    const previous = structuredClone(plan);
    updatePlanStatus(plan.id, status);
    result = { message: `Plan “${plan.title}” ${status === 'active' ? 'activado' : status === 'paused' ? 'pausado' : status === 'completed' ? 'completado' : status === 'archived' ? 'archivado' : 'restaurado como borrador'}.`, href: `/plans/${plan.id}`, undo: { entity: 'plan', entityId: plan.id, previous, expiresAt: new Date(Date.now() + 30_000).toISOString() } };
  } else if (command.type === 'export_data') {
    result = { message: exportData(command.exportType || 'backup'), href: '/exports' };
  } else if (command.type === 'update_settings') {
    const allowed: (keyof AppSettings)[] = ['notifications','haptics','compact','sessionLock','clinicalPrivacy','aiSuggestions','aiAlerts','aiInstructions'];
    const patch: Partial<AppSettings> = {};
    for (const key of allowed) if (key in command.settings) Object.assign(patch, { [key]: command.settings[key] });
    const previous = Object.fromEntries(Object.keys(patch).map((key) => [key, state.settings[key as keyof AppSettings]]));
    updateSettings(patch);
    result = { message: 'Preferencias de Atal actualizadas.', href: '/settings', undo: { entity: 'settings', entityId: 'settings', previous, expiresAt: new Date(Date.now() + 30_000).toISOString() } };
  } else {
    return executeImmediateAICommand(command, context);
  }
  recordAtalAIEvent({ title: 'Acción ejecutada desde Atal IA', detail: result.message, patientId: command.patientId || undefined, planId: command.planId || undefined, intent: command.type, entity: command.planId ? 'plan' : command.patientId ? 'patient' : 'settings', entityId: command.planId || command.patientId || 'settings', conversationId: metadata.conversationId, draftId: metadata.draftId });
  return result;
}

export function undoAICommand(token: AIUndoToken) {
  if (Date.parse(token.expiresAt) < Date.now()) throw new Error('El tiempo para deshacer terminó.');
  if (token.entity === 'plan' && Array.isArray(token.previous)) mutateAtalStore((state)=>{for(const previous of token.previous as PlanEntity[]){state.plans=state.plans.map((item)=>item.id===previous.id?previous:item);}});
  else if (token.entity === 'plan') updatePlan(token.entityId, token.previous as PlanEntity);
  else if (token.entity === 'record') mutateAtalStore((state) => { const previous=token.previous as ClinicalRecord;state.clinicalRecords=state.clinicalRecords.map((item)=>item.id===token.entityId?previous:item); });
  else if (token.entity === 'settings') updateSettings(token.previous as Partial<AppSettings>);
  else throw new Error('Esta acción ya no puede deshacerse desde aquí.');
}
