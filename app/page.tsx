'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { data } from '@/lib/data';
import { useAutoSync } from '@/lib/autoSync';
import OnboardingView from '@/components/onboarding/OnboardingView';
import DashboardView from '@/components/dashboard/DashboardView';
import type { BackupPayload } from '@/lib/types';

type View = 'onboarding' | 'dashboard' | null;

export default function SplashGate() {
  const [view, setView] = useState<View>(null);
  const [restoreData, setRestoreData] = useState<BackupPayload | null>(null);

  const handleRestore = (backupData: BackupPayload) => {
    setRestoreData(backupData);
  };

  useAutoSync({
    onRestore: handleRestore,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [moto] = await Promise.all([
        data.getMoto(),
        new Promise<void>((resolve) => setTimeout(resolve, 700)),
      ]);

      if (!cancelled) {
        setView(moto ? 'dashboard' : 'onboarding');
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirmRestore = async () => {
    if (!restoreData) return;
    await data.importAll(restoreData);
    setRestoreData(null);
    window.location.reload();
  };

  const handleCancelRestore = () => {
    setRestoreData(null);
  };

  if (view === null) {
    return (
      <div className="splash" aria-label="Cargando MotoMaint">
        <div className="splash-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/logo.webp" alt="" width={56} height={56} />
        </div>
        <p className="splash-name">MotoMaint</p>
        <span className="splash-tag">Hoja de inspección</span>
      </div>
    );
  }

  if (view === 'onboarding') {
    return <OnboardingView onComplete={() => setView('dashboard')} />;
  }

  return (
    <>
      <DashboardView />
      {restoreData && (
        <div className="restore-prompt">
          <div className="restore-dialog">
            <h3>Backup más reciente encontrado</h3>
            <p>Fecha del backup: {new Date(restoreData.exportedAt).toLocaleString('es-CO')}</p>
            <p>¿Deseas restaurar estos datos?</p>
            <div className="restore-actions">
              <button className="btn btn-primary" onClick={handleConfirmRestore}>
                Restaurar
              </button>
              <button className="btn btn-ghost" onClick={handleCancelRestore}>
                Usar datos locales
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
