'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthState, getValidAccessToken, clearTokens, revokeGoogleAccess } from '@/lib/googleAuth';
import { subscribeAuthChange } from '@/lib/authEvents';
import { onSyncCompleted } from '@/lib/syncEvents';
import { uploadBackup, downloadBackup, getLastBackupInfo } from '@/lib/googleDrive';
import { data } from '@/lib/data';
import { useToast } from '@/components/ui/useToast';

interface SyncStatusProps {
  onStateChange?: (isAuthenticated: boolean) => void;
}

export function SyncStatus({ onStateChange }: SyncStatusProps) {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const state = getAuthState();
      setIsAuthenticated(state.isAuthenticated);
      onStateChange?.(state.isAuthenticated);
    };

    checkAuth();

    const unsubscribe = subscribeAuthChange((authenticated) => {
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        setLastSync(null);
      }
      onStateChange?.(authenticated);
    });

    const unsubscribeSync = onSyncCompleted((detail) => {
      if (detail.success) {
        setLastSync(new Date().toLocaleString('es-CO'));
      }
    });

    const loadLastSync = async () => {
      try {
        const info = await getLastBackupInfo();
        if (info?.modifiedTime) {
          setLastSync(new Date(info.modifiedTime).toLocaleString('es-CO'));
        }
      } catch {
        // ignore
      }
    };

    loadLastSync();

    return () => { unsubscribe(); unsubscribeSync(); };
  }, [onStateChange]);

  const handleSync = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      showToast('No conectado a Google', 'danger');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const payload = await data.exportAll();
      const result = await uploadBackup(payload);
      if (result.success) {
        setLastSync(new Date().toLocaleString('es-CO'));
        showToast('Backup guardado en Google Drive', 'success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar';
      setError(message);
      showToast(message, 'danger');
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  const handleRestore = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      showToast('No conectado a Google', 'danger');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const backup = await downloadBackup();
      if (!backup) {
        showToast('No hay backup en Google Drive', 'default');
        return;
      }
      await data.importAll(backup);
      showToast('Datos restaurados de Google Drive', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al restaurar';
      setError(message);
      showToast(message, 'danger');
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  const handleDisconnect = useCallback(async () => {
    try {
      await revokeGoogleAccess();
      setIsAuthenticated(false);
      onStateChange?.(false);
      showToast('Desconectado de Google', 'default');
    } catch {
      showToast('Error al desconectar', 'danger');
    }
  }, [showToast, onStateChange]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="sync-status">
      <div className="sync-status-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span>Sincronización</span>
      </div>

      {lastSync && (
        <p className="sync-last">
          Último backup: {lastSync}
        </p>
      )}

      {error && (
        <p className="sync-error">{error}</p>
      )}

      <div className="sync-actions">
        <button
          className="btn btn-secondary"
          onClick={handleSync}
          disabled={isSyncing}
          type="button"
        >
          {isSyncing ? (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              Sincronizando...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
              </svg>
              Hacer backup ahora
            </>
          )}
        </button>

        <button
          className="btn btn-ghost"
          onClick={handleRestore}
          disabled={isSyncing}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Restaurar
        </button>
      </div>

      <button
        className="btn btn-ghost disconnect-btn"
        onClick={handleDisconnect}
        type="button"
      >
        Desconectar Google
      </button>
    </div>
  );
}