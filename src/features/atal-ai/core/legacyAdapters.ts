import type { AICommand, AICommandType, AIWorkContext, AtalAIDraft, AtalAIIntent, PrivateContactDraft } from '../types';
import type { ConfirmationProof, ExecutionContext, ToolInvocation } from './contracts';
import { executeToolInvocation, type ExecuteToolOptions } from './executionEngine';

export const draftToolMap: Partial<Record<AtalAIIntent, string>> = {
  create_patient_plan: 'patient.create_with_record_and_plan',
  create_plan_for_existing_patient: 'plan.create_for_patient',
  create_exercise: 'exercise.create',
  update_patient_record: 'patient_record.update',
  update_existing_plan: 'plan.update',
  update_existing_exercise: 'exercise.update',
};

export const commandToolMap: Record<AICommandType, string> = {
  search_patient: 'patient.search', summarize_patient: 'patient.summarize', add_patient_note: 'patient_note.add',
  activate_plan: 'plan.activate', pause_plan: 'plan.pause', complete_plan: 'plan.complete', archive_plan: 'plan.archive',
  restore_plan: 'plan.restore', replace_active_plan: 'plan.replace_active', summarize_sessions: 'session.summarize_recent',
  create_report: 'report.prepare_session_summary', export_data: 'data.export_local', update_settings: 'settings.update',
};

export function invocationFromDraft(
  draft: AtalAIDraft,
  privateContact: PrivateContactDraft,
  options: { proposalId?: string; force?: boolean } = {},
): ToolInvocation {
  const tool = draftToolMap[draft.intent];
  if (!tool) throw new Error(`Unsupported draft intent: ${draft.intent}`);
  const references = [];
  if (['patient_record.update', 'plan.create_for_patient', 'plan.update'].includes(tool)) references.push({ type: 'patient' as const, id: draft.selectedPatientId });
  if (tool === 'plan.update') references.push({ type: 'plan' as const, id: draft.selectedPlanId });
  if (tool === 'exercise.update') references.push({ type: 'exercise' as const, id: draft.selectedExerciseId });
  return {
    tool, version: 1, input: { draft, privateContact, force: options.force === true }, references,
    proposalId: options.proposalId ?? draft.id,
  };
}

export function invocationFromCommand(command: AICommand, workContext: AIWorkContext, proposalId: string): ToolInvocation {
  const tool = commandToolMap[command.type];
  const patientId = command.patientId || workContext.selectedPatientId;
  const planId = command.planId || workContext.selectedPlanId;
  const patientRef = { type: 'patient' as const, id: patientId };
  const planRef = { type: 'plan' as const, id: planId };
  if (command.type === 'search_patient') return { tool, version: 1, input: { query: command.query }, references: [], proposalId };
  if (command.type === 'summarize_patient') return { tool, version: 1, input: { patient: patientRef }, references: [patientRef], proposalId };
  if (command.type === 'summarize_sessions') return { tool, version: 1, input: { patient: patientRef, limit: 3 }, references: [patientRef], proposalId };
  if (command.type === 'create_report') {
    const sessionRef = command.sessionId ? { type: 'session' as const, id: command.sessionId } : undefined;
    return { tool, version: 1, input: sessionRef ? { session: sessionRef } : { patient: patientRef }, references: sessionRef ? [sessionRef] : [patientRef], proposalId };
  }
  if (command.type === 'add_patient_note') return { tool, version: 1, input: { patient: patientRef, content: command.content }, references: [patientRef], proposalId };
  if (command.type === 'export_data') return { tool, version: 1, input: { kind: command.exportType || 'backup' }, references: [], proposalId };
  if (command.type === 'update_settings') return { tool, version: 1, input: { patch: command.settings }, references: [{ type: 'settings' }], proposalId };
  const references = command.type === 'replace_active_plan' ? [patientRef, planRef] : [planRef];
  return { tool, version: 1, input: command.type === 'replace_active_plan' ? { plan: planRef, replaceCurrent: true } : { plan: planRef }, references, proposalId };
}

export function executionContext(workContext: AIWorkContext, metadata: { conversationId: string; draftId: string; route?: string; now?: string }): ExecutionContext {
  return {
    conversationId: metadata.conversationId, draftId: metadata.draftId, route: metadata.route ?? '/atal-ai',
    selectedPatientId: workContext.selectedPatientId, selectedPlanId: workContext.selectedPlanId,
    selectedExerciseId: workContext.selectedExerciseId, selectedSessionId: '', now: metadata.now ?? new Date().toISOString(),
  };
}

export function executeLegacyAIAction(args: {
  draft?: AtalAIDraft;
  command?: AICommand;
  privateContact?: PrivateContactDraft;
  workContext: AIWorkContext;
  metadata: { conversationId: string; draftId: string; route?: string; now?: string; force?: boolean };
  confirmation?: ConfirmationProof;
}, options?: ExecuteToolOptions) {
  const invocation = args.draft
    ? invocationFromDraft(args.draft, args.privateContact ?? { phone: '', email: '', address: '', emergencyContact: '' }, { proposalId: args.draft.id, force: args.metadata.force })
    : invocationFromCommand(args.command!, args.workContext, args.metadata.draftId);
  return executeToolInvocation({ invocation, context: executionContext(args.workContext, args.metadata), confirmation: args.confirmation }, options);
}
