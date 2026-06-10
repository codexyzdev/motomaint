import { getAuthState, getValidAccessToken } from './googleAuth';
import { uploadBackup } from './googleDrive';
import { data } from './data';

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export async function syncToDrive(): Promise<boolean> {
  try {
    const state = getAuthState();
    if (!state.isAuthenticated) return false;

    const token = await getValidAccessToken();
    if (!token) return false;

    const payload = await data.exportAll();
    const result = await uploadBackup(payload);
    return result.success;
  } catch (error) {
    console.error('Sync to Drive failed:', error);
    return false;
  }
}

export function debouncedSyncToDrive(delayMs = 2000): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncToDrive();
  }, delayMs);
}

export async function checkDriveBackup(): Promise<{ hasBackup: boolean; date: string | null }> {
  try {
    const state = getAuthState();
    if (!state.isAuthenticated) return { hasBackup: false, date: null };

    const token = await getValidAccessToken();
    if (!token) return { hasBackup: false, date: null };

    const { getLastBackupInfo } = await import('./googleDrive');
    const info = await getLastBackupInfo();
    return {
      hasBackup: !!info,
      date: info?.modifiedTime ? new Date(info.modifiedTime).toLocaleString('es-CO') : null,
    };
  } catch {
    return { hasBackup: false, date: null };
  }
}