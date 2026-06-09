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
      <span className="service-type-status">
        {service.enabled ? 'Activo' : 'Inactivo'}
      </span>
    </button>
  );
}
