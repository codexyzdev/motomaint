'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [odoDisplay, setOdoDisplay] = useState(moto.kmActual);
  const [tick, setTick] = useState(false);
  const prevKm = useRef(moto.kmActual);

  useEffect(() => {
    if (moto.kmActual !== prevKm.current) {
      prevKm.current = moto.kmActual;
      setOdoDisplay(moto.kmActual);
      setTick(true);
    }
  }, [moto.kmActual]);

  useEffect(() => {
    if (tick) {
      const t = setTimeout(() => setTick(false), 520);
      return () => clearTimeout(t);
    }
  }, [tick]);

  async function handleDelta(delta: number) {
    const next = Math.max(0, moto.kmActual + delta);
    const updated = await data.updateKm(next);
    onKmUpdated(updated.kmActual);
  }

  return (
    <article className="moto-card anim-rise">
      <header className="moto-card-head">
        <div>
          <p className="moto-eyebrow">Vehículo</p>
          <h2 className="moto-name">
            <span>
              {moto.marca} <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>{moto.modelo}</span>
            </span>
            <button type="button" onClick={onEditMoto} aria-label="Editar moto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </h2>
        </div>
      </header>

      <div className="odometer">
        <div className="odometer-label">
          <span>Odómetro</span>
          <span>Lectura actual</span>
        </div>
        <div className="odo-row">
          <span className={`odo-number ${tick ? 'tick' : ''}`} key={odoDisplay}>
            {formatNumber(odoDisplay)}
          </span>
          <span className="odo-unit">km</span>
        </div>

        <div className="km-actions" style={{ marginTop: 14 }}>
          <button type="button" className="km-btn" onClick={() => handleDelta(-100)}>−100</button>
          <button type="button" className="km-btn" onClick={() => handleDelta(100)}>+100</button>
          <button type="button" className="km-btn" onClick={() => handleDelta(500)}>+500</button>
          <button type="button" className="km-btn" onClick={onEditKm} style={{ color: 'var(--accent)' }}>Editar</button>
        </div>
      </div>

      {urgentCount > 0 && (
        <div className="alert-banner urgent" role="alert">
          <span>⚠</span>
          <span><b>{urgentCount}</b> servicio{urgentCount !== 1 ? 's' : ''} vencido{urgentCount !== 1 ? 's' : ''}</span>
          <span className="alert-mark">Atender</span>
        </div>
      )}
      {urgentCount === 0 && warningCount > 0 && (
        <div className="alert-banner warning" role="alert">
          <span>◐</span>
          <span><b>{warningCount}</b> por vencer pronto</span>
          <span className="alert-mark">Revisar</span>
        </div>
      )}
    </article>
  );
}
