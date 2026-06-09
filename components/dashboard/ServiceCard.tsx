'use client';

import { formatServiceStatus, getMainProgress } from '@/lib/engine';
import type { ServicioCalculado } from '@/lib/types';

interface ServiceCardProps {
  service: ServicioCalculado;
  onCardClick: (service: ServicioCalculado) => void;
  onCheckClick: (service: ServicioCalculado) => void;
}

const STAMP_LABEL: Record<ServicioCalculado['status'], string> = {
  urgent: 'Vencido',
  warning: 'Por vencer',
  ok: 'Ok',
};

export default function ServiceCard({
  service,
  onCardClick,
  onCheckClick,
}: ServiceCardProps) {
  const progress = getMainProgress(service);
  const statusText = formatServiceStatus(service);
  const stamp = STAMP_LABEL[service.status];

  function handleCheckClick(e: React.MouseEvent) {
    e.stopPropagation();
    onCheckClick(service);
  }

  return (
    <article
      className={`service-card ${service.status}`}
      onClick={() => onCardClick(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onCardClick(service); }}
    >
      <div className="service-icon">{service.icon}</div>
      <div className="service-info">
        <div className="service-head">
          <h3 className="service-name">{service.name}</h3>
          <span className={`service-stamp ${service.status}`}>{stamp}</span>
        </div>
        <div className={`service-status ${service.status}`}>{statusText}</div>
        <div className="progress-bar" aria-hidden="true">
          <div
            className={`progress-fill ${service.status}`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
      <button
        className="service-check"
        onClick={handleCheckClick}
        aria-label={`Marcar ${service.name} como hecho`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </article>
  );
}
