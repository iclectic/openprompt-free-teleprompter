import type { Script } from '@/types/script';

export interface SyncService {
  isEnabled(): boolean;
  pushScripts(scripts: Script[]): Promise<void>;
  pullScripts(): Promise<Script[]>;
}

export const offlineOnlySyncService: SyncService = {
  isEnabled: () => false,
  async pushScripts() {
    // Authenticated sync is intentionally disabled for the local-first release.
  },
  async pullScripts() {
    return [];
  },
};
