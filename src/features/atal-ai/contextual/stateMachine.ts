import type {
  ContextualAIContext,
  ContextualWorkspaceOpenInput,
  ContextualWorkspaceSession,
  ContextualWorkspaceViewPatch,
} from './types';

function validateContext(context: ContextualAIContext) {
  if (!context.route.trim()) throw new Error('Context route is required.');
  if (!context.contextLabel.trim()) throw new Error('Context label is required.');
  if (!context.entityLabel.trim()) throw new Error('Context entity label is required.');
  if (context.surface !== 'exercise' && !context.patientId.trim()) {
    throw new Error('Patient ID is required for this contextual surface.');
  }
  if (context.surface === 'plan' && !context.planId.trim()) throw new Error('Plan ID is required.');
  if (context.surface === 'exercise' && !context.exerciseId.trim()) throw new Error('Exercise ID is required.');
  if (context.surface === 'report' && !context.reportId.trim() && !context.sessionId.trim()) {
    throw new Error('Report or session ID is required.');
  }
}

export function contextualAIContextKey(context: ContextualAIContext) {
  return [
    context.surface,
    context.patientId,
    context.clinicalRecordId,
    context.planId,
    context.exerciseId,
    context.sessionId,
    context.reportId,
  ].join(':');
}

export function createContextualWorkspaceSession(): ContextualWorkspaceSession {
  return {
    mode: 'closed',
    context: null,
    conversationId: '',
    draftId: '',
    activePane: 'conversation',
    expandedDraftSection: '',
    internalScroll: { conversation: 0, draft: 0 },
    capturedRoute: '',
    pageScrollY: 0,
    triggerId: '',
    pendingFingerprint: '',
    contextMismatch: false,
  };
}

export function openContextualWorkspace(
  session: ContextualWorkspaceSession,
  input: ContextualWorkspaceOpenInput,
): ContextualWorkspaceSession {
  validateContext(input.context);
  if (!input.conversationId.trim()) throw new Error('Conversation ID is required.');
  if (!input.draftId.trim()) throw new Error('Draft ID is required.');
  return {
    ...session,
    mode: 'open',
    context: structuredClone(input.context),
    conversationId: input.conversationId,
    draftId: input.draftId,
    capturedRoute: input.context.route,
    pageScrollY: Math.max(0, input.pageScrollY),
    triggerId: input.triggerId,
    contextMismatch: false,
  };
}

export function updateContextualWorkspaceView(
  session: ContextualWorkspaceSession,
  patch: ContextualWorkspaceViewPatch,
): ContextualWorkspaceSession {
  return {
    ...session,
    ...patch,
    internalScroll: patch.internalScroll
      ? { ...patch.internalScroll }
      : { ...session.internalScroll },
  };
}

export function minimizeContextualWorkspace(session: ContextualWorkspaceSession): ContextualWorkspaceSession {
  if (!session.context) return session;
  return { ...session, mode: 'minimized' };
}

export function restoreContextualWorkspace(session: ContextualWorkspaceSession): ContextualWorkspaceSession {
  if (!session.context) return session;
  return { ...session, mode: 'open' };
}

export function closeContextualWorkspace(session: ContextualWorkspaceSession): ContextualWorkspaceSession {
  return {
    ...session,
    mode: 'closed',
    context: null,
    activePane: 'conversation',
    expandedDraftSection: '',
    internalScroll: { conversation: 0, draft: 0 },
    pendingFingerprint: '',
    contextMismatch: false,
  };
}

export function bindPendingProposal(
  session: ContextualWorkspaceSession,
  fingerprint: string,
): ContextualWorkspaceSession {
  return { ...session, pendingFingerprint: fingerprint, contextMismatch: false };
}

export function invalidateForContextChange(
  session: ContextualWorkspaceSession,
  nextContext: ContextualAIContext,
): ContextualWorkspaceSession {
  if (!session.context || contextualAIContextKey(session.context) === contextualAIContextKey(nextContext)) {
    return session;
  }
  if (!session.pendingFingerprint) {
    return { ...session, mode: 'minimized', contextMismatch: true };
  }
  return {
    ...session,
    mode: 'minimized',
    pendingFingerprint: '',
    contextMismatch: true,
  };
}
