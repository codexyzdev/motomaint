'use client';

import type { ServicioCalculado } from '@/lib/types';
import Modal from '@/components/ui/Modal';

interface ServiceDetailModalProps {
  service: ServicioCalculado;
  onClose: () => void;
}

export default function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
  const statusText = {
    urgent: 'Vencido · requiere atención',
    warning: 'Por vencer · atento',
    ok: 'En orden',
  }[service.status];

  return (
    <Modal
      eyebrow={`Servicio · ${service.status === 'urgent' ? 'Crítico' : service.status === 'warning' ? 'Alerta' : 'Saludable'}`}
      title={service.name}
      subtitle={statusText}
      folio="F-02C"
      onClose={onClose}
      actions={[
        { label: 'Cerrar', variant: 'btn-secondary', onClick: onClose },
      ]}
    >
      <div className="service-detail-info">
        {service.kmRemaining !== null && (
          <div className="detail-row">
            <span className="label">Km restantes</span>
            <span className="value">{service.kmRemaining.toLocaleString('es-CO')} km</span>
          </div>
        )}
        {service.daysRemaining !== null && (
          <div className="detail-row">
            <span className="label">Días restantes</span>
            <span className="value">{service.daysRemaining} d</span>
          </div>
        )}
        {service.lastRecord && (
          <div className="detail-row">
            <span className="label">Último servicio</span>
            <span className="value">
              {service.lastRecord.km.toLocaleString('es-CO')} km ·{' '}
              {new Date(service.lastRecord.date).toLocaleDateString('es-CO')}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
