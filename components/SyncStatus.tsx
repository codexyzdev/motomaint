'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { data } from '@/lib/data';
import { useToast } from '@/components/ui/useToast';

export function SyncStatus() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const isAuthenticated = status === 'authenticated';

  const handleDisconnect = useCallback(async () => {
    await data.reset();
    await signOut({ redirect: false });
    showToast('Desconectado de Google', 'default');
    router.push('/');
  }, [showToast, router]);

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

      <p className="sync-connected-text">
        ✓ Google Drive conectado
      </p>

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