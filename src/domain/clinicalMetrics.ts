import type { SessionRecord } from '@/src/data/atalStore';

export function sessionNeedsAttention(session: SessionRecord) {
  return session.endPain >= 7 || session.symptoms.some((item) => !['ninguno', 'otro'].includes(item));
}

export function sessionExerciseProgress(session: SessionRecord) {
  const records = Object.values(session.exercises);
  const completed = records.filter((record) => record.result === 'completed').length;
  const partial = records.filter((record) => record.result === 'partial').length;
  const skipped = records.filter((record) => record.result === 'skipped' || !record.result).length;
  const sets = records.flatMap((record) => record.sets);
  const completedSets = sets.filter((set) => set.completed).length;
  return { total: records.length, completed, partial, skipped, totalSets: sets.length, completedSets };
}

export function summarizeClinicalSessions(sessions: SessionRecord[]) {
  const sorted = [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const completed = sorted.filter((session) => session.status === 'completed').length;
  const pending = sorted.filter((session) => !session.reviewedAt).length;
  const attention = sorted.filter(sessionNeedsAttention).length;
  const averageEndPain = sorted.length ? sorted.reduce((sum, session) => sum + session.endPain, 0) / sorted.length : null;
  const averagePainChange = sorted.length ? sorted.reduce((sum, session) => sum + (session.endPain - session.startPain), 0) / sorted.length : null;
  return {
    sessions: sorted,
    total: sorted.length,
    completed,
    partial: sorted.length - completed,
    pending,
    reviewed: sorted.length - pending,
    attention,
    adherence: sorted.length ? Math.round((completed / sorted.length) * 100) : null,
    averageEndPain,
    averagePainChange,
    latestAt: sorted[0]?.completedAt ?? null,
  };
}
