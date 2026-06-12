import { getAuthState, getValidAccessToken, subscribeAuthChange } from './googleAuth';
import { uploadBackup, downloadBackup } from './googleDrive';
import { data } from './data';
import { onDataChanged, emitDataChanged } from './dataEvents';

const SYNC_DELAY = 3000;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function scheduleSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(performSync, SYNC_DELAY);
}

async function performSync() {
  try {
    const token = await getValidAccessToken();
    if (!token) return;

    const payload = await data.exportAll();
    const result = await uploadBackup(payload);
    if (!result.success) {
      console.warn('[AutoSync] Backup upload failed');
    }
  } catch (error) {
    console.error('[AutoSync] push failed:', error);
  }
}

async function pullFromDriveIfNewer() {
  try {
    const token = await getValidAccessToken();
    if (!token) return;

    const cloud = await downloadBackup();
    if (!cloud) return;

    const local = await data.exportAll();
    if (new Date(cloud.exportedAt) > new Date(local.exportedAt)) {
      await data.importAll(cloud);
      emitDataChanged();
    }
  } catch (error) {
    console.error('[AutoSync] pull from drive failed:', error);
  }
}

export function initAutoSync() {
  if (initialized) return;
  initialized = true;

  onDataChanged(scheduleSync);

  subscribeAuthChange((authenticated) => {
    if (authenticated) pullFromDriveIfNewer();
  });

  if (getAuthState().isAuthenticated) {
    pullFromDriveIfNewer();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (syncTimeout) {
          clearTimeout(syncTimeout);
          syncTimeout = null;
        }
        performSync();
      }
    });

    window.addEventListener('beforeunload', () => {
      performSync();
    });
  }
}

export function triggerSyncNow() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  performSync();
}
