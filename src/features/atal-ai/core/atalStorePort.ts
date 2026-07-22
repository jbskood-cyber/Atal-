import { getAtalState, mutateAtalStore } from '../../../data/atalStore';
import type { StorePort } from './contracts';

export const atalStorePort: StorePort = {
  read: getAtalState,
  mutate: mutateAtalStore,
};
