'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { findDataFile, downloadFile, uploadFile } from './drive';
import { data } from './data';
import type { BackupPayload } from './types';

interface DriveSyncOptions {
  onRestore?: (data: BackupPayload) => void;
  onSyncStart?: () => void;
  onSyncEnd?: (success: boolean) => void;
}

export function useDriveSync(options: DriveSyncOptions = {}) {
  const { onRestore, onSyncStart, onSyncEnd } = options;
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasCheckedDrive, setHasCheckedDrive] = useState(false);

  const isAuthenticated = status === "authenticated";
  const accessToken = session?.accessToken;

  const lastStateRef = useRef<string>('');

  const syncFromDrive = useCallback(async () => {
    if (!accessToken) return false;

    try {
      setIsSyncing(true);
      onSyncStart?.();
      const file = await findDataFile(accessToken);

      if (file) {
        console.log('📂 Archivo encontrado en Drive, descargando...');
        const cloudData = await downloadFile(file.id, accessToken);
        onRestore?.(cloudData);
        setLastSyncTime(new Date().toLocaleTimeString());
        lastStateRef.current = JSON.stringify(cloudData);
        return true;
      } else {
        console.log('🆕 No existe archivo en Drive, se creará uno nuevo');
        const initial = await data.exportAll();
        lastStateRef.current = JSON.stringify(initial);
        return false;
      }
    } catch (error) {
      console.error('Error en syncFromDrive:', error);
      return false;
    } finally {
      setIsSyncing(false);
      onSyncEnd?.(true);
      setHasCheckedDrive(true);
    }
  }, [accessToken, onRestore, onSyncStart, onSyncEnd]);

  const syncToDrive = useCallback(async (force = false) => {
    if (!isAuthenticated || !accessToken) return false;
    if (!isDirty && !force) return false;

    try {
      setIsSyncing(true);
      const file = await findDataFile(accessToken);
      const payload = await data.exportAll();

      const payloadStr = JSON.stringify(payload);
      if (payloadStr === lastStateRef.current && !force) {
        return false;
      }

      await uploadFile(file?.id || null, payload, accessToken);
      lastStateRef.current = payloadStr;
      setIsDirty(false);
      setLastSyncTime(new Date().toLocaleTimeString());
      console.log('☁️ Sincronización exitosa con Drive');
      return true;
    } catch (error) {
      console.error('Error en syncToDrive:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, accessToken, isDirty]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken && !hasCheckedDrive) {
      syncFromDrive();
    }
  }, [isAuthenticated, accessToken, hasCheckedDrive, syncFromDrive]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasCheckedDrive(false);
      lastStateRef.current = '';
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

  return {
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    syncFromDrive,
    syncToDrive,
    markDirty,
    hasCheckedDrive,
  };
}