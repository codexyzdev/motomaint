'use client';

import type { ServicioCalculado, Registro } from '@/lib/types';
import ServiceCard from './ServiceCard';
import HistoryItem from './HistoryItem';

interface ServiceTabsProps {
  activeTab: 'services' | 'history';
  onTabChange: (tab: 'services' | 'history') => void;
  services: ServicioCalculado[];
  history: Registro[];
  onServiceCardClick: (service: ServicioCalculado) => void;
  onServiceCheckClick: (service: ServicioCalculado) => void;
  onDeleteRecord: (id: string) => void;
}

export default function ServiceTabs({
  activeTab,
  onTabChange,
  services,
  history,
  onServiceCardClick,
  onServiceCheckClick,
  onDeleteRecord,
}: ServiceTabsProps) {
  return (
    <div>
      <div className="tabs">
        <button
          className={activeTab === 'services' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('services')}
        >
          Servicios
        </button>
        <button
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('history')}
        >
          Historial
        </button>
      </div>

      {activeTab === 'services' && (
        <>
          {services.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔧</div>
              <div className="empty-text">
                No hay servicios configurados. Ve a Ajustes para agregar.
              </div>
            </div>
          ) : (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onCardClick={onServiceCardClick}
                onCheckClick={onServiceCheckClick}
              />
            ))
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {history.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <div className="empty-text">
                Sin mantenimientos registrados aún. ¡Registra el primero!
              </div>
            </div>
          ) : (
            history.slice(0, 30).map((record) => (
              <HistoryItem
                key={record.id}
                record={record}
                onDelete={onDeleteRecord}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
