import { createEntityId, getAtalState, mutateAtalStore } from './atalStore';
import { applyReviewSession } from '../domain/actions/sessionActions';

export function reviewSession(id: string, observation: string) {
  const timestamp = new Date().toISOString();
  mutateAtalStore((draft) => {
    applyReviewSession(draft, {
      sessionId: id,
      observation,
      now: timestamp,
      createEventId: () => createEntityId('event'),
    });
  });
  const session = getAtalState().sessions.find((item) => item.id === id);
  if (!session) throw new Error('La sesión ya no existe.');
  return session;
}
