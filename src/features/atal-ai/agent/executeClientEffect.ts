import { getAtalState, recordAtalAIEvent, updateExercise } from '@/src/data/atalStore';
import { saveExerciseMedia } from '@/src/data/exerciseMediaRepository';
import { resolvePatientPlan } from '@/src/features/guided-session/planResolver';
import { recordClinicalSessionStarted, saveCompletedClinicalSession } from '@/src/features/guided-session/sessionRepository';
import { clearSessionDraft, createSessionDraft, readSessionDraft, writeSessionDraft } from '@/src/features/guided-session/storage';
import type { GuidedSessionDraft, Symptom } from '@/src/features/guided-session/types';
import type { ClientEffect } from '../core/contracts';
import { getAIArtifact, updateAIArtifact } from '../data/aiArtifactRepository';

export type ClientEffectEnvironment = {
  navigate: (href: string) => void;
  conversationId: string;
  draftId: string;
};

export type ClientEffectOutcome = { message: string; href?: string; data?: Record<string, unknown> };

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function symptomValues(value: unknown, fallback: Symptom[]): Symptom[] {
  const allowed = new Set<Symptom>(['dolor', 'hormigueo', 'adormecimiento', 'inflamación', 'mareo', 'otro', 'ninguno']);
  if (!Array.isArray(value)) return fallback;
  const selected = value.filter((item): item is Symptom => typeof item === 'string' && allowed.has(item as Symptom));
  return selected.length ? selected : fallback;
}

function applySessionPatch(draft: GuidedSessionDraft, patch: Record<string, unknown>) {
  const next = structuredClone(draft);
  if (patch.stage === 'prepare' || patch.stage === 'exercise' || patch.stage === 'close' || patch.stage === 'summary') next.stage = patch.stage;
  if (patch.currentExerciseIndex !== undefined) next.currentExerciseIndex = Math.floor(numberValue(patch.currentExerciseIndex, next.currentExerciseIndex, 0, 999));
  const start = patch.start && typeof patch.start === 'object' ? patch.start as Record<string, unknown> : patch;
  if (start.startPain !== undefined || start.pain !== undefined) next.start.pain = numberValue(start.startPain ?? start.pain, next.start.pain, 0, 10);
  if (start.startEnergy !== undefined || start.energy !== undefined) next.start.energy = numberValue(start.startEnergy ?? start.energy, next.start.energy, 0, 10);
  if (start.startComment !== undefined || start.comment !== undefined) next.start.comment = textValue(start.startComment ?? start.comment, next.start.comment);
  const end = patch.end && typeof patch.end === 'object' ? patch.end as Record<string, unknown> : patch;
  if (end.endPain !== undefined || (patch.end && end.pain !== undefined)) next.end.pain = numberValue(end.endPain ?? end.pain, next.end.pain, 0, 10);
  if (end.endEnergy !== undefined || (patch.end && end.energy !== undefined)) next.end.energy = numberValue(end.endEnergy ?? end.energy, next.end.energy, 0, 10);
  if (end.effort !== undefined) next.end.effort = numberValue(end.effort, next.end.effort, 0, 10);
  if (end.symptoms !== undefined) next.end.symptoms = symptomValues(end.symptoms, next.end.symptoms);
  if (end.endComment !== undefined || (patch.end && end.comment !== undefined)) next.end.comment = textValue(end.endComment ?? end.comment, next.end.comment);
  if (end.easiest !== undefined) next.end.easiest = textValue(end.easiest, next.end.easiest);
  if (end.hardest !== undefined) next.end.hardest = textValue(end.hardest, next.end.hardest);
  if (end.discomfort !== undefined) next.end.discomfort = textValue(end.discomfort, next.end.discomfort);
  if (patch.exercises && typeof patch.exercises === 'object') next.exercises = { ...next.exercises, ...structuredClone(patch.exercises as GuidedSessionDraft['exercises']) };
  return next;
}

function currentSession(patientId: string, planId: string) {
  const plan = resolvePatientPlan(patientId);
  if (plan.id !== planId) throw new Error('El plan activo cambió antes de actualizar la sesión.');
  return readSessionDraft(patientId, plan).draft ?? createSessionDraft(patientId, plan);
}

