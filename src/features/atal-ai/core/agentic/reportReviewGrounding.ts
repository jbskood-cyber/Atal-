import type { AgentFunctionCall, AgentStepResult } from './contracts';

export const LATEST_COMPLETED_SESSION_ID = '__atal_latest_completed_session__';

type RecordValue = Record<string, unknown>;

function recordValue(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined;
}

function canonicalSessionIds(completed: AgentStepResult[]): string[] {
  const ids: string[] = [];
  for (const step of completed) {
    if (!['app.read', 'session.summarize_recent'].includes(step.invocation.tool) || step.result.status !== 'success') continue;
    const data = recordValue(step.result.data);
    const sessions = data?.sessions;
    if (!Array.isArray(sessions)) continue;
    for (const candidate of sessions) {
      const session = recordValue(candidate);
      const id = typeof session?.id === 'string' ? session.id.trim() : '';
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

function asksForLatestCompletedSession(goal: string): boolean {
  const normalized = goal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
  return /\b(?:ultima|ultimo|mas reciente|reciente)\b.{0,48}\bsesion\b.{0,48}\bcompletad[ao]\b/.test(normalized)
    || /\bsesion\b.{0,48}\b(?:ultima|ultimo|mas reciente|reciente)\b.{0,48}\bcompletad[ao]\b/.test(normalized);
}

function rewriteSession(call: AgentFunctionCall, input: RecordValue, sessionId: string): AgentFunctionCall {
  return {
    ...call,
    input: {
      ...input,
      session: { type: 'session', id: sessionId },
    },
    references: [
      ...call.references.filter((reference) => reference.type !== 'session'),
      { type: 'session', id: sessionId },
    ],
  };
}

export function groundReportReviewCall(
  completed: AgentStepResult[],
  call: AgentFunctionCall,
  goal = '',
): AgentFunctionCall {
  if (call.tool !== 'report.review') return call;
  const input = recordValue(call.input);
  if (!input) return call;
  const session = recordValue(input.session);
  if (!session || session.type !== 'session') return call;

  const ids = canonicalSessionIds(completed);
  if (ids.length === 1) {
    const canonicalId = ids[0];
    return session.id === canonicalId ? call : rewriteSession(call, input, canonicalId);
  }

  if (asksForLatestCompletedSession(goal)) {
    return rewriteSession(call, input, LATEST_COMPLETED_SESSION_ID);
  }

  return call;
}
