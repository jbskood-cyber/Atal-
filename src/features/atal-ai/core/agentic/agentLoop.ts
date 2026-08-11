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
import { groundPlanMembershipCall } from './planMembershipGrounding';
import { groundReportReviewCall } from './reportReviewGrounding';
import { AGENT_TOOL_CALL_REPAIR_MARKER } from './toolCallingPolicy';

const DEFAULT_MAX_STEPS = 8;
const MAX_RESULT_CHARS = 40_000;
const MAX_REPAIRABLE_FAILURES = 1;
const MAX_PSEUDO_TOOL_REPAIRS = 1;
const REQUIRED_ACTION_REPAIR_MARKER = '[ATAL_REQUIRED_ACTION_REPAIR]';
const READ_CONTINUATION_TOOLS = new Set(['app.read', 'patient.search']);

function now(): string {
  return new Date().toISOString();
}

export function createAgentTask(
  conversationId: string,
  goal: string,
  allowedTools: string[],
  createdAt = now(),
  requiredTools: string[] = [],
): AgentTaskState {
  return {
    id: `agent-task-${conversationId}-${Date.parse(createdAt) || Date.now()}`,
    conversationId,
    goal: goal.trim(),
    status: 'running',
    stepCount: 0,
    maxSteps: DEFAULT_MAX_STEPS,
    allowedTools: [...new Set(allowedTools)],
    requiredTools: [...new Set(requiredTools)],
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

function visibleFailureMessage(result: Extract<ToolExecutionResult, { status: 'error' }>): string {
  if (result.code === 'CORE_INPUT_INVALID') return 'No pude completar esa consulta con la información disponible. Puedes reformularla o decirme qué necesitas revisar.';
  if (result.code === 'CORE_ENTITY_NOT_FOUND') return 'No encontré una entidad que coincida con la solicitud.';
  if (result.code.startsWith('TOOL_NOT_ALLOWED')) return 'Esa acción no está disponible desde este contexto.';
  if (['CORE_PRECONDITION_FAILED', 'CORE_VERSION_CONFLICT', 'CORE_INVARIANT_FAILED'].includes(result.code)) return result.message;
  return 'No pude completar la solicitud de forma segura. No se aplicó ningún cambio dudoso.';
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
        name: call.functionName ?? call.bridge,
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

function terminalState(task: AgentTaskState, result: ToolExecutionResult, invocation: ToolInvocation, call: AgentFunctionCall): AgentTaskState {
  if (result.status === 'confirmation-required') {
    return { ...task, status: 'needs-confirmation', pendingInvocation: result.invocation, pendingCall: call, finalText: result.decision.reason };
  }
  if (result.status === 'clarification') {
    return { ...task, status: 'needs-clarification', pendingInvocation: invocation, pendingCall: call, finalText: result.clarification.message };
  }
  if (result.status === 'blocked') return { ...task, status: 'blocked', finalText: result.message };
  if (result.status === 'error') return { ...task, status: 'failed', finalText: visibleFailureMessage(result), error: result.code };
  return task;
}

function isRepairableResult(result: ToolExecutionResult): result is Extract<ToolExecutionResult, { status: 'error' }> {
  return result.status === 'error' && ['CORE_INPUT_INVALID', 'CORE_ENTITY_NOT_FOUND', 'CORE_ENTITY_RELATION_INVALID'].includes(result.code);
}

function repairableFailures(task: AgentTaskState): number {
  return task.completed.filter((step) => isRepairableResult(step.result)).length;
}

function isTerminalResult(result: ToolExecutionResult): boolean {
  return result.status !== 'success';
}

function providerFailureMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Atal IA no pudo continuar la tarea. No se perdió ningún cambio.';
}

function lastSuccessfulResult(task: AgentTaskState): Extract<ToolExecutionResult, { status: 'success' }> | undefined {
  for (let index = task.completed.length - 1; index >= 0; index -= 1) {
    const result = task.completed[index]?.result;
    if (result?.status === 'success') return result;
  }
  return undefined;
}

function successfulToolNames(task: AgentTaskState): Set<string> {
  return new Set(task.completed
    .filter((step) => step.result.status === 'success')
    .map((step) => step.invocation.tool));
}

function missingRequiredTools(task: AgentTaskState): string[] {
  const successful = successfulToolNames(task);
  return (task.requiredTools ?? []).filter((tool) => !successful.has(tool));
}

function requiredActionRepairs(task: AgentTaskState): number {
  return task.history.reduce((count, content) => count + content.parts.filter(
    (part) => typeof part.text === 'string' && part.text.includes(REQUIRED_ACTION_REPAIR_MARKER),
  ).length, 0);
}

function requiredActionRepairContent(missingTools: string[]): AgentHistoryContent {
  return {
    role: 'user',
    parts: [{
      text: `${REQUIRED_ACTION_REPAIR_MARKER} La solicitud contiene varias acciones explícitas y todavía faltan: ${missingTools.join(', ')}. No des por terminada la tarea. Usa las funciones declaradas restantes para completar únicamente esas acciones antes de redactar la respuesta final.`,
    }],
  };
}

function continuationTools(task: AgentTaskState, missingTools: string[]): string[] {
  const reads = task.allowedTools.filter((tool) => READ_CONTINUATION_TOOLS.has(tool));
  return [...new Set([...reads, ...missingTools])];
}

function partialCompletionMessage(task: AgentTaskState, missingTools: string[]): string {
  const successful = lastSuccessfulResult(task);
  const prefix = successful ? `${successful.message} ` : '';
  return `${prefix}No pude completar todas las acciones solicitadas. Falta: ${missingTools.join(', ')}. Revisa los cambios aplicados antes de continuar.`;
}

function looksLikePseudoToolText(text: string): boolean {
  const candidate = text.trim();
  if (!candidate.startsWith('{') || !candidate.endsWith('}')) return false;
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    return ['action', 'tool', 'function', 'functionName'].some((key) => typeof parsed[key] === 'string' && Boolean((parsed[key] as string).trim()));
  } catch {
    return false;
  }
}

function pseudoToolRepairs(task: AgentTaskState): number {
  return task.history.reduce((count, content) => count + content.parts.filter(
    (part) => typeof part.text === 'string' && part.text.includes(AGENT_TOOL_CALL_REPAIR_MARKER),
  ).length, 0);
}

function pseudoToolRepairContent(): AgentHistoryContent {
  return {
    role: 'user',
    parts: [{
      text: `${AGENT_TOOL_CALL_REPAIR_MARKER} La respuesta anterior describió una acción como JSON de texto, pero eso no ejecuta nada. Usa exclusivamente una de las funciones declaradas disponibles en este turno. No inventes nombres de herramientas y no respondas con JSON que simule una llamada.`,
    }],
  };
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

    let turn;
    try {
      turn = await input.requestModel({
        ...input.request,
        allowedTools: task.allowedTools,
        history: task.history,
        previousInteractionId: task.interactionId ?? input.request.previousInteractionId,
      }, input.signal);
    } catch (error) {
      if (input.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        task = { ...task, status: 'cancelled', finalText: 'Procesamiento cancelado. El trabajo completado se conservó.', updatedAt: now() };
      } else {
        const successfulResult = lastSuccessfulResult(task);
        const missingTools = missingRequiredTools(task);
        if (successfulResult && missingTools.length === 0) {
          task = {
            ...task,
            status: 'completed',
            finalText: successfulResult.message,
            error: undefined,
            updatedAt: now(),
          };
        } else if (successfulResult && missingTools.length > 0) {
          task = {
            ...task,
            status: 'failed',
            finalText: partialCompletionMessage(task, missingTools),
            error: 'INCOMPLETE_REQUIRED_ACTIONS',
            updatedAt: now(),
          };
        } else {
          task = { ...task, status: 'failed', finalText: '', error: providerFailureMessage(error), updatedAt: now() };
        }
      }
      break;
    }

    task.stepCount += 1;
    task.updatedAt = now();
    if (turn.interactionId) task.interactionId = turn.interactionId;
    if (turn.modelContent) task.history.push(turn.modelContent);

    if (!turn.calls.length) {
      const finalText = turn.text.trim();
      if (!finalText) {
        const successfulResult = lastSuccessfulResult(task);
        const missingTools = missingRequiredTools(task);
        if (successfulResult && missingTools.length === 0) {
          task.status = 'completed';
          delete task.error;
          task.finalText = successfulResult.message;
          break;
        }
        if (missingTools.length > 0) {
          const repairs = requiredActionRepairs(task);
          const repairBudget = Math.max(1, task.requiredTools?.length ?? 0);
          if (repairs < repairBudget) {
            task.history.push(requiredActionRepairContent(missingTools));
            task.allowedTools = continuationTools(task, missingTools);
            continue;
          }
          task.status = 'failed';
          task.error = 'INCOMPLETE_REQUIRED_ACTIONS';
          task.finalText = partialCompletionMessage(task, missingTools);
          break;
        }
        task.status = 'failed';
        task.error = 'EMPTY_MODEL_TURN';
        task.finalText = 'Atal IA no recibió una respuesta válida del modelo. No se aplicó ningún cambio; vuelve a intentarlo.';
        break;
      }
      const missingTools = missingRequiredTools(task);
      if (missingTools.length > 0) {
        const repairs = requiredActionRepairs(task);
        const repairBudget = Math.max(1, task.requiredTools?.length ?? 0);
        if (repairs < repairBudget) {
          task.history.push(requiredActionRepairContent(missingTools));
          task.allowedTools = continuationTools(task, missingTools);
          continue;
        }
        task.status = 'failed';
        task.error = 'INCOMPLETE_REQUIRED_ACTIONS';
        task.finalText = partialCompletionMessage(task, missingTools);
        break;
      }
      if (task.allowedTools.length > 0 && looksLikePseudoToolText(finalText) && pseudoToolRepairs(task) < MAX_PSEUDO_TOOL_REPAIRS) {
        task.history.push(pseudoToolRepairContent());
        continue;
      }
      if (task.allowedTools.length > 0 && looksLikePseudoToolText(finalText)) {
        task.status = 'failed';
        task.error = 'MALFORMED_TOOL_OUTPUT';
        task.finalText = 'Atal IA no recibió una llamada de herramienta válida. No se aplicó ningún cambio; vuelve a intentarlo.';
        break;
      }
      task.status = 'completed';
      task.finalText = finalText;
      break;
    }

    const responseParts: AgentHistoryContent['parts'] = [];
    for (const rawCall of turn.calls) {
      const membershipGroundedCall = groundPlanMembershipCall(task.goal, task.completed, rawCall);
      const call = groundReportReviewCall(task.completed, membershipGroundedCall, task.goal);
      if (!task.allowedTools.includes(call.tool)) {
        task.status = 'blocked';
        task.finalText = 'Esa acción no está disponible desde este contexto.';
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
      const priorRepairableFailures = repairableFailures(task);
      const step = { callId: call.id, invocation, result } satisfies AgentStepResult;
      task.completed.push(step);
      lastResults.push(step);

      if (isRepairableResult(result) && priorRepairableFailures < MAX_REPAIRABLE_FAILURES) {
        responseParts.push(...functionResponseContent(call, result).parts);
        continue;
      }

      if (isTerminalResult(result)) {
        task = terminalState(task, result, invocation, call);
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
  next.pendingCall = undefined;
  next.completed.push({ callId: call.id, invocation, result });
  next.history.push(functionResponseContent(call, result));
  next.status = result.status === 'success' ? 'running'
    : result.status === 'clarification' ? 'needs-clarification'
      : result.status === 'blocked' ? 'blocked' : 'failed';
  next.finalText = result.status === 'success' ? '' : result.status === 'error' ? visibleFailureMessage(result) : resultMessage(result);
  next.updatedAt = now();
  return next;
}
