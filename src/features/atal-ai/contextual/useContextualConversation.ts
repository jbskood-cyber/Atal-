'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAtalState, useAtalStore } from '@/src/data/atalStore';
import { confirmAndContinueAtalAgent, runAtalAgentRequest } from '../agent/agentController';
import { executeAtalClientEffect } from '../agent/executeClientEffect';
import { requestAtalAI } from '../api/geminiClient';
import type { AgentLoopOutcome } from '../core/agentic/contracts';
import { classifyAgentTurn, selectGeneralTurnMode } from '../core/agentic/generalTurnMode';
import type { ClientEffect, ConfirmationProof, PolicyDecision, ToolInvocation, UndoReceipt } from '../core/contracts';
import { executeLegacyAIAction, executionContext } from '../core/legacyAdapters';
import { executeUndo } from '../core/undoEngine';
import { getAIDraft, saveAIConversation, saveAIDraft } from '../data/aiRepository';
import type { AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest } from '../types';
import type { ContextualAIAction } from './actions';
import { workContextForContext } from './conversationAdapter';
import { readConversationById } from './repository';
import type { ContextualAIContext } from './types';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type PendingConfirmation = { decision: PolicyDecision; invocation: ToolInvocation };

type UseContextualConversationInput = {
  context: ContextualAIContext | null;
  conversationId: string;
  draftId: string;
  onProposalFingerprint: (fingerprint: string) => void;
  onDraftReady: () => void;
};

function createMessage(role: AIMessage['role'], text: string): AIMessage {
  return { id: uid('message'), role, text, createdAt: new Date().toISOString(), attachments: [] };
}

function buildExistingContext(conversation: AIConversation) {
  const state = getAtalState();
  const patient = state.patients.find((item) => item.id === conversation.workContext.selectedPatientId);
  const record = state.clinicalRecords.find((item) => item.patientId === patient?.id);
  const plan = state.plans.find((item) => item.id === conversation.workContext.selectedPlanId);
  const exercise = state.exercises.find((item) => item.id === conversation.workContext.selectedExerciseId);
  if (!patient && !exercise) return undefined;
  return {
    patient: patient ? { id: patient.id, name: patient.name, diagnosis: patient.diagnosis, age: patient.age, affectedArea: patient.affectedArea } : undefined,
    clinicalRecord: record ? {
      reasonForVisit: record.reasonForVisit,
      evolution: record.evolution,
      affectedArea: record.affectedArea,
      symptoms: record.symptoms,
      painLevel: record.painLevel,
      providedDiagnosis: record.providedDiagnosis,
      functionalLimitations: record.functionalLimitations,
      goals: record.goals,
      relevantHistory: record.relevantHistory,
      precautions: record.precautions,
      clinicalNotes: record.clinicalNotes,
    } : undefined,
    plan: plan ? {
      id: plan.id,
      title: plan.title,
      focus: plan.focus,
      duration: plan.duration,
      frequency: plan.frequency,
      goal: plan.goal,
      exerciseIds: plan.exerciseIds,
      status: plan.status,
      progression: plan.progression,
      reportCriteria: plan.reportCriteria,
      generalInstructions: plan.generalInstructions,
    } : undefined,
    exercise: exercise ? {
      id: exercise.id,
      name: exercise.name,
      region: exercise.region,
      category: exercise.category,
      objective: exercise.objective,
      sets: exercise.sets,
      repetitions: exercise.repetitions,
      time: exercise.time,
      status: exercise.status,
    } : undefined,
  };
}

function statusForDraft(draft: AtalAIDraft | null): AIConversation['status'] {
  return draft ? 'ready_for_review' : 'empty';
}

