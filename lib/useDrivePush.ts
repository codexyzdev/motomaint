'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { findDataFile, uploadFile } from '@/lib/drive';
import { data } from '@/lib/data';
import { onDataChanged } from '@/lib/dataEvents';

const SYNC_INTERVAL = 10000; // 10 seconds

export function useDrivePush() {
  const { data: session, status } = useSession();
  const isDirtyRef = useRef(false);
  const lastHashRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const isAuthenticated = status === 'authenticated';
  const accessToken = session?.accessToken as string | undefined;

  const syncToDrive = useCallback(async (force = false) => {
    if (!isAuthenticated || !accessToken) return;
    if (!isDirtyRef.current && !force) return;
    if (isSyncingRef.current) return;
    if (!isInitializedRef.current) return; // Don't sync until initialized
    if (force && lastHashRef.current === '') return; // Don't force sync if never synced
    
    isSyncingRef.current = true;

    try {
      const payload = await data.exportAll();
      const payloadHash = JSON.stringify(payload);

      if (payloadHash === lastHashRef.current && !force) {
        isDirtyRef.current = false;
        return;
      }

      const file = await findDataFile(accessToken);
      await uploadFile(file?.id || null, payload, accessToken);
      
      lastHashRef.current = payloadHash;
      isDirtyRef.current = false;
      console.log('☁️ useDrivePush: Sincronización exitosa');
    } catch (error) {
      console.error('useDrivePush error:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [isAuthenticated, accessToken]);

  const markDirty = useCallback(() => {
    if (isInitializedRef.current) {
      isDirtyRef.current = true;
    }
  }, []);

  const initializeHash = useCallback(async () => {
    if (lastHashRef.current === '') {
      const payload = await data.exportAll();
      lastHashRef.current = JSON.stringify(payload);
      isInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      isDirtyRef.current = false;
      lastHashRef.current = '';
      isInitializedRef.current = false;
      return;
    }

    // Initialize hash and mark as ready
    initializeHash();

    // Listen for data changes
    const unsubscribe = onDataChanged(() => {
      markDirty();
    });

    // Sync interval
    intervalRef.current = setInterval(() => {
      syncToDrive();
    }, SYNC_INTERVAL);

    // Sync on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncToDrive(true);
      }
    };

    // Sync on beforeunload
    const handleBeforeUnload = () => {
      syncToDrive(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, syncToDrive, markDirty, initializeHash]);

  return { markDirty, syncToDrive };
}