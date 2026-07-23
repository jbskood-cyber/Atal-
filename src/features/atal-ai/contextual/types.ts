export type ContextualAISurface = 'patient' | 'clinical-record' | 'plan' | 'exercise' | 'report';

export type ContextualAIContext = {
  surface: ContextualAISurface;
  route: string;
  patientId: string;
  clinicalRecordId: string;
  clinicalRecordVersion: number | null;
  planId: string;
  exerciseId: string;
  sessionId: string;
  reportId: string;
  contextLabel: string;
  entityLabel: string;
};

export type ContextualWorkspaceMode = 'closed' | 'open' | 'minimized';
export type ContextualWorkspacePane = 'conversation' | 'draft';

export type ContextualWorkspaceSession = {
  mode: ContextualWorkspaceMode;
  context: ContextualAIContext | null;
  conversationId: string;
  draftId: string;
  activePane: ContextualWorkspacePane;
  expandedDraftSection: string;
  internalScroll: {
    conversation: number;
    draft: number;
  };
  capturedRoute: string;
  pageScrollY: number;
  triggerId: string;
  pendingFingerprint: string;
  contextMismatch: boolean;
};

export type ContextualWorkspaceOpenInput = {
  context: ContextualAIContext;
  conversationId: string;
  draftId: string;
  pageScrollY: number;
  triggerId: string;
};

export type ContextualWorkspaceViewPatch = Partial<Pick<
  ContextualWorkspaceSession,
  'activePane' | 'expandedDraftSection' | 'internalScroll'
>>;
