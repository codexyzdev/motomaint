'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAuthState, getValidAccessToken } from './googleAuth';
import { uploadBackup } from './googleDrive';
import { data } from './data';
import { onDataChanged } from './dataEvents';

const SYNC_DELAY = 3000;
const STORAGE_KEY = 'motomaint_last_sync';

interface UseAutoSyncReturn {
  lastSyncDate: string | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

export function useAutoSync(): UseAutoSyncReturn {
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncDateRef = useRef<string | null>(null);

  const syncNow = useCallback(async () => {
    const state = getAuthState();
    if (!state.isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      const token = await getValidAccessToken();
      if (!token) return;

      const payload = await data.exportAll();
      const result = await uploadBackup(payload);
      if (result.success) {
        lastSyncDateRef.current = new Date().toLocaleString('es-CO');
        localStorage.setItem(STORAGE_KEY, lastSyncDateRef.current);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncNow();
    }, SYNC_DELAY);
  }, [syncNow]);

  useEffect(() => {
    const savedDate = localStorage.getItem(STORAGE_KEY);
    if (savedDate) {
      lastSyncDateRef.current = savedDate;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onDataChanged(() => {
      scheduleSync();
    });

    return unsubscribe;
  }, [scheduleSync]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
        syncNow();
      }
    };

    const handleBeforeUnload = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      syncNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [syncNow]);

  return {
    lastSyncDate: lastSyncDateRef.current,
    isSyncing: isSyncingRef.current,
    syncNow,
  };
}

export function triggerAutoSync() {
  const state = getAuthState();
  if (!state.isAuthenticated) return;

  const token = getValidAccessToken();
  if (!token) return;

  data.exportAll().then((payload) => {
    uploadBackup(payload);
  });
}