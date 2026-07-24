import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { getAtalState, useAtalStore } from '@/src/data/atalStore';
import { requestAtalAI } from './api/geminiClient';
import { confirmAndContinueAtalAgent, runAtalAgentRequest } from './agent/agentController';
import { executeAtalClientEffect } from './agent/executeClientEffect';
import { clearAIWorkspace, createAIConversation, getAIDraft, getLatestAIConversation, readGlobalAIConversations, saveAIConversation, saveAIDraft } from './data/aiRepository';
import { deleteAIArtifact, deleteAIConversationArtifacts, restoreAIArtifactPayloads, saveAIArtifact, updateAIArtifact } from './data/aiArtifactRepository';
import type { AgentLoopOutcome } from './core/agentic/contracts';
import { classifyAgentTurn, selectGeneralTurnMode } from './core/agentic/generalTurnMode';
import type { ConfirmationProof, PolicyDecision, ToolInvocation, UndoReceipt } from './core/contracts';
import { executeLegacyAIAction, executionContext as legacyExecutionContext } from './core/legacyAdapters';
import { executeUndo } from './core/undoEngine';
import { AIComposer } from './components/AIComposer';
import { AIContextBar, formatWorkContextLabel } from './components/AIContextBar';
import { AtalAIHeader } from './components/AtalAIHeader';
import { AttachmentMenu } from './components/AttachmentMenu';
import { AttachmentPreview } from './components/AttachmentPreview';
import { AudioRecorder } from './components/AudioRecorder';
import { ConversationalDraftCard } from './components/ConversationalDraftCard';
import { AssistantMessageContent } from './components/AssistantMessageContent';
import { SuggestionBar } from './components/SuggestionBar';
import type { AIAttachmentPayload, AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest, AIWorkContext } from './types';

const MAX_FILES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const NOTICE_VISIBLE_MS = 4_200;
const NOTICE_EXIT_MS = 220;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const fileData = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
  reader.readAsDataURL(file);
});

const attachmentKind = (file: File): AIAttachmentPayload['kind'] => file.type === 'application/pdf'
  ? 'pdf'
  : file.type.startsWith('audio/') ? 'audio' : 'image';

