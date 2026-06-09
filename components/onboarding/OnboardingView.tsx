'use client';

import { useState } from 'react';
import { data } from '@/lib/data';
import { useToast } from '@/components/ui/useToast';

interface OnboardingViewProps {
  onComplete: () => void;
}

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [kmActual, setKmActual] = useState('');
  const { showToast } = useToast();

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
      {/* Floating motorcycle illustration */}
      <div className="onboarding-illu" aria-hidden="true">
        <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
          <path
            d="M16 44l8-20h16l8 20"
            stroke="url(#onboard-gradient)"
            strokeWidth="3"
            strokeLinejoin="round"
            fill="none"
          />
          <circle
            cx="20"
            cy="46"
            r="6"
            stroke="url(#onboard-gradient)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="44"
            cy="46"
            r="6"
            stroke="url(#onboard-gradient)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M24 24l4-8h8l4 8"
            stroke="url(#onboard-gradient)"
            strokeWidth="3"
            strokeLinejoin="round"
            fill="none"
          />
          <defs>
            <linearGradient id="onboard-gradient" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0" stopColor="#ff7a18" />
              <stop offset="1" stopColor="#ffb347" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h1>
        Tu moto, <span className="gradient-text">bien cuidada</span>
      </h1>

      <p>Registra los mantenimientos y nunca más se te pase un cambio de aceite.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="marca">
            Marca
          </label>
          <input
            className="form-input"
            type="text"
            id="marca"
            placeholder="Ej: Yamaha, Honda, Bajaj..."
            value={marca}
            onChange={(e) => setMarca(e.target.value.slice(0, 50))}
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="modelo">
            Modelo
          </label>
          <input
            className="form-input"
            type="text"
            id="modelo"
            placeholder="Ej: FZ 250, CB 190R, Pulsar NS..."
            value={modelo}
            onChange={(e) => setModelo(e.target.value.slice(0, 50))}
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="kmActual">
            Kilometraje actual
          </label>
          <input
            className="form-input"
            type="number"
            id="kmActual"
            placeholder="Ej: 12500"
            value={kmActual}
            onChange={(e) => setKmActual(e.target.value)}
            min={0}
            max={999999}
            inputMode="numeric"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
          Empezar <span style={{ fontSize: '1.2rem' }}>→</span>
        </button>
      </form>
    </div>
  );
}
