'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { findDataFile, downloadFile, uploadFile } from './drive';
import { data } from './data';
import { emitDataChanged } from './dataEvents';

interface DriveSyncContextValue {
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncFromDrive: () => Promise<void>;
  syncToDrive: (force?: boolean) => Promise<void>;
  markDirty: () => void;
  hasDataFromDrive: boolean;
}

const DriveSyncContext = createContext<DriveSyncContextValue | null>(null);

export function useDriveSyncContext() {
  const ctx = useContext(DriveSyncContext);
  if (!ctx) throw new Error('useDriveSyncContext must be used within DriveSyncProvider');
  return ctx;
}

export function DriveSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDataFromDrive, setHasDataFromDrive] = useState(false);
  const [lastStateHash, setLastStateHash] = useState<string>('');
  const isFetchingRef = useRef(false);

  const isAuthenticated = status === 'authenticated';
  const accessToken = session?.accessToken as string | undefined;

  const syncFromDrive = useCallback(async () => {
    if (!accessToken || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsSyncing(true);
      const file = await findDataFile(accessToken);

      if (file) {
        console.log('📂 syncFromDrive: Archivo encontrado, descargando...');
        const cloudData = await downloadFile(file.id, accessToken);
        await data.importAll(cloudData);
        emitDataChanged();
        const exported = await data.exportAll();
        setLastStateHash(JSON.stringify(exported));
        setLastSyncTime(new Date().toLocaleTimeString());
        setHasDataFromDrive(true);
        console.log('✅ syncFromDrive: Datos restaurados de Drive');
      } else {
        console.log('🆕 syncFromDrive: No existe archivo en Drive, se creará al primer cambio');
        const exported = await data.exportAll();
        setLastStateHash(JSON.stringify(exported));
      }
    } catch (error) {
      console.error('syncFromDrive error:', error);
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  }, [accessToken]);

  const syncToDrive = useCallback(async (force = false) => {
    if (!isAuthenticated || !accessToken) return;
    if (!isDirty && !force) return;

    try {
      setIsSyncing(true);
      const file = await findDataFile(accessToken);
      const payload = await data.exportAll();
      const payloadHash = JSON.stringify(payload);

      if (payloadHash === lastStateHash && !force) {
        return;
      }

      await uploadFile(file?.id || null, payload, accessToken);
      setLastStateHash(payloadHash);
      setIsDirty(false);
      setLastSyncTime(new Date().toLocaleTimeString());
      console.log('☁️ syncToDrive: Sincronización exitosa');
    } catch (error) {
      console.error('syncToDrive error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, accessToken, isDirty, lastStateHash]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken && !hasDataFromDrive && !isFetchingRef.current) {
      syncFromDrive();
    }
  }, [isAuthenticated, accessToken, hasDataFromDrive, syncFromDrive]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasDataFromDrive(false);
      setLastStateHash('');
      setIsDirty(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (isDirty) {
        syncToDrive();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isDirty, syncToDrive]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirty) {
        syncToDrive(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isDirty, syncToDrive]);

  const value: DriveSyncContextValue = {
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    syncFromDrive,
    syncToDrive,
    markDirty,
    hasDataFromDrive,
  };

  return (
    <DriveSyncContext.Provider value={value}>
      {children}
    </DriveSyncContext.Provider>
  );
}