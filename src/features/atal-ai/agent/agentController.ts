import type { AIMessage, AIWorkContext, AIAttachmentPayload } from '../types';
import type { ConfirmationProof } from '../core/contracts';
import { executeToolInvocation } from '../core/executionEngine';
import { appendConfirmedResult, createAgentTask, runAgentLoop } from '../core/agentic/agentLoop';
import type { AgentHistoryContent, AgentLoopOutcome, AgentTaskState } from '../core/agentic/contracts';
import { AGENT_MAX_ACTIVE_TOOLS, selectAgentTools } from '../core/agentic/toolSelection';
import { requestAtalAgentTurn } from '../api/geminiClient';

const MAX_VISIBLE_HISTORY_MESSAGES = 16;

export type AtalAgentControllerInput = {
  conversationId: string;
  draftId: string;
  text: string;
  route: string;
  workContext: AIWorkContext;
  attachments: AIAttachmentPayload[];
  messages: AIMessage[];
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

function visibleConversationHistory(input: AtalAgentControllerInput): AgentHistoryContent[] {
  let messages = input.messages.filter((item) => item.role === 'user' || item.role === 'assistant');
  const activeTask = input.task && ['running', 'needs-confirmation', 'needs-clarification'].includes(input.task.status)
    ? input.task
    : undefined;
  if (activeTask) {
    const lastUserIndex = messages.findLastIndex((item) => item.role === 'user');
    if (lastUserIndex >= 0 && messages[lastUserIndex]?.text.trim() === activeTask.goal.trim()) {
      messages = messages.filter((_item, index) => index !== lastUserIndex);
    }
  }
  return messages.slice(-MAX_VISIBLE_HISTORY_MESSAGES).map((item) => ({
    role: item.role === 'user' ? 'user' : 'model',
    parts: [{ text: item.text }],
  }));
}

function requestShape(input: AtalAgentControllerInput) {
  return {
    conversationId: input.conversationId,
    text: input.text.trim() || input.task?.goal || '',
    route: input.route,
    selectedPatientId: input.workContext.selectedPatientId,
    selectedPlanId: input.workContext.selectedPlanId,
    selectedExerciseId: input.workContext.selectedExerciseId,
    selectedSessionId: sessionFromRoute(input.route),
    conversationHistory: visibleConversationHistory(input),
    attachments: input.attachments.map((item) => ({ id: item.id, name: item.name, type: item.type, kind: item.kind, data: item.data })),
  };
}

export async function runAtalAgentRequest(input: AtalAgentControllerInput): Promise<AgentLoopOutcome> {
  const allowedTools = selectAgentTools({
    text: input.text,
    route: input.route,
    intent: input.workContext.intent,
    hasImageOrPdf: input.attachments.some((item) => item.kind === 'image' || item.kind === 'pdf'),
    hasAudio: input.attachments.some((item) => item.kind === 'audio'),
  });
  const task = input.task?.status === 'running'
    ? {
        ...input.task,
        allowedTools: [...new Set([...input.task.allowedTools, ...allowedTools])].slice(0, AGENT_MAX_ACTIVE_TOOLS),
      }
    : createAgentTask(input.conversationId, input.text, allowedTools);
  return runAgentLoop({
    task,
    request: requestShape({ ...input, task }),
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
    request: requestShape({ ...input, task }),
    context: executionContext(input),
    requestModel: requestAtalAgentTurn,
    executeTool: (invocation, confirmation) => executeToolInvocation({ invocation, context: executionContext(input), confirmation }),
    signal: input.signal,
  });
  return { task: continued.task, lastResults: [{ callId: pendingCall.id, invocation: pendingInvocation, result }, ...continued.lastResults] };
}
