'use client';

import { useState } from 'react';
import Image from 'next/image';
import { data } from '@/lib/data';
import { useToast } from '@/components/ui/useToast';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { useAuthStatus } from '@/lib/useAuthStatus';

interface OnboardingViewProps {
  onComplete: () => void;
}

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [kmActual, setKmActual] = useState('');
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthStatus();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedMarca = marca.trim();
    const trimmedModelo = modelo.trim();

    if (!trimmedMarca || !trimmedModelo) {
      showToast('Marca y modelo son requeridos', 'danger');
      return;
    }

    await data.saveMoto({
      marca: trimmedMarca,
      modelo: trimmedModelo,
      kmActual: Number(kmActual) || 0,
    });

    showToast('¡Moto guardada!', 'success');
    onComplete();
  }

  return (
    <div className="onboarding">
      <header className="view-header">
        <div className="view-header-main">
          <div className="view-header-titles">
            <p className="view-eyebrow">Inicio</p>
            <h1 className="view-title">MotoMaint</h1>
          </div>
        </div>
      </header>

      <div className="onboarding-illu" aria-hidden="true">
        <Image src="/logo.webp" alt="" width={72} height={72} style={{ objectFit: 'contain' }} />
      </div>

      <div className="onboarding-google-section flex flex-col ">
        <p className="onboarding-lead self-center ">
          Conecta con Google Drive para hacer backup de tu cuaderno de inspección y acceder desde cualquier dispositivo.
        </p>
        <div className="onboarding-google-btn">
          <GoogleLoginButton />
        </div>
        {isAuthenticated && (
          <p className="onboarding-connected-text">✓ Google Drive conectado - tus datos se sincronizarán automáticamente</p>
        )}
      </div>

      <div className="onboarding-divider">
        <span>o continúa sin cuenta Google</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="rule-line rule-line--strong" style={{ marginTop: 8, marginBottom: 18 }}>
          Ficha del vehículo
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="marca">
            <span>Marca</span>
            <span className="form-label-counter">máx. <b>50</b></span>
          </label>
          <input
            className="form-input"
            type="text"
            id="marca"
            placeholder="Yamaha, Honda, Bajaj…"
            value={marca}
            onChange={(e) => setMarca(e.target.value.slice(0, 50))}
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="modelo">
            <span>Modelo</span>
            <span className="form-label-counter">máx. <b>50</b></span>
          </label>
          <input
            className="form-input"
            type="text"
            id="modelo"
            placeholder="FZ 250, CB 190R, Pulsar NS…"
            value={modelo}
            onChange={(e) => setModelo(e.target.value.slice(0, 50))}
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="kmActual">
            <span>Kilometraje inicial</span>
            <span className="form-label-counter">en <b>km</b></span>
          </label>
          <input
            className="form-input"
            type="number"
            id="kmActual"
            placeholder="Ej: 12.500"
            value={kmActual}
            onChange={(e) => setKmActual(e.target.value)}
            min={0}
            max={999999}
            inputMode="numeric"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>
          Comenzar Cuaderno <span aria-hidden="true">→</span>
        </button>
      </form>

      <style jsx>{`
        .onboarding-google-section {
          margin-bottom: 16px;
          background: var(--surface-raised);
          border-radius: 12px;
          text-align: center;
        }
        .onboarding-google-btn {
          display: flex;
          justify-content: center;
        }
        .onboarding-lead {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .onboarding-connected-text {
          margin-top: 8px;
          font-size: 12px;
          color: var(--success);
        }
        .onboarding-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: var(--text-tertiary);
          font-size: 12px;
        }
        .onboarding-divider::before,
        .onboarding-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        
        @media (max-width: 380px) {
          .onboarding-lead {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}