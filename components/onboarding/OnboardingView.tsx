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
      <header className="view-header">
        <div className="view-header-main">
          <div className="view-header-titles">
            <p className="view-eyebrow">Folio · 000 — Inicio</p>
            <h1 className="view-title">MotoMaint</h1>
          </div>
        </div>
      </header>

      <div className="onboarding-illu" aria-hidden="true">
        <img src="/logo.webp" alt="" width={72} height={72} />
      </div>

      <p className="onboarding-lead">
        Una Cuaderno de inspección para que cada cambio de aceite, calibración y revisión quede
        sellado en su página.
      </p>

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
    </div>
  );
}
