import { mutateAtalStore, type AppSettings } from './atalStore';
import { applyUpdateSettings } from '../domain/actions/settingsActions';

export function updateLocalSettings(patch: Partial<AppSettings>) {
  let settings: AppSettings | null = null;
  mutateAtalStore((draft) => {
    settings = applyUpdateSettings(draft, { patch }).settings;
  });
  return settings;
}
