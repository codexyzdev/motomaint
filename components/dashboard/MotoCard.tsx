'use client';

import { data } from '@/lib/data';
import { formatNumber } from '@/lib/helpers';
import type { Moto } from '@/lib/types';

interface MotoCardProps {
  moto: Moto;
  onKmUpdated: (newKm: number) => void;
  urgentCount: number;
  warningCount: number;
  onEditKm: () => void;
  onEditMoto: () => void;
}

export default function MotoCard({
  moto,
  onKmUpdated,
  urgentCount,
  warningCount,
  onEditKm,
  onEditMoto,
}: MotoCardProps) {
  async function handleDelta(delta: number) {
    const updated = await data.updateKm(moto.kmActual + delta);
    onKmUpdated(updated.kmActual);
  }

  return (
    <div className="moto-card">
      <div className="moto-label">Tu moto</div>
      <h2 className="moto-name">
        <span>
          {moto.marca} {moto.modelo}
        </span>
        <button onClick={onEditMoto} aria-label="Editar moto">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </h2>

      <div className="moto-label">Kilometraje actual</div>
      <div className="km-display">
        <span className="km-number">{formatNumber(moto.kmActual)}</span>
        <span className="km-unit">km</span>
      </div>

      <div className="km-actions">
        <button className="km-btn" onClick={() => handleDelta(-100)}>
          −100
        </button>
        <button className="km-btn" onClick={() => handleDelta(100)}>
          +100
        </button>
        <button className="km-btn" onClick={() => handleDelta(500)}>
          +500
        </button>
        <button className="km-btn" onClick={onEditKm}>
          Editar
        </button>
      </div>

      {urgentCount > 0 && (
        <div className="alert-banner urgent">
          ⚠️ {urgentCount} servicio{urgentCount !== 1 ? 's' : ''} vencido
          {urgentCount !== 1 ? 's' : ''}
        </div>
      )}
      {urgentCount === 0 && warningCount > 0 && (
        <div className="alert-banner warning">
          ⏰ {warningCount} servicio{warningCount !== 1 ? 's' : ''} por vencer pronto
        </div>
      )}
    </div>
  );
}
