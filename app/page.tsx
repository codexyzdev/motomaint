'use client';

import { useState, useEffect } from 'react';
import { data } from '@/lib/data';
import OnboardingView from '@/components/onboarding/OnboardingView';
// DashboardView will be created in a later task
import DashboardView from '@/components/dashboard/DashboardView';

type View = 'onboarding' | 'dashboard' | null;

export default function SplashGate() {
  const [view, setView] = useState<View>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [moto] = await Promise.all([
        data.getMoto(),
        new Promise<void>((resolve) => setTimeout(resolve, 600)),
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

  // Splash screen — shown while view is null
  if (view === null) {
    return (
      <div className="splash" role="status" aria-label="Cargando MotoMaint">
        <div className="splash-logo" aria-hidden="true">
          <span style={{ fontSize: '3rem' }}>🏍️</span>
        </div>
        <p>MotoMaint</p>
      </div>
    );
  }

  if (view === 'onboarding') {
    return <OnboardingView onComplete={() => setView('dashboard')} />;
  }

  return <DashboardView />;
}
