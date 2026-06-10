import { getAuthState, getValidAccessToken } from './googleAuth';
import { uploadBackup } from './googleDrive';
import { data } from './data';
import { onDataChanged } from './dataEvents';

const SYNC_DELAY = 3000;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    performSync();
  }, SYNC_DELAY);
}

async function performSync() {
  try {
    const state = getAuthState();
    if (!state.isAuthenticated) return;

    const token = await getValidAccessToken();
    if (!token) return;

    const payload = await data.exportAll();
    const result = await uploadBackup(payload);
    if (result.success) {
      console.log('[AutoSync] Backup uploaded successfully');
    }
  } catch (error) {
    console.error('[AutoSync] Failed:', error);
  }
}

let initialized = false;

export function initAutoSync() {
  if (initialized) return;
  initialized = true;

  onDataChanged(() => {
    scheduleSync();
  });

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

  console.log('[AutoSync] Initialized');
}

export function triggerSyncNow() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  performSync();
}