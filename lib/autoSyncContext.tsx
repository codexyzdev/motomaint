'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { getAuthState, getValidAccessToken } from '@/lib/googleAuth';
import { uploadBackup, downloadBackup } from '@/lib/googleDrive';
import { data } from '@/lib/data';
import type { BackupPayload } from '@/lib/types';

interface AutoSyncContextValue {
  lastBackupDate: string | null;
  isSyncing: boolean;
  hasBackup: boolean;
  triggerSync: () => Promise<void>;
}

const AutoSyncContext = createContext<AutoSyncContextValue>({
  lastBackupDate: null,
  isSyncing: false,
  hasBackup: false,
  triggerSync: async () => {},
});

export function useAutoSyncContext() {
  return useContext(AutoSyncContext);
}

interface AutoSyncProviderProps {
  children: ReactNode;
}

export function AutoSyncProvider({ children }: AutoSyncProviderProps) {
  const lastBackupDateRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const hasBackupRef = useRef(false);

  const syncNow = useCallback(async () => {
    const state = getAuthState();
    if (!state.isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      const token = await getValidAccessToken();
      if (!token) return;

      const payload = await data.exportAll();
      const result = await uploadBackup(payload);
      if (result.success && result.modifiedTime) {
        lastBackupDateRef.current = new Date(result.modifiedTime).toLocaleString('es-CO');
        hasBackupRef.current = true;
      }
    } catch (error) {
      console.error('Auto sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const checkAndSync = async () => {
      const state = getAuthState();
      if (!state.isAuthenticated) return;

      try {
        const token = await getValidAccessToken();
        if (!token) return;

        const driveData = await downloadBackup();
        const localData = await data.exportAll();

        if (driveData) {
          hasBackupRef.current = true;
          lastBackupDateRef.current = new Date(driveData.exportedAt).toLocaleString('es-CO');

          if (new Date(driveData.exportedAt) > new Date(localData.exportedAt)) {
            hasBackupRef.current = true;
          }
        }
      } catch (error) {
        console.error('Check backup failed:', error);
      }
    };

    checkAndSync();
  }, []);

  return (
    <AutoSyncContext.Provider
      value={{
        lastBackupDate: lastBackupDateRef.current,
        isSyncing: isSyncingRef.current,
        hasBackup: hasBackupRef.current,
        triggerSync: syncNow,
      }}
    >
      {children}
    </AutoSyncContext.Provider>
  );
}

export { AutoSyncContext };