'use client';

import { useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useDriveSyncContext } from '@/lib/DriveSyncContext';
import { useToast } from '@/components/ui/useToast';
import { data } from '@/lib/data';

export function SyncStatus() {
  const { isAuthenticated, isSyncing, lastSyncTime, syncFromDrive, syncToDrive } = useDriveSyncContext();
  const { showToast } = useToast();

  const handleSync = useCallback(async () => {
    try {
      await syncToDrive(true);
      showToast('Backup guardado en Google Drive', 'success');
    } catch {
      showToast('Error al sincronizar', 'danger');
    }
  }, [syncToDrive, showToast]);

  const handleRestore = useCallback(async () => {
    try {
      await syncFromDrive();
      showToast('Datos restaurados de Google Drive', 'success');
    } catch {
      showToast('Error al restaurar', 'danger');
    }
  }, [syncFromDrive, showToast]);

  const handleDisconnect = useCallback(async () => {
    await signOut({ redirect: false });
    showToast('Desconectado de Google', 'default');
  }, [showToast]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="sync-status">
      <div className="sync-status-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0 3-4.03 3-9s-1.34-9-3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span>Sincronización</span>
      </div>

      {lastSyncTime && (
        <p className="sync-last">
          Último backup: {lastSyncTime}
        </p>
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
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0 3-4.03 3-9s-1.34-9-3-9" />
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