export function useContextualConversation({
  context,
  conversationId,
  draftId,
  onProposalFingerprint,
  onDraftReady,
}: UseContextualConversationInput) {
  const navigate = useNavigate();
  const initial = useMemo(() => conversationId ? readConversationById(conversationId) : null, [conversationId]);
  const [conversation, setConversation] = useState<AIConversation | null>(initial);
  const [draft, setDraft] = useState<AtalAIDraft | null>(() => draftId ? getAIDraft(draftId) : null);
  const [notice, setNotice] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [applying, setApplying] = useState(false);
  const [forceApply, setForceApply] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const store = useAtalStore((state) => state);

  useEffect(() => {
    const next = conversationId ? readConversationById(conversationId) : null;
    setConversation(next);
    setDraft(next ? getAIDraft(next.draftId) : null);
    setNotice('');
    setStreamingText('');
    setPendingConfirmation(null);
    setConfirmationOpen(next?.agentTask?.status === 'needs-confirmation');
    setForceApply(false);
  }, [conversationId]);

  useEffect(() => {
    if (conversation) saveAIConversation(conversation);
  }, [conversation]);

  useEffect(() => {
    if (draft) saveAIDraft(draft);
  }, [draft]);

  const patchConversation = useCallback((patch: Partial<AIConversation>) => {
    setConversation((current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
  }, []);

  const append = useCallback((message: AIMessage) => {
    setConversation((current) => current ? { ...current, messages: [...current.messages, message], updatedAt: new Date().toISOString() } : current);
  }, []);

  const currentVersions = useCallback(() => {
    if (!conversation) return { patientUpdatedAt: '', recordUpdatedAt: '', planUpdatedAt: '' };
    const state = getAtalState();
    const patient = state.patients.find((item) => item.id === conversation.workContext.selectedPatientId);
    const plan = state.plans.find((item) => item.id === conversation.workContext.selectedPlanId);
    const record = state.clinicalRecords.find((item) => item.patientId === conversation.workContext.selectedPatientId);
    return {
      patientUpdatedAt: patient?.updatedAt ?? '',
      recordUpdatedAt: record?.updatedAt ?? '',
      planUpdatedAt: plan?.updatedAt ?? '',
    };
  }, [conversation]);

  const handleCoreOutcome = useCallback((coreResult: ReturnType<typeof executeLegacyAIAction>, nextDraft?: AtalAIDraft) => {
    if (!conversation) return;
    if (coreResult.status === 'clarification') {
      append(createMessage('assistant', coreResult.clarification.message));
      patchConversation({ status: statusForDraft(draft) });
      return;
    }
    if (coreResult.status === 'confirmation-required') {
      if (nextDraft) setDraft(nextDraft);
      setPendingConfirmation(coreResult);
      setConfirmationOpen(true);
      onProposalFingerprint(coreResult.decision.fingerprint);
      patchConversation({ status: 'ready_for_review' });
      return;
    }
    if (coreResult.status === 'blocked' || coreResult.status === 'error') {
      setNotice(coreResult.message);
      patchConversation({ status: 'error', error: coreResult.message });
      return;
    }
    if (coreResult.status === 'success') {
      const data = (coreResult.data ?? {}) as { patientId?: string; planId?: string; clinicalRecordId?: string; exerciseId?: string };
      const result = {
        ...data,
        summary: coreResult.summary,
        undo: coreResult.undo,
        patientId: (data.patientId ?? nextDraft?.command?.patientId ?? conversation.workContext.selectedPatientId) || undefined,
        planId: (data.planId ?? nextDraft?.command?.planId ?? conversation.workContext.selectedPlanId) || undefined,
      };
      patchConversation({ status: 'saved', savedResult: result, error: undefined });
      append(createMessage('assistant', `Cambios aplicados. ${result.summary.join(' ')}`));
      setDraft(null);
      setPendingConfirmation(null);
      setConfirmationOpen(false);
      setForceApply(false);
    }
  }, [append, conversation, draft, onProposalFingerprint, patchConversation]);

  const handleReadOnlyOutcome = useCallback((coreResult: ReturnType<typeof executeLegacyAIAction>) => {
    if (coreResult.status !== 'success') {
      handleCoreOutcome(coreResult);
      return;
    }
    const text = coreResult.summary.join(' ').trim() || coreResult.message;
    setConversation((current) => current ? {
      ...current,
      status: statusForDraft(draft),
      savedResult: undefined,
      error: undefined,
      messages: [...current.messages, createMessage('assistant', text)],
      updatedAt: new Date().toISOString(),
    } : current);
  }, [draft, handleCoreOutcome]);

  const processDraft = useCallback(async (request: AtalAIAnalyzeRequest, userMessage: AIMessage) => {
    if (!conversation) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConversation((current) => current ? {
      ...current,
      messages: [...current.messages, userMessage],
      composerText: '',
      transcription: '',
      status: 'processing',
      error: undefined,
      updatedAt: new Date().toISOString(),
    } : current);
    setNotice('');
    try {
      const result = await requestAtalAI(request, controller.signal);
      if (!result.draft) throw new Error('Gemini no devolvió una respuesta estructurada.');
      const normalized = result.draft;
      const next = {
        ...normalized,
        baseVersions: normalized.baseVersions.planUpdatedAt || normalized.baseVersions.patientUpdatedAt || normalized.baseVersions.recordUpdatedAt
          ? normalized.baseVersions
          : currentVersions(),
      };
      if (next.responseMode === 'query' && next.command) {
        const coreResult = executeLegacyAIAction({
          command: next.command,
          workContext: conversation.workContext,
          metadata: { conversationId: conversation.id, draftId: next.id },
        });
        handleReadOnlyOutcome(coreResult);
      } else {
        setDraft(next);
        saveAIDraft(next);
        setConversation((current) => current ? {
          ...current,
          status: next.missingFields.length || next.uncertainFields.length ? 'needs_information' : 'ready_for_review',
          composerText: '',
          transcription: '',
          messages: [...current.messages, createMessage('assistant', next.assistantMessage || next.followUpQuestion || 'Preparé el borrador. Puedes revisarlo antes de aplicar cambios.')],
          updatedAt: new Date().toISOString(),
        } : current);
        onDraftReady();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        patchConversation({ status: statusForDraft(draft) });
        setNotice('Procesamiento cancelado.');
      } else {
        const message = error instanceof Error ? error.message : 'No pudimos procesar la solicitud.';
        patchConversation({ status: 'error', error: message });
        setNotice(message);
      }
    } finally {
      abortRef.current = null;
    }
  }, [conversation, currentVersions, draft, handleReadOnlyOutcome, onDraftReady, patchConversation]);

  const applyAgentOutcome = useCallback(async (outcome: AgentLoopOutcome, userMessage?: AIMessage) => {
    if (!conversation) return;
    const effectMessages: string[] = [];
    for (const step of outcome.lastResults) {
      if (step.result.status !== 'success' || !step.result.clientEffect) continue;
      const effect = await executeAtalClientEffect(step.result.clientEffect, {
        navigate,
        conversationId: conversation.id,
        draftId: conversation.draftId,
      });
      effectMessages.push(effect.message);
    }
    const successful = outcome.lastResults.filter((step) => step.result.status === 'success');
    const mutation = successful.findLast((step) => step.result.status === 'success' && (step.result.affected.length > 0 || step.result.undo));
    const mutationResult = mutation?.result.status === 'success' ? mutation.result : undefined;
    const data = mutationResult?.data && typeof mutationResult.data === 'object' ? mutationResult.data as Record<string, unknown> : {};
    const finalText = [outcome.task.finalText, ...effectMessages].filter(Boolean).join(' ');
    setConversation((current) => current ? {
      ...current,
      messages: [
        ...current.messages,
        ...(userMessage ? [userMessage] : []),
        ...(finalText ? [createMessage('assistant', finalText)] : []),
      ],
      agentTask: outcome.task,
      status: outcome.task.status === 'needs-confirmation'
        ? 'ready_for_review'
        : outcome.task.status === 'failed' || outcome.task.status === 'blocked'
          ? 'error'
          : mutationResult ? 'saved' : statusForDraft(draft),
      composerText: '',
      transcription: '',
      error: outcome.task.error,
      savedResult: mutationResult ? {
        patientId: typeof data.patientId === 'string' ? data.patientId : undefined,
        planId: typeof data.planId === 'string' ? data.planId : undefined,
        clinicalRecordId: typeof data.clinicalRecordId === 'string' ? data.clinicalRecordId : undefined,
        exerciseId: typeof data.exerciseId === 'string' ? data.exerciseId : undefined,
        summary: mutationResult.summary,
        undo: mutationResult.undo,
      } : current.savedResult,
      updatedAt: new Date().toISOString(),
    } : current);
    if (mutationResult && draft) setDraft(null);
    if (outcome.task.status === 'needs-confirmation') {
      const pendingStep = outcome.task.completed.findLast((step) => step.result.status === 'confirmation-required');
      if (pendingStep?.result.status === 'confirmation-required') onProposalFingerprint(pendingStep.result.decision.fingerprint);
      setConfirmationOpen(true);
    } else {
      setConfirmationOpen(false);
    }
  }, [conversation, draft, navigate, onProposalFingerprint]);

  const processAgent = useCallback(async (text: string, userMessage: AIMessage) => {
    if (!conversation || !context) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingText('');
    setNotice('');
    patchConversation({ status: 'processing', composerText: '', transcription: '', error: undefined });
    try {
      const outcome = await runAtalAgentRequest({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text,
        route: context.route,
        workContext: conversation.workContext,
        attachments: [],
        messages: conversation.messages,
        task: conversation.agentTask,
        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,
        assistantScope: 'contextual',
        contextSurface: context.surface,
        selectedSessionId: context.sessionId,
        signal: controller.signal,
        onTextDelta: (delta) => setStreamingText((current) => current + delta),
      });
      await applyAgentOutcome(outcome, userMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Atal IA no pudo continuar la tarea.';
      setConversation((current) => current ? {
        ...current,
        messages: [...current.messages, userMessage, createMessage('assistant', message)],
        status: 'error',
        error: message,
        updatedAt: new Date().toISOString(),
      } : current);
    } finally {
      setStreamingText('');
      abortRef.current = null;
    }
  }, [applyAgentOutcome, context, conversation, patchConversation]);

  const setText = useCallback((composerText: string) => {
    patchConversation({ composerText, status: composerText ? 'composing' : statusForDraft(draft) });
  }, [draft, patchConversation]);

  const prepareAction = useCallback((action: ContextualAIAction) => {
    if (!conversation || !context) return;
    patchConversation({
      workContext: workContextForContext(context, action.intent),
      composerText: action.prompt,
      status: 'composing',
      savedResult: undefined,
      error: undefined,
    });
  }, [context, conversation, patchConversation]);

  const send = useCallback(() => {
    if (!conversation || !context) return;
    const text = conversation.composerText.trim();
    if (!text) return;
    const userMessage = createMessage('user', text);
    const classification = classifyAgentTurn(text);
    const useDraft = classification.kind === 'proposal'
      || selectGeneralTurnMode({ text, hasDraft: Boolean(draft), draftModeArmed: false, hasImageOrPdf: false }) === 'draft';
    if (!useDraft) {
      void processAgent(text, userMessage);
      return;
    }
    if (conversation.workContext.patientMode === 'existing' && !conversation.workContext.selectedPatientId) {
      setNotice('Selecciona el paciente antes de continuar.');
      return;
    }
    if (['update_existing_plan', 'update_plan_status', 'archive_plan', 'restore_plan', 'replace_active_plan'].includes(conversation.workContext.intent) && !conversation.workContext.selectedPlanId) {
      setNotice('Selecciona el plan antes de continuar.');
      return;
    }
    if (conversation.workContext.intent === 'update_existing_exercise' && !conversation.workContext.selectedExerciseId) {
      setNotice('Selecciona el ejercicio antes de continuar.');
      return;
    }
    void processDraft({
      mode: 'analyze',
      draftId: conversation.draftId,
      text,
      attachments: [],
      currentDraft: draft,
      workContext: conversation.workContext,
      existingContext: buildExistingContext(conversation),
    }, userMessage);
  }, [context, conversation, draft, processAgent, processDraft]);

  const performApply = useCallback(async (confirmation?: ConfirmationProof) => {
    if (!conversation || !draft) return;
    setApplying(true);
    try {
      const coreResult = executeLegacyAIAction({
        draft: draft.responseMode === 'command' ? undefined : draft,
        command: draft.responseMode === 'command' ? draft.command ?? undefined : undefined,
        privateContact: conversation.privateContact,
        workContext: conversation.workContext,
        metadata: { conversationId: conversation.id, draftId: draft.id, force: forceApply },
        confirmation,
      });
      handleCoreOutcome(coreResult, draft);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No pudimos aplicar los cambios.');
    } finally {
      setApplying(false);
    }
  }, [conversation, draft, forceApply, handleCoreOutcome]);

  const apply = useCallback(() => { void performApply(); }, [performApply]);

  const confirmAgent = useCallback(async () => {
    if (!conversation || !context || conversation.agentTask?.status !== 'needs-confirmation') return;
    const task = conversation.agentTask;
    const pendingStep = task.completed.findLast((step) => step.result.status === 'confirmation-required');
    if (!pendingStep || pendingStep.result.status !== 'confirmation-required') return;
    const mode = pendingStep.result.decision.mode;
    if (mode !== 'review' && mode !== 'explicit' && mode !== 'reinforced') return;
    const now = new Date();
    setApplying(true);
    setStreamingText('');
    try {
      const outcome = await confirmAndContinueAtalAgent({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text: '',
        route: context.route,
        workContext: conversation.workContext,
        attachments: [],
        messages: conversation.messages,
        task,
        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,
        assistantScope: 'contextual',
        contextSurface: context.surface,
        selectedSessionId: context.sessionId,
        onTextDelta: (delta) => setStreamingText((current) => current + delta),
        confirmation: {
          id: uid('confirmation'),
          fingerprint: pendingStep.result.decision.fingerprint,
          mode,
          confirmedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
        },
      });
      await applyAgentOutcome(outcome);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No pudimos continuar la acción confirmada.');
    } finally {
      setStreamingText('');
      setApplying(false);
    }
  }, [applyAgentOutcome, context, conversation]);

  const confirmExecution = useCallback(() => {
    if (conversation?.agentTask?.status === 'needs-confirmation') {
      void confirmAgent();
      return;
    }
    if (!pendingConfirmation) return;
    const mode = pendingConfirmation.decision.mode;
    if (mode !== 'review' && mode !== 'explicit' && mode !== 'reinforced') {
      setNotice('Esta acción no puede confirmarse.');
      return;
    }
    const now = new Date().toISOString();
    void performApply({
      id: uid('confirmation'),
      fingerprint: pendingConfirmation.decision.fingerprint,
      mode,
      confirmedAt: now,
      expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
    });
  }, [confirmAgent, conversation?.agentTask?.status, pendingConfirmation, performApply]);

  const cancelConfirmation = useCallback(() => {
    if (conversation?.agentTask?.status === 'needs-confirmation') {
      const task = {
        ...conversation.agentTask,
        status: 'cancelled' as const,
        pendingInvocation: undefined,
        pendingCall: undefined,
        finalText: 'Acción cancelada. Los pasos seguros ya completados se conservaron.',
        updatedAt: new Date().toISOString(),
      };
      patchConversation({
        agentTask: task,
        status: statusForDraft(draft),
        messages: [...conversation.messages, createMessage('assistant', task.finalText)],
      });
    }
    setPendingConfirmation(null);
    setConfirmationOpen(false);
  }, [conversation, draft, patchConversation]);

  const undo = useCallback(() => {
    if (!conversation?.savedResult?.undo) return;
    const receipt = conversation.savedResult.undo;
    if (!('patches' in receipt)) {
      setNotice('Este cambio pertenece a una versión anterior y ya no puede deshacerse de forma segura.');
      return;
    }
    try {
      executeUndo(receipt as UndoReceipt, executionContext(conversation.workContext, { conversationId: conversation.id, draftId: conversation.draftId }));
      patchConversation({ savedResult: { ...conversation.savedResult, undo: undefined } });
      append(createMessage('assistant', 'Cambio deshecho correctamente.'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No fue posible deshacer.');
    }
  }, [append, conversation, patchConversation]);

  const conflict = useMemo(() => {
    if (!draft || forceApply) return '';
    const current = currentVersions();
    if (draft.baseVersions.planUpdatedAt && current.planUpdatedAt !== draft.baseVersions.planUpdatedAt) return 'El plan seleccionado tiene una versión más reciente.';
    if (draft.baseVersions.recordUpdatedAt && current.recordUpdatedAt !== draft.baseVersions.recordUpdatedAt) return 'El expediente seleccionado tiene una versión más reciente.';
    if (draft.baseVersions.patientUpdatedAt && current.patientUpdatedAt !== draft.baseVersions.patientUpdatedAt) return 'El paciente seleccionado tiene cambios más recientes.';
    return '';
  }, [currentVersions, draft, forceApply, store.updatedAt]);

  const refreshConflict = useCallback(() => {
    if (!draft) return;
    const state = getAtalState();
    const patient = state.patients.find((item) => item.id === draft.selectedPatientId);
    const record = state.clinicalRecords.find((item) => item.patientId === draft.selectedPatientId);
    const plan = state.plans.find((item) => item.id === draft.selectedPlanId);
    setDraft({
      ...draft,
      patient: {
        ...draft.patient,
        name: patient?.name ?? draft.patient.name,
        age: patient?.age ?? draft.patient.age,
        reasonForVisit: record?.reasonForVisit ?? draft.patient.reasonForVisit,
        evolutionTime: record?.evolution ?? draft.patient.evolutionTime,
        providedDiagnosis: record?.providedDiagnosis ?? draft.patient.providedDiagnosis,
        clinicalNotes: record?.clinicalNotes ?? draft.patient.clinicalNotes,
      },
      plan: {
        ...draft.plan,
        title: plan?.title ?? draft.plan.title,
        goal: plan?.goal ?? draft.plan.goal,
        focus: plan?.focus ?? draft.plan.focus,
        generalInstructions: plan?.generalInstructions ?? draft.plan.generalInstructions,
      },
      baseVersions: currentVersions(),
      updatedAt: new Date().toISOString(),
    });
    setForceApply(false);
  }, [currentVersions, draft]);

  const updateDraft = useCallback((next: AtalAIDraft) => {
    setDraft(next);
    patchConversation({ status: 'ready_for_review', savedResult: undefined });
  }, [patchConversation]);

  const patientLabel = conversation?.workContext.patientMode === 'existing'
    ? store.patients.find((item) => item.id === conversation.workContext.selectedPatientId)?.name ?? context?.entityLabel ?? 'Paciente existente'
    : draft?.patient.name || context?.entityLabel || 'Paciente';

  return {
    conversation,
    draft,
    notice,
    streamingText,
    applying,
    confirmationOpen,
    conflict,
    patientLabel,
    setText,
    prepareAction,
    send,
    apply,
    confirmExecution,
    cancelConfirmation,
    undo,
    refreshConflict,
    keepVersion: () => setForceApply(true),
    updateDraft,
    cancelProcessing: () => abortRef.current?.abort(),
    clearNotice: () => setNotice(''),
  };
}
