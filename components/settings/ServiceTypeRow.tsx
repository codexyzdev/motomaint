'use client';

import type { TipoServicio } from '@/lib/types';

interface ServiceTypeRowProps {
  service: TipoServicio;
  onClick: (service: TipoServicio) => void;
}

export default function ServiceTypeRow({ service, onClick }: ServiceTypeRowProps) {
  return (
    <button
      type="button"
      className={`service-type-row ${service.enabled ? 'enabled' : 'disabled'}`}
      onClick={() => onClick(service)}
    >
      <span className="service-type-icon">{service.icon}</span>
      <span className="service-type-name">{service.name}</span>
      <span className={`service-type-status ${service.enabled ? 'active' : ''}`}>
        {service.enabled ? 'Activo' : 'Inactivo'}
      </span>
      <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
