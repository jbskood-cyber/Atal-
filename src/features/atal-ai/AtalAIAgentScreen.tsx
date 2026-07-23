import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAtalStore } from '@/src/data/atalStore';
import { requestAtalAI } from './api/geminiClient';
import { confirmAndContinueAtalAgent, runAtalAgentRequest } from './agent/agentController';
import { executeAtalClientEffect } from './agent/executeClientEffect';
import { executeUndo } from './core/undoEngine';
import { AIComposer } from './components/AIComposer';
import { AIContextBar, formatWorkContextLabel } from './components/AIContextBar';
import { AtalAIHeader } from './components/AtalAIHeader';
import { AttachmentMenu } from './components/AttachmentMenu';
import { AttachmentPreview } from './components/AttachmentPreview';
import { AudioRecorder } from './components/AudioRecorder';
import {
  clearAIWorkspace,
  createAIConversation,
  getLatestAIConversation,
  readAIConversations,
  saveAIConversation,
} from './data/aiRepository';
import {
  deleteAIArtifact,
  deleteAIConversationArtifacts,
  restoreAIArtifactPayloads,
  saveAIArtifact,
  updateAIArtifact,
} from './data/aiArtifactRepository';
import type { AgentLoopOutcome, AgentTaskState } from './core/agentic/contracts';
import type { ConfirmationMode, ConfirmationProof, UndoReceipt } from './core/contracts';
import type { AIAttachmentPayload, AIConversation, AIMessage, AIWorkContext } from './types';

const MAX_FILES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const fileData = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
  reader.readAsDataURL(file);
});
const attachmentKind = (file: File): AIAttachmentPayload['kind'] => file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('audio/') ? 'audio' : 'image';

function message(role: AIMessage['role'], text: string, attachments: AIAttachmentPayload[] = []): AIMessage {
  return {
    id: uid('message'),
    role,
    text,
    createdAt: new Date().toISOString(),
    attachments: attachments.map(({ data: _data, ...item }) => ({ ...item, available: true })),
  };
}

function statusFor(task: AgentTaskState): AIConversation['status'] {
  if (task.status === 'completed') return 'saved';
  if (task.status === 'needs-confirmation') return 'ready_for_review';
  if (task.status === 'needs-clarification') return 'needs_information';
  if (task.status === 'failed' || task.status === 'blocked') return 'error';
  return 'processing';
}

function proofMode(mode: ConfirmationMode): ConfirmationProof['mode'] {
  return mode === 'reinforced' ? 'reinforced' : mode === 'explicit' ? 'explicit' : 'review';
}

