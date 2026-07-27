import type { AgentFunctionCall, AgentStepResult } from './contracts';

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

export function groundReportReviewCall(
  completed: AgentStepResult[],
  call: AgentFunctionCall,
): AgentFunctionCall {
  if (call.tool !== 'report.review') return call;
  const input = recordValue(call.input);
  if (!input) return call;
  const session = recordValue(input.session);
  if (!session || session.type !== 'session') return call;

  const ids = canonicalSessionIds(completed);
  if (ids.length !== 1) return call;
  const canonicalId = ids[0];
  if (session.id === canonicalId) return call;

  return {
    ...call,
    input: {
      ...input,
      session: { type: 'session', id: canonicalId },
    },
    references: [
      ...call.references.filter((reference) => reference.type !== 'session'),
      { type: 'session', id: canonicalId },
    ],
  };
}