function createMessage(role: AIMessage['role'], text: string, attachments: AIAttachmentPayload[] = []): AIMessage {
  return {
    id: uid('message'),
    role,
    text,
    createdAt: new Date().toISOString(),
    attachments: attachments.map(({ data: _data, ...meta }) => ({ ...meta, available: true })),
  };
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

function statusAfterConversation(draft: AtalAIDraft | null): AIConversation['status'] {
  return draft ? 'ready_for_review' : 'empty';
}

export function AtalAIGeneralScreen() {
  const navigate = useNavigate();
  const store = useAtalStore((state) => state);
  const initial = useRef(getLatestAIConversation() ?? createAIConversation('global'));
  const [conversation, setConversation] = useState<AIConversation>(initial.current);
  const [draft, setDraft] = useState<AtalAIDraft | null>(() => getAIDraft(initial.current.draftId));
  const [attachments, setAttachments] = useState<AIAttachmentPayload[]>([]);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dialog, setDialog] = useState<'discard' | 'restart' | 'legacy-confirmation' | 'agent-confirmation' | null>(null);
  const [legacyConfirmation, setLegacyConfirmation] = useState<{ decision: PolicyDecision; invocation: ToolInvocation } | null>(null);
  const [draftModeArmed, setDraftModeArmed] = useState(false);
  const [notice, setNotice] = useState(initial.current.messages.length ? 'Conversación general recuperada.' : '');
  const [noticeLeaving, setNoticeLeaving] = useState(false);
  const [retryPayload, setRetryPayload] = useState<{ request: AtalAIAnalyzeRequest; messageId?: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [forceApply, setForceApply] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [collisionDismissed, setCollisionDismissed] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const contextLabel = useMemo(
    () => formatWorkContextLabel(conversation.workContext, store.patients, store.plans, store.exercises),
    [conversation.workContext, store.patients, store.plans, store.exercises],
  );

  const persist = useCallback((next: AIConversation) => {
    const value = { ...next, updatedAt: new Date().toISOString() };
    setConversation(value);
    saveAIConversation(value);
    return value;
  }, []);

  const patchConversation = useCallback((patch: Partial<AIConversation>) => {
    setConversation((current) => {
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      saveAIConversation(next);
      return next;
    });
  }, []);

  const append = useCallback((item: AIMessage) => {
    setConversation((current) => {
      const next = { ...current, messages: [...current.messages, item], updatedAt: new Date().toISOString() };
      saveAIConversation(next);
      return next;
    });
  }, []);

  useEffect(() => {
    restoreAIArtifactPayloads(conversation.attachmentMetadata)
      .then(setAttachments)
      .catch(() => setNotice('Algunos archivos anteriores ya no están disponibles en este dispositivo.'));
  }, [conversation.id]);

  useEffect(() => {
    const metadata = attachments.map(({ data: _data, ...meta }) => ({ ...meta, available: true }));
    if (JSON.stringify(metadata) === JSON.stringify(conversation.attachmentMetadata)) return;
    patchConversation({ attachmentMetadata: metadata });
  }, [attachments, conversation.attachmentMetadata, patchConversation]);

  useEffect(() => {
    if (draft) saveAIDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (conversation.agentTask?.status === 'needs-confirmation') setDialog('agent-confirmation');
  }, [conversation.id, conversation.agentTask?.status]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation.messages.length, conversation.status, draft?.updatedAt]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      document.documentElement.style.setProperty('--atal-visual-height', `${viewport.height}px`);
      document.documentElement.classList.toggle('atal-keyboard-open', window.innerHeight - viewport.height > 120);
    };
    sync();
    viewport.addEventListener('resize', sync);
    return () => {
      viewport.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--atal-visual-height');
      document.documentElement.classList.remove('atal-keyboard-open');
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      setNoticeLeaving(false);
      return;
    }
    setNoticeLeaving(false);
    let clearTimer: number | undefined;
    const exitTimer = window.setTimeout(() => {
      setNoticeLeaving(true);
      clearTimer = window.setTimeout(() => {
        setNotice('');
        setNoticeLeaving(false);
      }, NOTICE_EXIT_MS);
    }, NOTICE_VISIBLE_MS);
    return () => {
      window.clearTimeout(exitTimer);
      if (clearTimer !== undefined) window.clearTimeout(clearTimer);
    };
  }, [notice]);

  const setText = (composerText: string) => patchConversation({
    composerText,
    status: composerText || attachments.length ? 'composing' : statusAfterConversation(draft),
  });

  const addPayload = async (file: File) => {
    const payload: AIAttachmentPayload = {
      id: uid('attachment'),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      kind: attachmentKind(file),
      available: true,
      data: await fileData(file),
    };
    await saveAIArtifact(conversation.id, payload);
    return payload;
  };

  const addFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (attachments.length + incoming.length > MAX_FILES) {
      setNotice(`Puedes combinar hasta ${MAX_FILES} archivos.`);
      return;
    }
    try {
      const converted: AIAttachmentPayload[] = [];
      for (const file of incoming) {
        if (!allowedTypes.has(file.type) && !file.type.startsWith('audio/')) throw new Error(`${file.name}: formato no compatible.`);
        if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: supera 8 MB.`);
        converted.push(await addPayload(file));
      }
      setAttachments((current) => [...current, ...converted]);
      setNotice('');
      patchConversation({ status: 'composing' });
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No pudimos adjuntar el archivo.');
    }
  };

  const removeAttachment = async (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
    await deleteAIArtifact(id).catch(() => undefined);
  };

  const addAudio = async (file: File) => {
    try {
      const item = await addPayload(file);
      setAttachments((current) => [...current.filter((entry) => entry.kind !== 'audio'), item]);
      setNotice('Audio listo. Transcríbelo para revisarlo.');
      setAudioOpen(false);
    } catch {
      setNotice('No pudimos preparar el audio.');
    }
  };

  const currentVersions = useCallback(() => {
    const state = getAtalState();
    const patient = state.patients.find((item) => item.id === conversation.workContext.selectedPatientId);
    const plan = state.plans.find((item) => item.id === conversation.workContext.selectedPlanId);
    const record = state.clinicalRecords.find((item) => item.patientId === conversation.workContext.selectedPatientId);
    return {
      patientUpdatedAt: patient?.updatedAt ?? '',
      planUpdatedAt: plan?.updatedAt ?? '',
      recordUpdatedAt: record?.updatedAt ?? '',
    };
  }, [conversation.workContext]);

  const runDraftRequest = async (request: AtalAIAnalyzeRequest, userMessage?: AIMessage) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRetryPayload({ request, messageId: userMessage?.id });
    setProcessing(true);
    setConversation((current) => ({
      ...current,
      messages: userMessage ? [...current.messages, userMessage] : current.messages,
      composerText: '',
      transcription: '',
      status: 'processing',
      error: undefined,
      updatedAt: new Date().toISOString(),
    }));
    setNotice('');
    try {
      const result = await requestAtalAI(request, controller.signal);
      if (!result.draft) throw new Error('Gemini no devolvió una respuesta estructurada.');
      const nextDraft = {
        ...result.draft,
        baseVersions: result.draft.baseVersions.planUpdatedAt || result.draft.baseVersions.patientUpdatedAt
          ? result.draft.baseVersions
          : currentVersions(),
      };
      if (nextDraft.responseMode === 'query' && nextDraft.command) {
        const coreResult = executeLegacyAIAction({
          command: nextDraft.command,
          workContext: conversation.workContext,
          metadata: { conversationId: conversation.id, draftId: nextDraft.id },
        });
        if (coreResult.status === 'success') {
          append(createMessage('assistant', coreResult.message));
          patchConversation({ status: statusAfterConversation(draft) });
        } else if (coreResult.status === 'clarification') {
          append(createMessage('assistant', coreResult.clarification.message));
          patchConversation({ status: statusAfterConversation(draft) });
        } else if (coreResult.status === 'confirmation-required') {
          setDraft(nextDraft);
          setLegacyConfirmation(coreResult);
          setDialog('legacy-confirmation');
          patchConversation({ status: 'ready_for_review' });
        } else {
          patchConversation({ status: 'error', error: coreResult.message });
        }
      } else {
        setDraft(nextDraft);
        saveAIDraft(nextDraft);
        setDraftModeArmed(false);
        setConversation((current) => {
          const next = {
            ...current,
            status: nextDraft.missingFields.length || nextDraft.uncertainFields.length ? 'needs_information' as const : 'ready_for_review' as const,
            composerText: '',
            transcription: '',
            attachmentMetadata: [],
            messages: [...current.messages, createMessage('assistant', nextDraft.assistantMessage || nextDraft.followUpQuestion || 'Preparé el borrador. Puedes revisarlo aquí antes de aplicar cambios.')],
            updatedAt: new Date().toISOString(),
          };
          saveAIConversation(next);
          return next;
        });
      }
      setAttachments([]);
      setAudioOpen(false);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        patchConversation({ status: statusAfterConversation(draft) });
        setNotice('Procesamiento cancelado. Tu mensaje se conservó.');
      } else {
        patchConversation({ status: 'error', error: cause instanceof Error ? cause.message : 'No pudimos procesar la solicitud.' });
      }
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  };

  const applyAgentOutcome = async (outcome: AgentLoopOutcome, userMessage?: AIMessage) => {
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
    setConversation((current) => {
      const next: AIConversation = {
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
            : mutationResult ? 'saved' : statusAfterConversation(draft),
        composerText: '',
        transcription: '',
        attachmentMetadata: [],
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
      };
      saveAIConversation(next);
      return next;
    });
    setAttachments([]);
    if (outcome.task.status === 'needs-confirmation') {
      setDialog('agent-confirmation');
      setNotice(outcome.task.pendingInvocation?.authorization === 'file-derived'
        ? 'Revisa la propuesta extraída del archivo antes de guardarla.'
        : 'Atal IA completó lo seguro y espera tu confirmación para continuar.');
    }
  };

  const runAgentRequest = async (prompt: string, userMessage: AIMessage) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    setStreamingText('');
    setNotice('');
    patchConversation({ status: 'processing', composerText: '', transcription: '', error: undefined });
    try {
      const outcome = await runAtalAgentRequest({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text: prompt,
        route: window.location.pathname,
        workContext: conversation.workContext,
        attachments,
        messages: conversation.messages,
        task: conversation.agentTask,
        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,
        signal: controller.signal,
        onTextDelta: (delta) => setStreamingText((current) => current + delta),
      });
      await applyAgentOutcome(outcome, userMessage);
      setStreamingText('');
    } catch (cause) {
      setStreamingText('');
      const text = cause instanceof Error ? cause.message : 'Atal IA no pudo continuar la tarea.';
      setConversation((current) => {
        const next = {
          ...current,
          messages: [...current.messages, userMessage, createMessage('assistant', text)],
          status: 'error' as const,
          error: text,
          updatedAt: new Date().toISOString(),
        };
        saveAIConversation(next);
        return next;
      });
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  };

  const send = () => {
    const text = conversation.composerText.trim();
    const transcription = conversation.transcription.trim();
    if ((!text && !transcription && !attachments.length) || processing) return;
    const prompt = [text, transcription && `Transcripción: ${transcription}`].filter(Boolean).join('\n\n') || 'Describe los archivos adjuntos y responde a mi solicitud.';
    const userMessage = createMessage('user', prompt, attachments);
    const classification = classifyAgentTurn(prompt);
    const mode = classification.kind === 'proposal' ? 'draft' : selectGeneralTurnMode({
      text: prompt,
      hasDraft: Boolean(draft),
      draftModeArmed,
      hasImageOrPdf: attachments.some((item) => item.kind === 'image' || item.kind === 'pdf'),
    });
    if (mode === 'agent') {
      void runAgentRequest(prompt, userMessage);
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
    void runDraftRequest({
      mode: 'analyze',
      draftId: conversation.draftId,
      text,
      transcription,
      attachments,
      currentDraft: draft,
      workContext: conversation.workContext,
      existingContext: buildExistingContext(conversation),
    }, userMessage);
  };

  const transcribe = async () => {
    const audio = attachments.find((item) => item.kind === 'audio');
    if (!audio) return;
    setTranscribing(true);
    try {
      const result = await requestAtalAI({ mode: 'transcribe', draftId: conversation.draftId, text: '', attachments: [audio] });
      const transcript = result.transcript ?? '';
      patchConversation({ transcription: transcript });
      await updateAIArtifact(audio.id, { transcript, status: 'transcribed' });
      setNotice('Transcripción lista para revisar.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No pudimos transcribir el audio.');
    } finally {
      setTranscribing(false);
    }
  };

  const restart = () => {
    const fresh = createAIConversation('global');
    persist(fresh);
    setDraft(null);
    setAttachments([]);
    setDialog(null);
    setDraftModeArmed(false);
    setNotice('Nueva conversación general preparada.');
  };

  const discard = async () => {
    await deleteAIConversationArtifacts(conversation.id).catch(() => undefined);
    clearAIWorkspace(conversation.id, conversation.draftId);
    restart();
    setNotice('Borrador y conversación general descartados.');
  };

  const retry = () => {
    if (retryPayload) void runDraftRequest(retryPayload.request);
  };

  const editFailed = () => {
    if (!retryPayload) return;
    patchConversation({
      composerText: [retryPayload.request.text, retryPayload.request.transcription].filter(Boolean).join('\n\n'),
      status: 'composing',
      error: undefined,
      messages: retryPayload.messageId ? conversation.messages.filter((item) => item.id !== retryPayload.messageId) : conversation.messages,
    });
    composerRef.current?.focus();
  };

  const conflict = useMemo(() => {
    if (!draft || forceApply) return '';
    const current = currentVersions();
    if (draft.baseVersions.planUpdatedAt && current.planUpdatedAt !== draft.baseVersions.planUpdatedAt) return 'El plan seleccionado tiene una versión más reciente.';
    if (draft.baseVersions.recordUpdatedAt && current.recordUpdatedAt !== draft.baseVersions.recordUpdatedAt) return 'El expediente seleccionado tiene una versión más reciente.';
    if (draft.baseVersions.patientUpdatedAt && current.patientUpdatedAt !== draft.baseVersions.patientUpdatedAt) return 'El paciente seleccionado tiene cambios más recientes.';
    return '';
  }, [draft, forceApply, currentVersions, store.updatedAt]);

  const refreshConflict = () => {
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
        duration: plan ? { value: null, unit: 'custom', customText: plan.duration } : draft.plan.duration,
        frequency: plan ? { value: null, period: 'custom', customText: plan.frequency } : draft.plan.frequency,
        progressCriteria: plan?.reportCriteria ?? draft.plan.progressCriteria,
      },
      baseVersions: currentVersions(),
      updatedAt: new Date().toISOString(),
    });
    setNotice('Borrador actualizado con la versión vigente.');
  };

  const performDraftApply = async (confirmation?: ConfirmationProof) => {
    if (!draft) return;
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
      if (coreResult.status === 'clarification') {
        setNotice(coreResult.clarification.message);
      } else if (coreResult.status === 'confirmation-required') {
        setLegacyConfirmation(coreResult);
        setDialog('legacy-confirmation');
      } else if (coreResult.status === 'blocked' || coreResult.status === 'error') {
        setNotice(coreResult.message);
      } else {
        if (coreResult.clientEffect) await executeAtalClientEffect(coreResult.clientEffect, { navigate, conversationId: conversation.id, draftId: draft.id });
        const data = (coreResult.data ?? {}) as { patientId?: string; planId?: string; clinicalRecordId?: string; exerciseId?: string };
        patchConversation({
          status: 'saved',
          savedResult: {
            ...data,
            summary: coreResult.summary,
            undo: coreResult.undo,
            planId: (data.planId ?? draft.command?.planId ?? conversation.workContext.selectedPlanId) || undefined,
            patientId: (data.patientId ?? draft.command?.patientId ?? conversation.workContext.selectedPatientId) || undefined,
          },
        });
        append(createMessage('assistant', `Cambios aplicados. ${coreResult.summary.join(' ')}`));
        setDraft(null);
        setLegacyConfirmation(null);
        setDialog(null);
        setForceApply(false);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No pudimos aplicar los cambios.');
    } finally {
      setApplying(false);
    }
  };

  const confirmLegacy = () => {
    if (!legacyConfirmation) return;
    const mode = legacyConfirmation.decision.mode;
    if (mode !== 'review' && mode !== 'explicit' && mode !== 'reinforced') {
      setNotice('Esta acción no puede confirmarse.');
      return;
    }
    const now = new Date();
    void performDraftApply({
      id: uid('confirmation'),
      fingerprint: legacyConfirmation.decision.fingerprint,
      mode,
      confirmedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    });
  };

  const confirmAgent = async () => {
    const task = conversation.agentTask;
    const pending = task?.pendingInvocation;
    const pendingStep = task?.completed.findLast((step) => step.result.status === 'confirmation-required');
    if (!task || !pending || !pendingStep || pendingStep.result.status !== 'confirmation-required') return;
    const mode = pendingStep.result.decision.mode;
    if (mode !== 'review' && mode !== 'explicit' && mode !== 'reinforced') return;
    const now = new Date();
    setProcessing(true);
    setStreamingText('');
    try {
      const outcome = await confirmAndContinueAtalAgent({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text: '',
        route: window.location.pathname,
        workContext: conversation.workContext,
        attachments,
        messages: conversation.messages,
        task,
        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,
        onTextDelta: (delta) => setStreamingText((current) => current + delta),
        confirmation: {
          id: uid('confirmation'),
          fingerprint: pendingStep.result.decision.fingerprint,
          mode,
          confirmedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
        },
      });
      setDialog(null);
      await applyAgentOutcome(outcome);
      setStreamingText('');
    } catch (cause) {
      setStreamingText('');
      setNotice(cause instanceof Error ? cause.message : 'No pudimos continuar la acción confirmada.');
    } finally {
      setProcessing(false);
    }
  };

  const undo = () => {
    const receipt = conversation.savedResult?.undo;
    if (!receipt || !('patches' in receipt)) {
      setNotice('Este cambio ya no puede deshacerse de forma segura.');
      return;
    }
    try {
      executeUndo(receipt as UndoReceipt, legacyExecutionContext(conversation.workContext, { conversationId: conversation.id, draftId: conversation.draftId }));
      patchConversation({ savedResult: { ...conversation.savedResult, summary: conversation.savedResult?.summary ?? [], undo: undefined } });
      setNotice('Último cambio deshecho.');
      append(createMessage('assistant', 'Cambio deshecho correctamente.'));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'No fue posible deshacer.');
    }
  };

  const cancelDialog = () => {
    if (dialog === 'agent-confirmation' && conversation.agentTask?.status === 'needs-confirmation') {
      const task = {
        ...conversation.agentTask,
        status: 'cancelled' as const,
        pendingInvocation: undefined,
        pendingCall: undefined,
        finalText: 'Acción cancelada. Los pasos ya completados se conservaron.',
        updatedAt: new Date().toISOString(),
      };
      setConversation((current) => {
        const next = {
          ...current,
          agentTask: task,
          status: statusAfterConversation(draft),
          messages: [...current.messages, createMessage('assistant', task.finalText)],
          updatedAt: new Date().toISOString(),
        };
        saveAIConversation(next);
        return next;
      });
    }
    setDialog(null);
    setLegacyConfirmation(null);
  };

  const matchingPatient = !collisionDismissed && draft?.patient.name.trim() && conversation.workContext.patientMode === 'new'
    ? store.patients.find((patient) => patient.name.localeCompare(draft.patient.name, 'es', { sensitivity: 'base' }) === 0)
    : undefined;
  const patientLabel = conversation.workContext.patientMode === 'existing'
    ? store.patients.find((item) => item.id === conversation.workContext.selectedPatientId)?.name ?? 'Paciente existente'
    : draft?.patient.name || 'Paciente nuevo';
  const hasReadyContent = Boolean(conversation.composerText.trim() || conversation.transcription.trim() || attachments.length);

  const changeContext = (workContext: AIWorkContext) => {
    setDraftModeArmed(true);
    patchConversation({ workContext });
    setDraft((current) => current ? {
      ...current,
      intent: workContext.intent,
      selectedPatientId: workContext.selectedPatientId,
      selectedPlanId: workContext.selectedPlanId,
      selectedExerciseId: workContext.selectedExerciseId,
      baseVersions: currentVersions(),
      updatedAt: new Date().toISOString(),
    } : current);
  };

  const loadConversation = (next: AIConversation) => {
    persist(next);
    setDraft(getAIDraft(next.draftId));
    setHistoryOpen(false);
    setDraftModeArmed(false);
  };

  return <main className="atal-command-page" data-assistant-scope="global">
    <AtalAIHeader
      contextLabel={draft || draftModeArmed ? contextLabel : 'Asistente general'}
      hasDraft={Boolean(draft || conversation.messages.length)}
      onBack={() => navigate('/')}
      onContext={() => setContextOpen(true)}
      onSave={() => {
        saveAIConversation(conversation);
        if (draft) saveAIDraft(draft);
        setNotice('Conversación y borrador guardados en este dispositivo.');
      }}
      onConversations={() => setHistoryOpen(true)}
      onRestart={() => setDialog('restart')}
      onDiscard={() => setDialog('discard')}
    />

    <section className="atal-command-thread" aria-live="polite">
      {!conversation.messages.length && <article className="atal-command-intro"><AtalMark /><div><b>Atal IA</b><h1>¿Qué necesitas resolver?</h1><p>Pregunta cualquier cosa sobre Atal o prepara un cambio revisable.</p></div></article>}
      {conversation.messages.map((item) => <article key={item.id} className={`atal-command-message is-${item.role}`}>
        <span>{item.role === 'assistant' ? <AtalMark /> : <UserRound />}</span>
        <div><header><b>{item.role === 'assistant' ? 'Atal IA' : 'Tú'}</b><time>{new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time></header>{item.role === 'assistant' ? <AssistantMessageContent text={item.text} /> : <p>{item.text}</p>}{item.attachments.length > 0 && <div className="atal-command-message-files">{item.attachments.map((file) => <small key={file.id}><Paperclip />{file.name}</small>)}</div>}</div>
      </article>)}
      {streamingText && <article className="atal-command-message is-assistant is-streaming"><span><AtalMark /></span><div><header><b>Atal IA</b><time>ahora</time></header><AssistantMessageContent text={streamingText} streaming /></div></article>}
      {(processing || conversation.status === 'processing') && !streamingText && <div className="atal-command-processing" role="status" aria-live="assertive"><LoaderCircle className="is-spinning" /><span><b>Trabajando…</b><small>{draft ? 'Atal IA está actualizando el mismo borrador' : 'Atal IA está consultando y ejecutando solo lo autorizado'}</small></span></div>}
      {conversation.error && <div className="atal-command-error" role="alert"><AlertTriangle /><div><b>No pudimos completar la solicitud</b><p>{conversation.error}</p><span>{retryPayload && <button type="button" onClick={retry}><RotateCcw />Reintentar</button>}{retryPayload && <button type="button" onClick={editFailed}>Editar y reenviar</button>}</span></div></div>}
      {matchingPatient && <div className="atal-command-match"><UserRound /><div><b>Encontré a {matchingPatient.name}</b><p>{matchingPatient.diagnosis}</p><span><button type="button" onClick={() => {
        const workContext = { intent: 'create_plan_for_existing_patient' as const, patientMode: 'existing' as const, selectedPatientId: matchingPatient.id, selectedPlanId: '', selectedExerciseId: '' };
        patchConversation({ workContext });
        setDraft((current) => current ? { ...current, intent: workContext.intent, selectedPatientId: matchingPatient.id, updatedAt: new Date().toISOString() } : current);
        setCollisionDismissed(true);
      }}>Usar paciente existente</button><button type="button" onClick={() => setCollisionDismissed(true)}>Crear paciente nuevo</button></span></div></div>}
      {draft && <><SuggestionBar text={conversation.composerText} draft={draft} attachments={attachments.length} onChip={(guide) => {
        setText(`${conversation.composerText}${conversation.composerText ? '\n' : ''}${guide}`);
        composerRef.current?.focus();
      }} /><ConversationalDraftCard
        draft={draft}
        patientLabel={patientLabel}
        applying={applying}
        applied={conversation.status === 'saved'}
        conflict={conflict}
        onChange={(next) => {
          setDraft(next);
          patchConversation({ status: 'ready_for_review', savedResult: undefined });
        }}
        onApply={() => void performDraftApply()}
        onReviewAll={() => navigate(`/assistant/drafts/${draft.id}`)}
        onRefreshConflict={refreshConflict}
        onCompare={() => setCompareOpen(true)}
        onKeepVersion={() => setForceApply(true)}
      /></>}
      {conversation.savedResult && <section className="atal-command-result"><CheckCircle2 /><div><b>Cambios aplicados</b><ul>{conversation.savedResult.summary.map((item) => <li key={item}>{item}</li>)}</ul><span>{conversation.savedResult.patientId && <button type="button" onClick={() => navigate(`/patients/${conversation.savedResult?.patientId}`)}>Ver paciente<ChevronRight /></button>}{conversation.savedResult.planId && <button type="button" onClick={() => navigate(`/plans/${conversation.savedResult?.planId}`)}>Ver plan<ChevronRight /></button>}</span>{conversation.savedResult.undo && <button type="button" className="atal-command-undo" aria-label="Deshacer último cambio" onClick={undo}>Deshacer cambio</button>}</div></section>}
      <div ref={endRef} />
    </section>

    <section className="atal-command-compose-zone">
      {notice && <p className={`atal-command-toast${noticeLeaving ? ' is-leaving' : ''}`}><Sparkles />{notice}<button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X /></button></p>}
      <AttachmentPreview items={attachments} onRemove={(id) => void removeAttachment(id)} onReplace={() => setAttachmentOpen(true)} />
      {audioOpen && <AudioRecorder onReady={addAudio} onState={(status, message) => {
        patchConversation({ status: status === 'recording' || status === 'paused' ? 'recording' : 'composing' });
        if (message) setNotice(message);
      }} />}
      {attachments.some((item) => item.kind === 'audio') && <button type="button" className="atal-command-transcribe" disabled={transcribing} onClick={() => void transcribe()}>{transcribing ? <LoaderCircle className="is-spinning" /> : <FileText />}{transcribing ? 'Transcribiendo…' : 'Transcribir audio'}</button>}
      {conversation.transcription && <label className="atal-command-transcript"><span>Transcripción editable</span><textarea value={conversation.transcription} onChange={(event) => patchConversation({ transcription: event.target.value })} /></label>}
      <AIComposer textareaRef={composerRef} value={conversation.composerText} hasReadyContent={hasReadyContent} processing={processing || conversation.status === 'processing'} recording={conversation.status === 'recording'} onChange={setText} onAttach={() => setAttachmentOpen(true)} onSend={send} onMicrophone={() => setAudioOpen((value) => !value)} onCancelProcessing={() => abortRef.current?.abort()} />
      <small>El asistente general puede consultar y operar Atal; los borradores se revisan antes de aplicar.</small>
    </section>

    <AttachmentMenu open={attachmentOpen} onClose={() => {
      setAttachmentOpen(false);
      composerRef.current?.focus();
    }} onFiles={(files) => void addFiles(files)} />
    <AIContextBar open={contextOpen} context={conversation.workContext} patients={store.patients} plans={store.plans} exercises={store.exercises} onChange={changeContext} onClose={() => setContextOpen(false)} />
    {historyOpen && <HistoryDialog currentId={conversation.id} onClose={() => setHistoryOpen(false)} onSelect={loadConversation} />}
    {dialog && <ConfirmDialog
      kind={dialog}
      draft={draft}
      agentText={conversation.agentTask?.finalText}
      agentLabel={conversation.agentTask?.pendingInvocation?.authorization === 'file-derived' ? 'Revisa antes de guardar' : 'Confirmación necesaria'}
      onCancel={cancelDialog}
      onConfirm={() => {
        if (dialog === 'discard') void discard();
        else if (dialog === 'restart') restart();
        else if (dialog === 'legacy-confirmation') confirmLegacy();
        else void confirmAgent();
      }}
    />}
    {compareOpen && draft && <CompareDialog draft={draft} onClose={() => setCompareOpen(false)} />}
  </main>;
}

function HistoryDialog({ currentId, onClose, onSelect }: { currentId: string; onClose: () => void; onSelect: (conversation: AIConversation) => void }) {
  const items = readGlobalAIConversations();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-label="Conversaciones generales" onMouseDown={onClose}><section className="atal-history-sheet" onMouseDown={(event) => event.stopPropagation()}><header><div><small>Atal IA general</small><h2>Conversaciones</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header><div>{items.map((item) => <button type="button" key={item.id} className={item.id === currentId ? 'is-selected' : ''} onClick={() => onSelect(item)}><span><b>{item.messages.at(-1)?.text.slice(0, 70) || 'Conversación nueva'}</b><small>{new Date(item.updatedAt).toLocaleString('es-MX')}</small></span><ChevronRight /></button>)}{!items.length && <p>No hay conversaciones generales guardadas.</p>}</div></section></div>;
}

function ConfirmDialog({ kind, draft, agentText, agentLabel, onCancel, onConfirm }: { kind: 'discard' | 'restart' | 'legacy-confirmation' | 'agent-confirmation'; draft: AtalAIDraft | null; agentText?: string; agentLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  const copy = kind === 'discard'
    ? ['¿Descartar esta conversación general?', 'Se eliminarán esta conversación y sus ediciones. Los datos ya aplicados no cambiarán.', 'Descartar']
    : kind === 'restart'
      ? ['¿Empezar una conversación general nueva?', 'La conversación actual seguirá guardada para que puedas retomarla.', 'Empezar de nuevo']
      : kind === 'agent-confirmation'
        ? ['¿Continuar con la acción sensible?', agentText || 'Atal IA completó los pasos seguros y necesita autorización para continuar.', 'Continuar']
        : ['¿Aplicar este borrador?', draft?.assistantMessage || 'La acción modificará datos reales de Atal y quedará registrada en el historial.', 'Confirmar y aplicar'];
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-labelledby="atal-confirm-title" onMouseDown={onCancel}><section className="atal-confirm-sheet" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle />{kind === 'agent-confirmation' && <small>{agentLabel || 'Confirmación necesaria'}</small>}<h2 id="atal-confirm-title">{copy[0]}</h2><p>{copy[1]}</p><button type="button" className="is-primary" onClick={onConfirm}>{copy[2]}</button><button ref={cancelRef} type="button" onClick={onCancel}>Cancelar</button></section></div>;
}

function CompareDialog({ draft, onClose }: { draft: AtalAIDraft; onClose: () => void }) {
  const state = getAtalState();
  const plan = state.plans.find((item) => item.id === draft.selectedPlanId);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-label="Comparar cambios" onMouseDown={onClose}><section className="atal-compare-sheet" onMouseDown={(event) => event.stopPropagation()}><header><h2>Comparar cambios</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header><div><article><small>Versión actual</small><b>{plan?.title || 'Sin plan vigente'}</b><p>{plan?.goal || '—'}</p><p>{plan?.duration} · {plan?.frequency}</p></article><article><small>Tu borrador</small><b>{draft.plan.title || 'Sin título'}</b><p>{draft.plan.goal || '—'}</p><p>{draft.plan.duration.customText || draft.plan.duration.value} · {draft.plan.frequency.customText || draft.plan.frequency.value}</p></article></div></section></div>;
}
