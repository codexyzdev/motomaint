'use client';

import { formatServiceStatus, getMainProgress } from '@/lib/engine';
import type { ServicioCalculado } from '@/lib/types';

interface ServiceCardProps {
  service: ServicioCalculado;
  onCardClick: (service: ServicioCalculado) => void;
  onCheckClick: (service: ServicioCalculado) => void;
}

export default function ServiceCard({
  service,
  onCardClick,
  onCheckClick,
}: ServiceCardProps) {
  const progress = getMainProgress(service);
  const statusText = formatServiceStatus(service);

  function handleCheckClick(e: React.MouseEvent) {
    e.stopPropagation();
    onCheckClick(service);
  }

  return (
    <div className="service-card" onClick={() => onCardClick(service)}>
      <div className="service-icon">{service.icon}</div>
      <div className="service-info">
        <div className="service-name">{service.name}</div>
        <div className={`service-status ${service.status}`}>{statusText}</div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${service.status}`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
      <button
        className="service-check"
        onClick={handleCheckClick}
        aria-label="Marcar como hecho"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}
