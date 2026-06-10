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
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'services'}
          className={activeTab === 'services' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('services')}
        >
          Servicios · {services.length}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('history')}
        >
          Historial · {history.length}
        </button>
      </div>

      {activeTab === 'services' && (
        <>
          {services.length === 0 ? (
            <div className="empty">
              <div className="empty-icon" aria-hidden="true">🔧</div>
              <p className="empty-text">
                <b>Sin servicios configurados.</b><br />
                Ve a Ajustes para añadir los mantenimientos de tu moto.
              </p>
            </div>
          ) : (
            <div className="service-list">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className="anim-rise"
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <ServiceCard
                    service={service}
                    onCardClick={onServiceCardClick}
                    onCheckClick={onServiceCheckClick}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {history.length === 0 ? (
            <div className="empty">
              <div className="empty-icon" aria-hidden="true">📋</div>
              <p className="empty-text">
                <b>Aún no hay registros.</b><br />
                Sella tu primer mantenimiento con el botón inferior.
              </p>
            </div>
          ) : (
            <div className="service-list">
              {history.slice(0, 30).map((record, i) => (
                <div
                  key={record.id}
                  className="anim-rise"
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <HistoryItem
                    record={record}
                    onDelete={onDeleteRecord}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
