import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, LoaderCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { getAIDraft, readAIConversations, saveAIConversation, saveAIDraft } from './data/aiRepository';
import { applyAtalAIDraft } from './data/applyDraft';
import { requestAtalAI } from './api/geminiClient';
import { DraftEditor } from './components/DraftEditor';
import { AIProgressCircuit } from './components/AIProgressCircuit';
import type { AtalAIDraft, PrivateContactDraft } from './types';

export function AtalAIDraftReviewScreen({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [conversation, setConversation] = useState(() => readAIConversations().find((item) => item.draftId === draftId) ?? null);
  const [draft, setDraft] = useState<AtalAIDraft | null>(() => getAIDraft(draftId));
  const [contact, setContact] = useState<PrivateContactDraft>(() => conversation?.privateContact ?? { phone: '', email: '', address: '', emergencyContact: '' });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(conversation?.status === 'saved');
  const [result, setResult] = useState(conversation?.savedResult);
  const [error, setError] = useState('');

  useEffect(() => { if (draft) saveAIDraft(draft); }, [draft]);
  useEffect(() => { if (conversation) { const next = { ...conversation, privateContact: contact, updatedAt: new Date().toISOString() }; saveAIConversation(next); } }, [contact]);

  if (!draft || !conversation) return <AtalShell><main className="atal-content atal-flow-page"><div className="atal-panel-placeholder"><FileText /><h1>Borrador no encontrado</h1><p>El borrador pudo haber sido descartado.</p><button type="button" onClick={() => router.push('/assistant')}>Volver a Atal IA</button></div></main></AtalShell>;

  const regenerate = async (mode: 'regenerate-plan' | 'regenerate-exercise', targetExerciseId?: string) => {
    setRegenerating(true); setError('');
    try {
      const response = await requestAtalAI({ mode, draftId, text: '', attachments: [], currentDraft: draft, targetExerciseId, workContext: conversation.workContext });
      if (!response.draft) throw new Error('Atal IA no devolvió una alternativa válida.');
      setDraft(response.draft);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'No pudimos regenerar esa sección.'); }
    finally { setRegenerating(false); }
  };

  const apply = () => {
    setSaving(true); setError('');
    try {
      const savedResult = applyAtalAIDraft(draft, contact);
      const next = { ...conversation, status: 'saved' as const, savedResult, privateContact: contact, updatedAt: new Date().toISOString() };
      saveAIConversation(next); setConversation(next); setResult(savedResult); setSaved(true);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'No pudimos aplicar el borrador.'); }
    finally { setSaving(false); }
  };

  return <AtalShell><main className="atal-content atal-flow-page atal-ai-review-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.push('/assistant')} aria-label="Volver a Atal IA"><ArrowLeft /></button><span>Revisión de Atal IA</span><i /></div>
    <header className="atal-ai-review-header"><Sparkles /><div><small>Intención seleccionada</small><h1>{draft.intent.replaceAll('_', ' ')}</h1><p>Revisa cada sección antes de aplicar cambios reales.</p></div></header>
    <AIProgressCircuit status={saved ? 'saved' : regenerating ? 'processing' : 'ready_for_review'} draft={draft} onReview={(stage) => document.querySelector(`[data-ai-section="${stage==='record'?'patient':stage}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
    {regenerating && <p className="atal-ai-inline-status" role="status"><LoaderCircle className="is-spinning" /> Actualizando únicamente la sección solicitada…</p>}
    {error && <p className="atal-form-error" role="alert">{error}</p>}
    <DraftEditor draft={draft} contact={contact} saving={saving || regenerating} saved={saved} onChange={setDraft} onContact={setContact} onRegeneratePlan={() => void regenerate('regenerate-plan')} onRegenerateExercise={(exerciseId) => void regenerate('regenerate-exercise', exerciseId)} onConfirm={apply} />
    {saved && result && <section className="atal-ai-saved"><CheckCircle2 /><h2>Cambios aplicados correctamente</h2><ul>{result.summary.map((item) => <li key={item}>{item}</li>)}</ul><div>
      {result.patientId && <button type="button" onClick={() => router.push(`/patients/${result.patientId}`)}>Ver paciente</button>}
      {result.patientId && result.clinicalRecordId && <button type="button" onClick={() => router.push(`/patients/${result.patientId}/clinical-record`)}>Ver expediente</button>}
      {result.planId && <button type="button" onClick={() => router.push(`/plans/${result.planId}`)}>Ver plan</button>}
      {result.exerciseId && <button type="button" onClick={() => router.push(`/exercises/${result.exerciseId}`)}>Ver ejercicio</button>}
      {result.patientId && result.planId && <button type="button" onClick={() => router.push(`/patients/${result.patientId}/portal-preview`)}>Vista del paciente</button>}
      {result.patientId && result.planId && <button type="button" onClick={() => router.push(`/patients/${result.patientId}/session`)}>Iniciar sesión</button>}
    </div></section>}
  </main></AtalShell>;
}