export function AtalAIAgentScreen() {
  const navigate = useNavigate();
  const appState = useAtalStore((state) => state);
  const [conversation, setConversation] = useState<AIConversation>(() => getLatestAIConversation() ?? createAIConversation());
  const [text, setText] = useState(conversation.composerText);
  const [attachments, setAttachments] = useState<AIAttachmentPayload[]>([]);
  const [processing, setProcessing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<UndoReceipt | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const contextLabel = useMemo(
    () => formatWorkContextLabel(conversation.workContext, appState.patients, appState.plans, appState.exercises),
    [conversation.workContext, appState.patients, appState.plans, appState.exercises],
  );

  const persist = useCallback((next: AIConversation) => {
    const value = { ...next, updatedAt: new Date().toISOString() };
    setConversation(value);
    saveAIConversation(value);
    return value;
  }, []);

  useEffect(() => {
    restoreAIArtifactPayloads(conversation.attachmentMetadata)
      .then(setAttachments)
      .catch(() => setError('Algunos archivos anteriores ya no están disponibles en este dispositivo.'));
  }, [conversation.id]);

  useEffect(() => {
    persist({
      ...conversation,
      composerText: text,
      attachmentMetadata: attachments.map(({ data: _data, ...item }) => ({ ...item, available: true })),
    });
  }, [text, attachments]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation.messages.length, processing]);

  const updateContext = (workContext: AIWorkContext) => persist({ ...conversation, workContext });

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
    setAttachments((current) => [...current, payload].slice(0, MAX_FILES));
    return payload;
  };

  const addFiles = async (files: FileList) => {
    setError('');
    const remaining = Math.max(0, MAX_FILES - attachments.length);
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!allowedTypes.has(file.type)) { setError('Atal IA acepta imágenes JPG, PNG, WEBP y documentos PDF.'); continue; }
      if (file.size > MAX_FILE_SIZE) { setError(`${file.name} supera el límite de 8 MB.`); continue; }
      await addPayload(file);
    }
  };

  const removeAttachment = async (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
    await deleteAIArtifact(id).catch(() => undefined);
  };

  const replaceAttachment = (id: string) => {
    void removeAttachment(id);
    setAttachmentOpen(true);
  };

  const audioReady = async (file: File) => {
    setProcessing(true);
    setError('');
    try {
      const payload = await addPayload(file);
      const result = await requestAtalAI({ mode: 'transcribe', text: '', attachments: [payload] });
      const transcript = result.transcript?.trim() ?? '';
      setText(transcript);
      await updateAIArtifact(payload.id, { transcript, status: 'transcribed' });
      setNotice('Audio transcrito. Revisa el texto y envíalo cuando esté listo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos transcribir el audio.');
    } finally {
      setProcessing(false);
      setRecording(false);
    }
  };

  const runEffects = async (outcome: AgentLoopOutcome) => {
    const messages: string[] = [];
    for (const step of outcome.lastResults) {
      if (step.result.status !== 'success') continue;
      if (step.result.undo) setUndo(step.result.undo);
      if (step.result.clientEffect) {
        const effect = await executeAtalClientEffect(step.result.clientEffect, {
          navigate: (href) => navigate(href),
          conversationId: conversation.id,
          draftId: conversation.draftId,
        });
        messages.push(effect.message);
      }
    }
    return messages;
  };

  const applyOutcome = async (outcome: AgentLoopOutcome, userMessage?: AIMessage) => {
    const effectMessages = await runEffects(outcome);
    const finalText = [outcome.task.finalText, ...effectMessages].filter(Boolean).join(' ');
    const nextMessages = [
      ...conversation.messages,
      ...(userMessage ? [userMessage] : []),
      ...(finalText ? [message('assistant', finalText)] : []),
    ];
    persist({
      ...conversation,
      messages: nextMessages,
      agentTask: outcome.task,
      status: statusFor(outcome.task),
      composerText: '',
      error: outcome.task.error,
    });
    if (outcome.task.status === 'needs-confirmation') {
      setNotice(outcome.task.pendingInvocation?.authorization === 'file-derived'
        ? 'Revisa la propuesta extraída del archivo antes de guardarla.'
        : 'Atal IA completó lo seguro y espera tu confirmación para continuar.');
    }
    setText('');
    setAttachments([]);
  };

  const send = async () => {
    const prompt = text.trim();
    if ((!prompt && !attachments.length) || processing) return;
    setProcessing(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    abortRef.current = controller;
    const userMessage = message('user', prompt || 'Analiza los archivos adjuntos.', attachments);
    try {
      const outcome = await runAtalAgentRequest({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text: prompt || 'Analiza los archivos adjuntos y prepara la acción indicada por su contenido.',
        route: window.location.pathname,
        workContext: conversation.workContext,
        attachments,
        task: conversation.agentTask,
        signal: controller.signal,
      });
      await applyOutcome(outcome, userMessage);
    } catch (cause) {
      const nextError = cause instanceof Error ? cause.message : 'Atal IA no pudo continuar la tarea.';
      setError(nextError);
      persist({ ...conversation, messages: [...conversation.messages, userMessage, message('assistant', nextError)], status: 'error', error: nextError });
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  };

  const confirm = async () => {
    const task = conversation.agentTask;
    const pending = task?.pendingInvocation;
    const pendingStep = task?.completed.findLast((step) => step.result.status === 'confirmation-required');
    if (!task || !pending || !pendingStep || pendingStep.result.status !== 'confirmation-required') return;
    const now = new Date();
    const confirmation: ConfirmationProof = {
      id: uid('confirmation'),
      fingerprint: pendingStep.result.decision.fingerprint,
      mode: proofMode(pendingStep.result.decision.mode),
      confirmedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    };
    setProcessing(true);
    try {
      const outcome = await confirmAndContinueAtalAgent({
        conversationId: conversation.id,
        draftId: conversation.draftId,
        text: '',
        route: window.location.pathname,
        workContext: conversation.workContext,
        attachments,
        task,
        confirmation,
      });
      await applyOutcome(outcome);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos continuar la acción confirmada.');
    } finally {
      setProcessing(false);
    }
  };

  const cancelPending = () => {
    if (!conversation.agentTask) return;
    const task = { ...conversation.agentTask, status: 'cancelled' as const, pendingInvocation: undefined, pendingCall: undefined, finalText: 'Acción cancelada. Los pasos ya completados se conservaron.' };
    persist({ ...conversation, agentTask: task, status: 'saved', messages: [...conversation.messages, message('assistant', task.finalText)] });
  };

  const undoLatest = () => {
    if (!undo) return;
    try {
      executeUndo(undo, {
        conversationId: conversation.id,
        draftId: conversation.draftId,
        route: window.location.pathname,
        selectedPatientId: conversation.workContext.selectedPatientId,
        selectedPlanId: conversation.workContext.selectedPlanId,
        selectedExerciseId: conversation.workContext.selectedExerciseId,
        selectedSessionId: '',
        now: new Date().toISOString(),
      });
      setUndo(null);
      setNotice('Último cambio deshecho.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'El cambio ya no puede deshacerse.');
    }
  };

  const restart = () => {
    const next = createAIConversation();
    persist(next);
    setText('');
    setAttachments([]);
    setUndo(null);
    setError('');
    setNotice('Nueva conversación iniciada.');
  };

  const discard = async () => {
    await deleteAIConversationArtifacts(conversation.id).catch(() => undefined);
    clearAIWorkspace(conversation.id, conversation.draftId);
    restart();
  };

  const loadConversation = (item: AIConversation) => {
    setConversation(item);
    setText(item.composerText);
    setHistoryOpen(false);
    setUndo(null);
  };

  const hasContent = Boolean(text.trim() || attachments.length);
  const pending = conversation.agentTask?.status === 'needs-confirmation';

  return <main className="atal-command-page">
    <AtalAIHeader
      contextLabel={contextLabel || 'Contexto automático'}
      hasDraft={Boolean(conversation.messages.length || hasContent)}
      onBack={() => navigate(-1)}
      onContext={() => setContextOpen(true)}
      onSave={() => { persist(conversation); setNotice('Conversación guardada.'); }}
      onConversations={() => setHistoryOpen(true)}
      onRestart={restart}
      onDiscard={() => void discard()}
    />

    <div ref={threadRef} className="atal-command-thread" aria-live="polite">
      {!conversation.messages.length && <section className="atal-command-empty">
        <Sparkles />
        <h1>¿Qué necesitas resolver?</h1>
        <p>Puedo consultar Atal, hacer cambios seguros, trabajar con varios pasos y detenerme solo cuando una decisión realmente importa.</p>
      </section>}
      {conversation.messages.map((item) => <article key={item.id} className={`atal-command-message is-${item.role}`}>
        <div>{item.text}</div>
        {item.attachments.length > 0 && <small>{item.attachments.map((file) => file.name).join(' · ')}</small>}
      </article>)}
      {processing && <article className="atal-command-message is-assistant is-processing"><Clock3 /><div>Trabajando…</div></article>}
      {pending && <section className="atal-ai-confirmation-card">
        <AlertTriangle />
        <div><b>{conversation.agentTask?.pendingInvocation?.authorization === 'file-derived' ? 'Revisa antes de guardar' : 'Confirmación necesaria'}</b><p>{conversation.agentTask?.finalText}</p></div>
        <button type="button" onClick={() => void confirm()} disabled={processing}><CheckCircle2 /> Continuar</button>
        <button type="button" onClick={cancelPending}><X /> Cancelar</button>
      </section>}
      {undo && <button type="button" className="atal-ai-undo-action" onClick={undoLatest}><RotateCcw /> Deshacer último cambio</button>}
      {notice && <p className="atal-ai-inline-notice"><CheckCircle2 />{notice}</p>}
      {error && <p className="atal-ai-inline-error"><AlertTriangle />{error}</p>}
    </div>

    <section className="atal-command-dock">
      <AttachmentPreview items={attachments} onRemove={(id) => void removeAttachment(id)} onReplace={replaceAttachment} />
      {recorderOpen && <AudioRecorder onReady={(file) => void audioReady(file)} onState={(state, nextMessage) => { setRecording(state === 'recording'); if (nextMessage) setError(nextMessage); }} />}
      <AIComposer
        textareaRef={textareaRef}
        value={text}
        hasReadyContent={hasContent}
        processing={processing}
        recording={recording}
        onChange={setText}
        onAttach={() => setAttachmentOpen(true)}
        onSend={() => void send()}
        onMicrophone={() => setRecorderOpen((value) => !value)}
        onCancelProcessing={() => abortRef.current?.abort()}
      />
      <small className="atal-command-privacy">Atal IA actúa en lo seguro, confirma lo sensible y guarda los cambios únicamente en Atal.</small>
    </section>

    <AttachmentMenu open={attachmentOpen} onClose={() => setAttachmentOpen(false)} onFiles={(files) => void addFiles(files)} />
    <AIContextBar open={contextOpen} context={conversation.workContext} patients={appState.patients} plans={appState.plans} exercises={appState.exercises} onChange={updateContext} onClose={() => setContextOpen(false)} />

    {historyOpen && <div className="atal-command-dialog" role="dialog" aria-modal="true" onMouseDown={() => setHistoryOpen(false)}>
      <section className="atal-context-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><small>Atal IA</small><h2>Conversaciones</h2></div><button type="button" onClick={() => setHistoryOpen(false)}><X /></button></header>
        <div className="atal-context-entity"><div>{readAIConversations().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => <button type="button" key={item.id} onClick={() => loadConversation(item)}><Sparkles /><span><b>{item.messages.at(-1)?.text.slice(0, 70) || 'Conversación nueva'}</b><small>{new Date(item.updatedAt).toLocaleString('es-MX')}</small></span><ChevronRight /></button>)}</div></div>
        <button type="button" className="atal-context-done" onClick={restart}><Trash2 /> Nueva conversación</button>
      </section>
    </div>}
  </main>;
}
