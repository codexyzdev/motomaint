'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { findDataFile, downloadFile, uploadFile } from './drive';
import type { BackupPayload } from './types';

export function useDriveSync(currentState: BackupPayload | null, onPullSuccess: (newState: BackupPayload) => void, onResetState: () => void) {
    const { data: session, status } = useSession();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const isAuthenticated = status === "authenticated";
    const accessToken = session?.accessToken;

    const lastStateRef = useRef<string>('');

    useEffect(() => {
        if (currentState) {
            const currentStateStr = JSON.stringify(currentState);
            if (currentStateStr !== lastStateRef.current) {
                setIsDirty(true);
                lastStateRef.current = currentStateStr;
            }
        }
    }, [currentState]);

    const syncFromDrive = useCallback(async () => {
        if (!accessToken) return;

        try {
            setIsSyncing(true);
            const file = await findDataFile(accessToken);

            if (file) {
                console.log('📂 Archivo encontrado en Drive, descargando...');
                const cloudData = await downloadFile(file.id, accessToken);
                onPullSuccess(cloudData);
                lastStateRef.current = JSON.stringify(cloudData);
                setIsDirty(false);
                setLastSyncTime(new Date().toLocaleTimeString());
            } else {
                console.log('🆕 No existe archivo en Drive, se creará uno nuevo en el próximo guardado.');
                if (currentState) {
                    lastStateRef.current = JSON.stringify(currentState);
                }
            }
        } catch (error: unknown) {
            console.error('Error en syncFromDrive:', error);
            if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
                signIn("google");
            }
        } finally {
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 500);
        }
    }, [onPullSuccess, accessToken, currentState]);

    const syncToDrive = useCallback(async () => {
        if (!isAuthenticated || !isDirty || !accessToken || !currentState) return;

        try {
            setIsSyncing(true);
            const file = await findDataFile(accessToken);
            await uploadFile(file?.id || null, currentState, accessToken);

            setIsDirty(false);
            lastStateRef.current = JSON.stringify(currentState);
            setLastSyncTime(new Date().toLocaleTimeString());
            console.log('☁️ Sincronización exitosa con Drive (Push)');
        } catch (error: unknown) {
            console.error('Error en syncToDrive:', error);
            if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
                signIn("google");
            }
        } finally {
            setIsSyncing(false);
        }
    }, [isAuthenticated, isDirty, currentState, accessToken]);

    const login = () => signIn("google");

    const logout = useCallback(async () => {
        await signOut({ redirect: false });
        onResetState();
    }, [onResetState]);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            syncFromDrive();
        }
    }, [isAuthenticated, accessToken, syncFromDrive]);

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

        const handleExiting = () => {
            if (isDirty) {
                console.log('🚀 Intentando guardado de emergencia antes de salir...');
                syncToDrive();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleExiting();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleExiting);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleExiting);
        };
    }, [isAuthenticated, isDirty, syncToDrive]);

    return {
        login,
        logout,
        isAuthenticated,
        isSyncing,
        lastSyncTime,
        isDirty,
        syncFromDrive,
        syncToDrive
    };
}