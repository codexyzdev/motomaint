'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import { getAuthState, getValidAccessToken } from '@/lib/googleAuth';
import { uploadBackup, downloadBackup } from '@/lib/googleDrive';
import { data } from '@/lib/data';
import { emitSyncCompleted } from '@/lib/syncEvents';
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
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);

  const syncNow = useCallback(async () => {
    const state = getAuthState();
    if (!state.isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const token = await getValidAccessToken();
      if (!token) return;

      const payload = await data.exportAll();
      const result = await uploadBackup(payload);
      if (result.success && result.modifiedTime) {
        const syncTime = new Date(result.modifiedTime).toLocaleString('es-CO');
        setLastBackupDate(syncTime);
        setHasBackup(true);
        emitSyncCompleted({ success: true, modifiedTime: result.modifiedTime });
      }
    } catch (error) {
      console.error('Auto sync failed:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
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
          setHasBackup(true);
          setLastBackupDate(new Date(driveData.exportedAt).toLocaleString('es-CO'));

          if (new Date(driveData.exportedAt) > new Date(localData.exportedAt)) {
            setHasBackup(true);
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
        lastBackupDate,
        isSyncing,
        hasBackup,
        triggerSync: syncNow,
      }}
    >
      {children}
    </AutoSyncContext.Provider>
  );
}

export { AutoSyncContext };