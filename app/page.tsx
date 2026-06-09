'use client';

import { useState, useEffect } from 'react';
import { data } from '@/lib/data';
import OnboardingView from '@/components/onboarding/OnboardingView';
import DashboardView from '@/components/dashboard/DashboardView';

type View = 'onboarding' | 'dashboard' | null;

export default function SplashGate() {
  const [view, setView] = useState<View>(null);

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

  if (view === null) {
    return (
      <div className="splash" role="status" aria-label="Cargando MotoMaint">
        <div className="splash-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" width={56} height={56} />
        </div>
        <p className="splash-name">MotoMaint</p>
        <span className="splash-tag">Hoja de inspección</span>
      </div>
    );
  }

  if (view === 'onboarding') {
    return <OnboardingView onComplete={() => setView('dashboard')} />;
  }

  return <DashboardView />;
}