async function sessionEffect(effect: Extract<ClientEffect, { type: 'session-draft' }>, environment: ClientEffectEnvironment): Promise<ClientEffectOutcome> {
  let draft = applySessionPatch(currentSession(effect.patientId, effect.planId), effect.draft);
  if (effect.operation === 'start') {
    const startedAt = draft.startedAt ?? new Date().toISOString();
    draft = { ...draft, startedAt, stage: draft.stage === 'prepare' ? 'exercise' : draft.stage, status: 'in_progress' };
    writeSessionDraft(draft);
    recordClinicalSessionStarted(effect.patientId, effect.planId, startedAt);
    const href = `/patients/${effect.patientId}/session`;
    environment.navigate(href);
    return { message: 'Sesión guiada preparada.', href };
  }
  if (effect.operation === 'update') {
    writeSessionDraft(draft);
    return { message: 'Progreso de sesión guardado.', href: `/patients/${effect.patientId}/session` };
  }
  draft = { ...draft, status: effect.draft.status === 'completed' ? 'completed' : 'partial', completedAt: new Date().toISOString(), stage: 'summary' };
  const session = saveCompletedClinicalSession(effect.patientId, effect.planId, draft);
  clearSessionDraft(effect.patientId, effect.planId);
  const href = `/activity/${session.id}`;
  environment.navigate(href);
  return { message: draft.status === 'completed' ? 'Sesión completada y guardada.' : 'Sesión parcial guardada.', href, data: { sessionId: session.id } };
}

async function mediaEffect(effect: Extract<ClientEffect, { type: 'exercise-media' }>, environment: ClientEffectEnvironment): Promise<ClientEffectOutcome> {
  const artifacts = await Promise.all(effect.artifactIds.map((id) => getAIArtifact(id)));
  if (artifacts.some((artifact) => !artifact)) throw new Error('Uno de los archivos adjuntos ya no está disponible.');
  const exercise = getAtalState().exercises.find((item) => item.id === effect.exerciseId);
  if (!exercise) throw new Error('El ejercicio ya no existe.');
  const files = artifacts.map((artifact) => new File([artifact!.blob], artifact!.name, { type: artifact!.type }));
  const media = await saveExerciseMedia(effect.exerciseId, effect.mediaType, files, exercise.media.mediaId);
  updateExercise(effect.exerciseId, { media: { type: effect.mediaType, mediaId: media.id } });
  await Promise.all(artifacts.map((artifact) => updateAIArtifact(artifact!.id, {
    status: 'applied',
    linkedResult: { entityType: 'exercise', entityId: effect.exerciseId, href: `/exercises/${effect.exerciseId}` },
  })));
  recordAtalAIEvent({
    title: 'Multimedia de ejercicio actualizada', detail: exercise.name, entity: 'exercise', entityId: exercise.id,
    changedFields: ['media'], conversationId: environment.conversationId, draftId: environment.draftId,
    toolName: 'exercise.media', toolVersion: 1, riskLevel: 'reversible-write',
    affectedEntities: [{ type: 'exercise', id: exercise.id }], outcome: 'success',
  });
  return { message: 'Multimedia del ejercicio guardada localmente.', href: `/exercises/${exercise.id}`, data: { exerciseId: exercise.id, mediaId: media.id } };
}

export async function executeAtalClientEffect(effect: ClientEffect, environment: ClientEffectEnvironment): Promise<ClientEffectOutcome> {
  if (effect.type === 'download') {
    const url = URL.createObjectURL(new Blob([effect.content], { type: effect.mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = effect.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return { message: `Archivo ${effect.filename} descargado.` };
  }
  if (effect.type === 'navigate') {
    environment.navigate(effect.href);
    return { message: 'Pantalla abierta.', href: effect.href };
  }
  if (effect.type === 'theme') {
    localStorage.setItem('atal:theme', effect.mode);
    window.dispatchEvent(new CustomEvent('atal:theme-change', { detail: { mode: effect.mode } }));
    const resolved = effect.mode === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : effect.mode;
    document.documentElement.dataset.theme = resolved;
    return { message: `Tema ${effect.mode === 'dark' ? 'oscuro' : effect.mode === 'light' ? 'claro' : 'del sistema'} aplicado.` };
  }
  if (effect.type === 'session-draft') return sessionEffect(effect, environment);
  if (effect.type === 'exercise-media') return mediaEffect(effect, environment);
  const href = `/plans/${effect.planId}/delivery`;
  sessionStorage.setItem(`atal:delivery-action:${effect.planId}`, JSON.stringify({ action: effect.action, options: effect.options ?? {}, requestedAt: new Date().toISOString() }));
  environment.navigate(href);
  return { message: effect.action === 'open' ? 'Entrega abierta.' : `Entrega preparada para ${effect.action === 'download' ? 'descargar' : effect.action === 'share' ? 'compartir' : 'imprimir'}.`, href };
}
