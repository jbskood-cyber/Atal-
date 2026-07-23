import type { ToolExecutionResult, ToolInvocation } from '../contracts';
import { stableSerialize } from '../stableValue';
import type {
  AgentFunctionCall,
  AgentHistoryContent,
  AgentLoopInput,
  AgentLoopOutcome,
  AgentStepResult,
  AgentTaskState,
} from './contracts';

const DEFAULT_MAX_STEPS = 8;
const MAX_RESULT_CHARS = 40_000;

function now(): string {
  return new Date().toISOString();
}

export function createAgentTask(conversationId: string, goal: string, allowedTools: string[], createdAt = now()): AgentTaskState {
  return {
    id: `agent-task-${conversationId}-${Date.parse(createdAt) || Date.now()}`,
    conversationId,
    goal: goal.trim(),
    status: 'running',
    stepCount: 0,
    maxSteps: DEFAULT_MAX_STEPS,
    allowedTools: [...new Set(allowedTools)],
    history: [],
    completed: [],
    seenCallSignatures: [],
    finalText: '',
    createdAt,
    updatedAt: createdAt,
  };
}

function callSignature(call: AgentFunctionCall): string {
  return stableSerialize({ tool: call.tool, input: call.input, references: call.references });
}

function resultMessage(result: ToolExecutionResult): string {
  if (result.status === 'success') return result.message;
  if (result.status === 'clarification') return result.clarification.message;
  if (result.status === 'confirmation-required') return result.decision.reason;
  return result.message;
}

function modelOutput(result: ToolExecutionResult): Record<string, unknown> {
  const serialized = JSON.stringify(result);
  if (serialized.length <= MAX_RESULT_CHARS) return { output: result };
  return {
    output: {
      status: result.status,
      message: resultMessage(result),
      truncated: true,
    },
  };
}

function functionResponseContent(call: AgentFunctionCall, result: ToolExecutionResult): AgentHistoryContent {
  return {
    role: 'user',
    parts: [{
      functionResponse: {
        id: call.id,
        name: call.bridge,
        response: modelOutput(result),
      },
    }],
  };
}

function invocationFor(call: AgentFunctionCall, fileDerived: boolean): ToolInvocation {
  return {
    tool: call.tool,
    version: 1,
    input: call.input,
    references: call.references as ToolInvocation['references'],
    proposalId: call.id,
    authorization: fileDerived ? 'file-derived' : 'explicit-user-request',
  };
}

function terminalState(task: AgentTaskState, result: ToolExecutionResult, invocation: ToolInvocation, callId: string): AgentTaskState {
  if (result.status === 'confirmation-required') {
    return { ...task, status: 'needs-confirmation', pendingInvocation: result.invocation, pendingCallId: callId, finalText: result.decision.reason };
  }
  if (result.status === 'clarification') {
    return { ...task, status: 'needs-clarification', pendingInvocation: invocation, pendingCallId: callId, finalText: result.clarification.message };
  }
  if (result.status === 'blocked') return { ...task, status: 'blocked', finalText: result.message };
  if (result.status === 'error') return { ...task, status: 'failed', finalText: result.message, error: result.code };
  return task;
}

function isTerminalResult(result: ToolExecutionResult): boolean {
  return result.status !== 'success';
}

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopOutcome> {
  let task = structuredClone(input.task);
  const lastResults: AgentStepResult[] = [];
  const fileDerived = input.request.attachments.some((item) => item.kind === 'image' || item.kind === 'pdf');

  while (task.status === 'running' && task.stepCount < task.maxSteps) {
    if (input.signal?.aborted) {
      task = { ...task, status: 'cancelled', finalText: 'Procesamiento cancelado. El trabajo completado se conservó.', updatedAt: now() };
      break;
    }

    const turn = await input.requestModel({
      ...input.request,
      allowedTools: task.allowedTools,
      history: task.history,
    }, input.signal);
    task.stepCount += 1;
    task.updatedAt = now();
    if (turn.modelContent) task.history.push(turn.modelContent);

    if (!turn.calls.length) {
      task.status = 'completed';
      task.finalText = turn.text.trim() || 'Listo. Completé el trabajo solicitado.';
      break;
    }

    const responseParts: AgentHistoryContent['parts'] = [];
    for (const call of turn.calls) {
      if (!task.allowedTools.includes(call.tool)) {
        task.status = 'blocked';
        task.finalText = 'La acción solicitada no estaba disponible para este contexto.';
        task.error = `TOOL_NOT_ALLOWED:${call.tool}`;
        break;
      }
      const signature = callSignature(call);
      if (task.seenCallSignatures.includes(signature)) {
        task.status = 'failed';
        task.finalText = 'Detuve una repetición de la misma acción para evitar cambios duplicados.';
        task.error = 'DUPLICATE_TOOL_CALL';
        break;
      }
      task.seenCallSignatures.push(signature);
      const invocation = invocationFor(call, fileDerived);
      const result = input.executeTool(invocation);
      const step = { callId: call.id, invocation, result } satisfies AgentStepResult;
      task.completed.push(step);
      lastResults.push(step);

      if (isTerminalResult(result)) {
        task = terminalState(task, result, invocation, call.id);
        break;
      }
      responseParts.push(...functionResponseContent(call, result).parts);
    }

    if (task.status !== 'running') break;
    if (responseParts.length) task.history.push({ role: 'user', parts: responseParts });
  }

  if (task.status === 'running') {
    task.status = 'failed';
    task.error = 'MAX_AGENT_STEPS';
    task.finalText = 'Detuve el proceso al alcanzar el límite seguro de pasos. Los cambios completados se conservaron.';
  }
  task.updatedAt = now();
  return { task, lastResults };
}

export function appendConfirmedResult(
  task: AgentTaskState,
  call: AgentFunctionCall,
  invocation: ToolInvocation,
  result: ToolExecutionResult,
): AgentTaskState {
  const next = structuredClone(task);
  next.pendingInvocation = undefined;
  next.pendingCallId = undefined;
  next.completed.push({ callId: call.id, invocation, result });
  next.history.push(functionResponseContent(call, result));
  next.status = result.status === 'success' ? 'running'
    : result.status === 'clarification' ? 'needs-clarification'
      : result.status === 'blocked' ? 'blocked' : 'failed';
  next.finalText = result.status === 'success' ? '' : resultMessage(result);
  next.updatedAt = now();
  return next;
}
