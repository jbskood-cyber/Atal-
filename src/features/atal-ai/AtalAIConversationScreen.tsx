import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, CheckCircle2, FileText, Mic, Paperclip, Plus, RotateCcw, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { applyAtalAIDraft } from './data/applyDraft';
import { clearAIWorkspace, createAIConversation, getAIDraft, getLatestAIConversation, saveAIConversation, saveAIDraft } from './data/aiRepository';
import { requestAtalAI } from './api/geminiClient';
import { AttachmentMenu } from './components/AttachmentMenu';
import { AttachmentPreview } from './components/AttachmentPreview';
import { AudioRecorder } from './components/AudioRecorder';
import { DraftEditor } from './components/DraftEditor';
import { SuggestionBar } from './components/SuggestionBar';
import type { AIAttachmentPayload, AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest } from './types';

const MAX_FILES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg','image/png','image/webp','application/pdf']);

function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
function readFile(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No pudimos leer el archivo.')); reader.readAsDataURL(file); }); }
function kind(file: File): AIAttachmentPayload['kind'] { return file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('audio/') ? 'audio' : 'image'; }

export function AtalAIConversationScreen() {
  const router = useRouter();
  const initial = useRef(getLatestAIConversation() ?? createAIConversation());
  const [conversation, setConversation] = useState<AIConversation>(initial.current);
  const [draft, setDraft] = useState<AtalAIDraft | null>(() => getAIDraft(initial.current.draftId));
  const [attachments, setAttachments] = useState<AIAttachmentPayload[]>([]);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [notice, setNotice] = useState(initial.current.attachmentMetadata.length ? 'Recuperamos el borrador. Vuelve a adjuntar los archivos para procesarlos de nuevo.' : initial.current.messages.length ? 'Conversación recuperada en este dispositivo.' : '');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const replacementRef = useRef<HTMLInputElement>(null);
  const discardCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { saveAIConversation({ ...conversation, updatedAt: new Date().toISOString(), attachmentMetadata: attachments.map(({ data: _data, ...meta }) => ({ ...meta, available: false })) }); }, [conversation, attachments]);
  useEffect(() => { if (draft) saveAIDraft(draft); }, [draft]);
  useEffect(() => { const element = composerRef.current; if (!element) return; element.style.height = 'auto'; element.style.height = `${Math.min(150, Math.max(48, element.scrollHeight))}px`; }, [conversation.composerText]);
  useEffect(() => {
    if (!confirmDiscard) return;
    discardCancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirmDiscard(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [confirmDiscard]);

  const patchConversation = (patch: Partial<AIConversation>) => setConversation((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  const append = (message: AIMessage) => setConversation((current) => ({ ...current, messages: [...current.messages, message], updatedAt: new Date().toISOString() }));
  const setText = (composerText: string) => patchConversation({ composerText, status: composerText || attachments.length ? 'composing' : draft ? 'ready_for_review' : 'empty' });

  const addFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (attachments.length + incoming.length > MAX_FILES) return setNotice(`Puedes combinar hasta ${MAX_FILES} archivos por solicitud.`);
    try {
      const converted: AIAttachmentPayload[] = [];
      for (const file of incoming) {
        if (!allowedTypes.has(file.type) && !file.type.startsWith('audio/')) throw new Error(`${file.name}: formato no compatible. Usa JPG, PNG, WebP, PDF o audio.`);
        if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: supera el límite de 8 MB.`);
        converted.push({ id: id('attachment'), name: file.name, type: file.type, size: file.size, kind: kind(file), available: true, data: await readFile(file) });
      }
      setAttachments((current) => replacementId ? [...current.filter((item) => item.id !== replacementId), ...converted] : [...current, ...converted]);
      setReplacementId(null); setNotice(''); patchConversation({ status: 'composing' });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No pudimos adjuntar el archivo.'); }
  };
  const replace = (attachmentId: string) => { setReplacementId(attachmentId); replacementRef.current?.click(); };
  const addAudio = async (file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: supera el límite de 8 MB.`);
      const converted: AIAttachmentPayload = { id: id('attachment'), name: file.name, type: file.type, size: file.size, kind: 'audio', available: true, data: await readFile(file) };
      setAttachments((current) => [...current.filter((item) => item.kind !== 'audio'), converted]);
      setNotice('Audio listo. Convierte la nota a texto para revisarla antes de procesar.');
      patchConversation({ status: 'composing' });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No pudimos preparar el audio.'); }
  };

  const process = async (request: AtalAIAnalyzeRequest, userMessage?: AIMessage) => {
    const before = conversation.composerText;
    if (userMessage) append(userMessage);
    patchConversation({ status: 'processing', error: undefined }); setNotice('');
    try {
      const result = await requestAtalAI(request);
      if (!result.draft) throw new Error('Gemini no devolvió un borrador estructurado.');
      setDraft(result.draft); saveAIDraft(result.draft);
      const status = result.draft.missingFields.length || result.draft.uncertainFields.length ? 'needs_information' : 'ready_for_review';
      setConversation((current) => ({ ...current, status, composerText: '', transcription: '', attachmentMetadata: [], messages: [...current.messages, { id: id('message'), role: 'assistant', text: result.draft?.followUpQuestion || 'Preparé un borrador editable. Revísalo antes de aplicarlo a Atal.', createdAt: new Date().toISOString(), attachments: [] }], updatedAt: new Date().toISOString() }));
      setAttachments([]); setAudioOpen(false);
    } catch (error) {
      patchConversation({ status: 'error', composerText: before, error: error instanceof Error ? error.message : 'No pudimos procesar la solicitud.' });
    }
  };

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = conversation.composerText.trim();
    const transcription = conversation.transcription.trim();
    if (!text && !transcription && !attachments.length) return;
    const message: AIMessage = { id: id('message'), role: 'user', text: [text, transcription && `Transcripción: ${transcription}`].filter(Boolean).join('\n\n'), createdAt: new Date().toISOString(), attachments: attachments.map(({ data: _data, ...meta }) => meta) };
    void process({ mode: 'analyze', text, transcription, attachments, currentDraft: draft }, message);
  };

  const transcribe = async () => {
    const audio = attachments.find((item) => item.kind === 'audio'); if (!audio) return;
    setTranscribing(true); setNotice('Transcribiendo el audio para que puedas revisarlo…');
    try { const result = await requestAtalAI({ mode: 'transcribe', text: '', attachments: [audio] }); patchConversation({ transcription: result.transcript ?? '' }); setNotice('Revisa y corrige la transcripción antes de procesar.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'No pudimos transcribir el audio.'); }
    finally { setTranscribing(false); }
  };

  const regenerate = (mode: 'regenerate-plan' | 'regenerate-exercise', targetExerciseId?: string) => { if (!draft) return; void process({ mode, text: conversation.composerText, attachments: [], currentDraft: draft, targetExerciseId }); };
  const confirm = () => {
    if (!draft) return; setSaving(true); setNotice('');
    try {
      const savedResult = applyAtalAIDraft(draft, conversation.privateContact);
      patchConversation({ status: 'saved', savedResult });
      append({ id: id('message'), role: 'assistant', text: 'Paciente, expediente, ejercicios y plan aplicados correctamente en Atal.', createdAt: new Date().toISOString(), attachments: [] });
    } catch (error) { patchConversation({ status: 'error', error: error instanceof Error ? error.message : 'No pudimos aplicar el borrador.' }); }
    finally { setSaving(false); }
  };
  const discard = () => { clearAIWorkspace(conversation.id, conversation.draftId); const fresh = createAIConversation(); setConversation(fresh); setDraft(null); setAttachments([]); setNotice('Borrador descartado.'); setConfirmDiscard(false); };

  return <AtalShell><main className="atal-content atal-ai-page">
    <header className="atal-ai-header"><div><span><Sparkles /></span><div><small>Asistente clínico multimodal</small><h1>Atal IA</h1></div></div><button type="button" onClick={() => setConfirmDiscard(true)} disabled={!conversation.messages.length && !draft}><Trash2 /> <span>Descartar</span></button></header>
    <section className="atal-ai-thread" aria-live="polite">
      {!conversation.messages.length && !draft && <div className="atal-ai-welcome"><span><Sparkles /></span><h2>Hola, Fisio 👋</h2><p>Describe el caso con naturalidad. Puedes combinar texto, audio, fotografías y PDF en una misma solicitud.</p><div><span><UserRound /> Paciente</span><span><FileText /> Plan</span><span><Sparkles /> Ejercicios</span></div></div>}
      {conversation.messages.map((message) => <article key={message.id} className={`atal-ai-message is-${message.role}`}><span>{message.role === 'assistant' ? <Sparkles /> : <UserRound />}</span><div><p>{message.text}</p>{message.attachments.length > 0 && <div className="atal-ai-message-files">{message.attachments.map((item) => <small key={item.id}><Paperclip /> {item.name}</small>)}</div>}<time>{new Date(message.createdAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</time></div></article>)}
      {conversation.status === 'processing' && <div className="atal-ai-processing" role="status"><Sparkles /><span><b>Atal IA está analizando tu solicitud…</b><small>Organizando paciente, expediente, plan y ejercicios</small></span><i /><i /><i /></div>}
      {conversation.error && <div className="atal-ai-error" role="alert"><AlertCopy text={conversation.error} /><button type="button" onClick={() => send()}><RotateCcw /> Reintentar</button></div>}
      {draft && <DraftEditor draft={draft} contact={conversation.privateContact} saving={saving} saved={conversation.status === 'saved'} onChange={setDraft} onContact={(privateContact) => patchConversation({ privateContact })} onRegeneratePlan={() => regenerate('regenerate-plan')} onRegenerateExercise={(exerciseId) => regenerate('regenerate-exercise', exerciseId)} onConfirm={confirm} />}
      {conversation.status === 'saved' && conversation.savedResult && <section className="atal-ai-saved"><CheckCircle2 /><h2>Listo para continuar</h2><p>Los datos ya forman parte de la aplicación local.</p><div><button type="button" onClick={() => router.push(`/patients/${conversation.savedResult?.patientId}`)}>Ver paciente</button><button type="button" onClick={() => router.push(`/patients/${conversation.savedResult?.patientId}/clinical-record`)}>Ver expediente</button><button type="button" onClick={() => router.push(`/plans/${conversation.savedResult?.planId}`)}>Ver plan</button><button type="button" onClick={() => router.push(`/patients/${conversation.savedResult?.patientId}/portal-preview`)}>Vista del paciente</button></div></section>}
    </section>

    <section className="atal-ai-compose-zone">
      {notice && <p className="atal-ai-notice"><Sparkles /> {notice}<button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X /></button></p>}
      <SuggestionBar text={conversation.composerText} draft={draft} attachments={attachments.length} onChip={(guide) => { setText(`${conversation.composerText}${conversation.composerText ? '\n' : ''}${guide}`); composerRef.current?.focus(); }} />
      <AttachmentPreview items={attachments} onRemove={(attachmentId) => setAttachments((current) => current.filter((item) => item.id !== attachmentId))} onReplace={replace} />
      {audioOpen && <AudioRecorder onReady={addAudio} onState={(state, message) => { patchConversation({ status: state === 'recording' || state === 'paused' ? 'recording' : 'composing' }); if (message) setNotice(message); }} />}
      {attachments.some((item) => item.kind === 'audio') && <button type="button" className="atal-ai-transcribe" disabled={transcribing} onClick={transcribe}><Mic /> {transcribing ? 'Transcribiendo…' : 'Convertir audio a texto'}</button>}
      {conversation.transcription && <label className="atal-ai-transcript"><span>Transcripción editable</span><textarea value={conversation.transcription} onChange={(event) => patchConversation({ transcription: event.target.value })} /></label>}
      <form className="atal-ai-composer" onSubmit={send}><button type="button" aria-label="Adjuntar" onClick={() => setAttachmentOpen(true)}><Plus /></button><textarea ref={composerRef} rows={1} value={conversation.composerText} onChange={(event) => setText(event.target.value)} placeholder="Escribe información del paciente, plan o ejercicios…" aria-label="Mensaje para Atal IA" /><button type="button" aria-label="Grabar audio" className={audioOpen ? 'is-active' : ''} onClick={() => setAudioOpen((value) => !value)}><Mic /></button><button type="submit" aria-label="Enviar" className="is-send" disabled={conversation.status === 'processing' || (!conversation.composerText.trim() && !conversation.transcription.trim() && !attachments.length)}><ArrowUp /></button></form>
      <small className="atal-ai-disclaimer">Atal IA organiza la información; el fisioterapeuta la revisa y confirma.</small>
    </section>
    <input ref={replacementRef} hidden type="file" accept="image/*,application/pdf,audio/*" onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ''; }} />
    <AttachmentMenu open={attachmentOpen} onClose={() => { setAttachmentOpen(false); composerRef.current?.focus(); }} onFiles={(files) => void addFiles(files)} />
    {confirmDiscard && <div className="atal-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-ai-title" onMouseDown={() => setConfirmDiscard(false)}><section onMouseDown={(event) => event.stopPropagation()}><Sparkles /><h2 id="discard-ai-title">¿Descartar este borrador?</h2><p>Se eliminarán la conversación y las ediciones locales de Atal IA. Los pacientes ya confirmados no se modificarán.</p><button type="button" className="is-danger" onClick={discard}>Descartar borrador</button><button ref={discardCancelRef} type="button" onClick={() => setConfirmDiscard(false)}>Conservar</button></section></div>}
  </main></AtalShell>;
}

function AlertCopy({ text }: { text: string }) { return <><b>No pudimos completar el análisis</b><p>{text}</p><small>Tu entrada y tus archivos siguen disponibles para editar o reintentar.</small></>; }
