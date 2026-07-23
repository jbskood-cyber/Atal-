import type { AIWorkContext, AIAttachmentPayload } from '../types';
import type { ConfirmationProof } from '../core/contracts';
import { executeToolInvocation } from '../core/executionEngine';
import { appendConfirmedResult, createAgentTask, runAgentLoop } from '../core/agentic/agentLoop';
import type { AgentLoopOutcome, AgentTaskState } from '../core/agentic/contracts';
import { selectAgentTools } from '../core/agentic/toolSelection';
import { requestAtalAgentTurn } from '../api/geminiClient';

export type AtalAgentControllerInput = {
  conversationId: string;
  draftId: string;
  text: string;
  route: string;
  workContext: AIWorkContext;
  attachments: AIAttachmentPayload[];
  task?: AgentTaskState;
  signal?: AbortSignal;
};

function sessionFromRoute(route: string): string {
  const match = /^\/activity\/([^/?#]+)/.exec(route);
  return match?.[1] ?? '';
}

function executionContext(input: AtalAgentControllerInput) {
  return {
    conversationId: input.conversationId,
    draftId: input.draftId,
    route: input.route,
    selectedPatientId: input.workContext.selectedPatientId,
    selectedPlanId: input.workContext.selectedPlanId,
    selectedExerciseId: input.workContext.selectedExerciseId,
    selectedSessionId: sessionFromRoute(input.route),
    now: new Date().toISOString(),
  };
}

function requestShape(input: AtalAgentControllerInput) {
  return {
    conversationId: input.conversationId,
    text: input.text,
    route: input.route,
    selectedPatientId: input.workContext.selectedPatientId,
    selectedPlanId: input.workContext.selectedPlanId,
    selectedExerciseId: input.workContext.selectedExerciseId,
    selectedSessionId: sessionFromRoute(input.route),
    attachments: input.attachments.map((item) => ({ id: item.id, name: item.name, type: item.type, kind: item.kind, data: item.data })),
  };
}

export async function runAtalAgentRequest(input: AtalAgentControllerInput): Promise<AgentLoopOutcome> {
  const allowedTools = selectAgentTools({
    text: input.text,
    route: input.route,
    hasImageOrPdf: input.attachments.some((item) => item.kind === 'image' || item.kind === 'pdf'),
    hasAudio: input.attachments.some((item) => item.kind === 'audio'),
  });
  const task = input.task?.status === 'running'
    ? { ...input.task, allowedTools: [...new Set([...input.task.allowedTools, ...allowedTools])] }
    : createAgentTask(input.conversationId, input.text, allowedTools);
  return runAgentLoop({
    task,
    request: requestShape(input),
    context: executionContext(input),
    requestModel: requestAtalAgentTurn,
    executeTool: (invocation, confirmation) => executeToolInvocation({ invocation, context: executionContext(input), confirmation }),
    signal: input.signal,
  });
}

export async function confirmAndContinueAtalAgent(
  input: AtalAgentControllerInput & { task: AgentTaskState; confirmation: ConfirmationProof },
): Promise<AgentLoopOutcome> {
  const pendingCall = input.task.pendingCall;
  const pendingInvocation = input.task.pendingInvocation;
  if (!pendingCall || !pendingInvocation) throw new Error('La tarea ya no tiene una acción pendiente de confirmación.');
  const result = executeToolInvocation({ invocation: pendingInvocation, context: executionContext(input), confirmation: input.confirmation });
  const task = appendConfirmedResult(input.task, pendingCall, pendingInvocation, result);
  if (task.status !== 'running') return { task, lastResults: [{ callId: pendingCall.id, invocation: pendingInvocation, result }] };
  const continued = await runAgentLoop({
    task,
    request: requestShape(input),
    context: executionContext(input),
    requestModel: requestAtalAgentTurn,
    executeTool: (invocation, confirmation) => executeToolInvocation({ invocation, context: executionContext(input), confirmation }),
    signal: input.signal,
  });
  return { task: continued.task, lastResults: [{ callId: pendingCall.id, invocation: pendingInvocation, result }, ...continued.lastResults] };
}
