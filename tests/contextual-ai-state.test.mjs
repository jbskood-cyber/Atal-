import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const stateMachine = () => loadCore('src/features/atal-ai/contextual/stateMachine.js');

const patientContext = {
  surface: 'patient',
  route: '/patients/p01?tab=summary#contact',
  patientId: 'p01',
  clinicalRecordId: 'record-p01',
  clinicalRecordVersion: 4,
  planId: 'pl01',
  exerciseId: '',
  sessionId: '',
  reportId: '',
  contextLabel: 'en este paciente',
  entityLabel: 'María López',
};

test('contextual workspace starts closed with no active context', () => {
  const { createContextualWorkspaceSession } = stateMachine();
  const session = createContextualWorkspaceSession();
  assert.equal(session.mode, 'closed');
  assert.equal(session.context, null);
  assert.equal(session.conversationId, '');
  assert.equal(session.draftId, '');
  assert.equal(session.pendingFingerprint, '');
});

test('opening captures exact context and restoration data without changing route data', () => {
  const { createContextualWorkspaceSession, openContextualWorkspace } = stateMachine();
  const session = openContextualWorkspace(createContextualWorkspaceSession(), {
    context: patientContext,
    conversationId: 'conversation-p01',
    draftId: 'draft-p01',
    pageScrollY: 684,
    triggerId: 'patient-contextual-ai-trigger',
  });
  assert.equal(session.mode, 'open');
  assert.deepEqual(session.context, patientContext);
  assert.equal(session.capturedRoute, patientContext.route);
  assert.equal(session.pageScrollY, 684);
  assert.equal(session.triggerId, 'patient-contextual-ai-trigger');
  assert.equal(session.conversationId, 'conversation-p01');
  assert.equal(session.draftId, 'draft-p01');
});

test('minimize and restore preserve transient pane draft section and internal scroll', () => {
  const {
    createContextualWorkspaceSession,
    openContextualWorkspace,
    minimizeContextualWorkspace,
    restoreContextualWorkspace,
    updateContextualWorkspaceView,
  } = stateMachine();
  let session = openContextualWorkspace(createContextualWorkspaceSession(), {
    context: patientContext,
    conversationId: 'conversation-p01',
    draftId: 'draft-p01',
    pageScrollY: 240,
    triggerId: 'patient-contextual-ai-trigger',
  });
  session = updateContextualWorkspaceView(session, {
    activePane: 'draft',
    expandedDraftSection: 'record',
    internalScroll: { conversation: 320, draft: 180 },
  });
  session = minimizeContextualWorkspace(session);
  assert.equal(session.mode, 'minimized');
  assert.equal(session.activePane, 'draft');
  assert.equal(session.expandedDraftSection, 'record');
  assert.deepEqual(session.internalScroll, { conversation: 320, draft: 180 });
  session = restoreContextualWorkspace(session);
  assert.equal(session.mode, 'open');
  assert.deepEqual(session.context, patientContext);
  assert.equal(session.conversationId, 'conversation-p01');
});

test('close clears transient shell while retaining persisted conversation identity', () => {
  const {
    createContextualWorkspaceSession,
    openContextualWorkspace,
    closeContextualWorkspace,
    bindPendingProposal,
  } = stateMachine();
  let session = openContextualWorkspace(createContextualWorkspaceSession(), {
    context: patientContext,
    conversationId: 'conversation-p01',
    draftId: 'draft-p01',
    pageScrollY: 120,
    triggerId: 'patient-contextual-ai-trigger',
  });
  session = bindPendingProposal(session, 'fingerprint-p01');
  const closed = closeContextualWorkspace(session);
  assert.equal(closed.mode, 'closed');
  assert.equal(closed.context, null);
  assert.equal(closed.pendingFingerprint, '');
  assert.equal(closed.conversationId, 'conversation-p01');
  assert.equal(closed.draftId, 'draft-p01');
  assert.equal(closed.pageScrollY, 120);
  assert.equal(closed.triggerId, 'patient-contextual-ai-trigger');
});

test('changing target context invalidates a pending proposal instead of retargeting it', () => {
  const {
    createContextualWorkspaceSession,
    openContextualWorkspace,
    bindPendingProposal,
    invalidateForContextChange,
  } = stateMachine();
  let session = openContextualWorkspace(createContextualWorkspaceSession(), {
    context: patientContext,
    conversationId: 'conversation-p01',
    draftId: 'draft-p01',
    pageScrollY: 0,
    triggerId: 'patient-contextual-ai-trigger',
  });
  session = bindPendingProposal(session, 'fingerprint-p01');
  const invalidated = invalidateForContextChange(session, { ...patientContext, patientId: 'p02', entityLabel: 'José QA' });
  assert.equal(invalidated.mode, 'minimized');
  assert.deepEqual(invalidated.context, patientContext);
  assert.equal(invalidated.pendingFingerprint, '');
  assert.equal(invalidated.contextMismatch, true);
});

test('invalid context cannot open a write-capable contextual workspace', () => {
  const { createContextualWorkspaceSession, openContextualWorkspace } = stateMachine();
  assert.throws(
    () => openContextualWorkspace(createContextualWorkspaceSession(), {
      context: { ...patientContext, patientId: '' },
      conversationId: 'conversation-invalid',
      draftId: 'draft-invalid',
      pageScrollY: 0,
      triggerId: 'patient-contextual-ai-trigger',
    }),
    /patient id/i,
  );
});
