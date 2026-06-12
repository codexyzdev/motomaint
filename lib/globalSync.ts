import { getAuthState, getValidAccessToken, subscribeAuthChange } from './googleAuth';
import { uploadBackup, downloadBackup, clearAccessToken } from './googleDrive';
import { data } from './data';
import { onDataChanged, emitDataChanged } from './dataEvents';

const SYNC_DELAY = 3000;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let initialized = false;
let lastSyncError: string | null = null;

export function getLastSyncError(): string | null {
  return lastSyncError;
}

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
      lastSyncError = 'No se pudo subir el backup';
      console.warn('[AutoSync] Backup upload failed');
    }
  } catch (error) {
    lastSyncError = error instanceof Error ? error.message : 'Error de sincronización';
    console.error('[AutoSync] push failed:', error);
  }
}

let pullResolve: (() => void) | null = null;

export async function waitForPullComplete(): Promise<void> {
  if (!pullResolve) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (!pullResolve) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

async function pullFromDriveIfNewer(): Promise<void> {
  lastSyncError = null;
  try {
    const token = await getValidAccessToken();
    if (!token) return;

    const cloud = await downloadBackup();
    if (!cloud) return;

    const local = await data.exportAll();
    const localIsEmpty = local.moto === null;
    const cloudHasData = cloud.moto !== null;
    const cloudIsNewer = new Date(cloud.exportedAt) > new Date(local.exportedAt);

    if ((localIsEmpty && cloudHasData) || (!localIsEmpty && cloudIsNewer)) {
      await data.importAll(cloud);
      emitDataChanged();
    }
  } catch (error) {
    lastSyncError = error instanceof Error ? error.message : 'Error al descargar backup';
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearAccessToken();
    }
    console.error('[AutoSync] pull from drive failed:', error);
  } finally {
    pullResolve = null;
  }
}

export function initAutoSync() {
  if (initialized) return;
  initialized = true;

  onDataChanged(scheduleSync);

  subscribeAuthChange((authenticated) => {
    if (authenticated) {
      pullResolve = null;
      pullFromDriveIfNewer();
    }
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
