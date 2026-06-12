'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAuthState, getValidAccessToken, getValidAccessTokenWithRefresh } from './googleAuth';
import { uploadBackup, downloadBackup, findBackupFile, findOrCreateFolder } from './googleDrive';
import { data } from './data';
import type { BackupPayload } from './types';

interface AutoSyncOptions {
  onSyncStart?: () => void;
  onSyncEnd?: (success: boolean) => void;
  onRestore?: (data: BackupPayload) => void;
  onSyncError?: (error: Error) => void;
}

export function useAutoSync(options: AutoSyncOptions = {}) {
  const { onSyncStart, onSyncEnd, onRestore, onSyncError } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const syncedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const currentStateRef = useRef<string>('');

  const syncToDrive = useCallback(async () => {
    const state = getAuthState();
    if (!state.isAuthenticated) return false;

    try {
      const token = await getValidAccessTokenWithRefresh();
      if (!token) return false;

      const payload = await data.exportAll();
      const result = await uploadBackup(payload);

      if (result.success) {
        isDirtyRef.current = false;
        currentStateRef.current = JSON.stringify(payload);
        setLastSyncTime(new Date().toLocaleTimeString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('syncToDrive error:', error);
      if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
        onSyncError?.(error);
      }
      return false;
    }
  }, [onSyncError]);

  const syncFromDrive = useCallback(async () => {
    const state = getAuthState();
    if (!state.isAuthenticated) return false;

    try {
      const token = await getValidAccessToken();
      if (!token) return false;

      const folderId = await findOrCreateFolder();
      const file = await findBackupFile(folderId);

      if (!file) {
        console.log('No backup file found in Drive');
        return false;
      }

      const driveData = await downloadBackup();
      if (!driveData) return false;

      const localData = await data.exportAll();

      if (new Date(driveData.exportedAt) > new Date(localData.exportedAt)) {
        onRestore?.(driveData);
        currentStateRef.current = JSON.stringify(driveData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('syncFromDrive error:', error);
      if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
        onSyncError?.(error);
      }
      return false;
    }
  }, [onRestore, onSyncError]);

  useEffect(() => {
    const initSync = async () => {
      const state = getAuthState();
      if (!state.isAuthenticated) return;

      syncedRef.current = true;
      setIsSyncing(true);
      onSyncStart?.();

      try {
        const localData = await data.exportAll();
        currentStateRef.current = JSON.stringify(localData);

        await syncFromDrive();
      } catch (error) {
        console.error('Initial sync failed:', error);
      } finally {
        setIsSyncing(false);
        onSyncEnd?.(true);
      }
    };

    initSync();
  }, [onSyncStart, onSyncEnd, syncFromDrive]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isDirtyRef.current) return;
      setIsSyncing(true);
      const success = await syncToDrive();
      setIsSyncing(false);
      onSyncEnd?.(success);
    }, 10000);

    return () => clearInterval(interval);
  }, [syncToDrive, onSyncEnd]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current) {
        syncToDrive();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncToDrive]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        syncToDrive();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncToDrive]);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    syncToDrive,
    syncFromDrive,
    markDirty,
  };
}