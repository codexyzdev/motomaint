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
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
            <path
              d="M16 44l8-20h16l8 20"
              stroke="url(#splash-gradient)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              fill="none"
            />
            <circle
              cx="20"
              cy="46"
              r="6"
              stroke="url(#splash-gradient)"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="44"
              cy="46"
              r="6"
              stroke="url(#splash-gradient)"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M24 24l4-8h8l4 8"
              stroke="url(#splash-gradient)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              fill="none"
            />
            <defs>
              <linearGradient id="splash-gradient" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0" stopColor="#ffb04a" />
                <stop offset="1" stopColor="#ff8a1e" />
              </linearGradient>
            </defs>
          </svg>
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
