'use client';

import { useEffect, useRef } from 'react';
import { getAuthState, getValidAccessToken } from './googleAuth';
import { uploadBackup, downloadBackup } from './googleDrive';
import { data } from './data';
import type { BackupPayload } from './types';

interface AutoSyncOptions {
  onSyncStart?: () => void;
  onSyncEnd?: (success: boolean) => void;
  onRestore?: (data: BackupPayload) => void;
}

export function useAutoSync(options: AutoSyncOptions = {}) {
  const syncedRef = useRef(false);
  const { onSyncStart, onSyncEnd, onRestore } = options;

  useEffect(() => {
    const syncOnOpen = async () => {
      const state = getAuthState();
      if (!state.isAuthenticated) return;

      syncedRef.current = true;
      onSyncStart?.();

      try {
        const token = await getValidAccessToken();
        if (!token) return;

        const localData = await data.exportAll();
        const driveData = await downloadBackup();

        if (!driveData) return;

        if (new Date(driveData.exportedAt) > new Date(localData.exportedAt)) {
          onRestore?.(driveData);
        }
      } catch (error) {
        console.error('Auto sync on open failed:', error);
      } finally {
        onSyncEnd?.(true);
      }
    };

    syncOnOpen();
  }, [onSyncStart, onSyncEnd, onRestore]);

  useEffect(() => {
    const syncOnClose = async () => {
      const state = getAuthState();
      if (!state.isAuthenticated || !syncedRef.current) return;

      try {
        const token = await getValidAccessToken();
        if (!token) return;

        const payload = await data.exportAll();
        await uploadBackup(payload);
      } catch (error) {
        console.error('Auto sync on close failed:', error);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      syncOnClose();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}