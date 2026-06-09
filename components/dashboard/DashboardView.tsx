'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { data } from '@/lib/data';
import { computeServicesStatus } from '@/lib/engine';
import type { Moto, Registro, ServicioCalculado, TipoServicio } from '@/lib/types';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EditMotoModal from '@/components/ui/EditMotoModal';
import MotoCard from './MotoCard';
import ServiceTabs from './ServiceTabs';
import FAB from './FAB';

const MAX_NOTES_LENGTH = 500;

type ModalState =
  | { type: 'none' }
  | { type: 'editMoto'; moto: Moto }
  | { type: 'editKm'; currentKm: number }
  | { type: 'servicePicker'; services: TipoServicio[] }
  | { type: 'recordService'; service: TipoServicio; defaultKm: number }
  | { type: 'serviceDetail'; service: ServicioCalculado }
  | { type: 'confirmDeleteRecord'; record: Registro };

export default function DashboardView() {
  const router = useRouter();
  const { showToast } = useToast();

  const [moto, setMoto] = useState<Moto | null>(null);
  const [services, setServices] = useState<ServicioCalculado[]>([]);
  const [history, setHistory] = useState<Registro[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'history'>('services');
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });

  const [editKmValue, setEditKmValue] = useState('');
  const [recordKm, setRecordKm] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  const refresh = useCallback(async () => {
    const [motoData, servicesData, historyData] = await Promise.all([
      data.getMoto(),
      computeServicesStatus(),
      data.getHistory(),
    ]);
    setMoto(motoData);
    setServices(servicesData);
    setHistory(historyData);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const urgentCount = services.filter((s) => s.status === 'urgent').length;
  const warningCount = services.filter((s) => s.status === 'warning').length;

  function openEditMoto() {
    if (!moto) return;
    setModalState({ type: 'editMoto', moto });
  }

  function openEditKm() {
    if (!moto) return;
    setEditKmValue(String(moto.kmActual));
    setModalState({ type: 'editKm', currentKm: moto.kmActual });
  }

  async function handleSaveKm() {
    const km = parseInt(editKmValue) || 0;
    await data.updateKm(Math.max(0, km));
    await refresh();
    showToast('Kilometraje actualizado', 'success');
  }

  async function handleOpenServicePicker() {
    const allServices = await data.getServices();
    setModalState({ type: 'servicePicker', services: allServices });
  }

  function handleServiceSelect(service: TipoServicio) {
    setRecordKm(moto ? String(moto.kmActual) : '');
    setRecordNotes('');
    setModalState({ type: 'recordService', service, defaultKm: moto?.kmActual ?? 0 });
  }

  async function handleSaveRecord() {
    const km = parseInt(recordKm) || 0;
    const recordModal = modalState;
    if (recordModal.type !== 'recordService') return;

    const newRecord = await data.addRecord({
      serviceId: recordModal.service.id,
      serviceName: recordModal.service.name,
      serviceIcon: recordModal.service.icon,
      km,
      date: new Date().toISOString(),
      notes: recordNotes.trim(),
    });

    if (moto && km > moto.kmActual) {
      await data.updateKm(km);
    }

    await refresh();
    showToast(`${recordModal.service.name} registrado`, 'success');
  }

  function handleServiceCardClick(service: ServicioCalculado) {
    setModalState({ type: 'serviceDetail', service });
  }

  function handleServiceCheckClick(service: ServicioCalculado) {
    setRecordKm(moto ? String(moto.kmActual) : '');
    setRecordNotes('');
    setModalState({ type: 'recordService', service, defaultKm: moto?.kmActual ?? 0 });
  }

  function handleDeleteRecordClick(id: string) {
    const record = history.find((r) => r.id === id);
    if (record) {
      setModalState({ type: 'confirmDeleteRecord', record });
    }
  }

  async function handleConfirmDeleteRecord() {
    const recordModal = modalState;
    if (recordModal.type !== 'confirmDeleteRecord') return;
    await data.removeRecord(recordModal.record.id);
    await refresh();
    showToast('Registro eliminado', 'success');
  }

  function closeModal() {
    setModalState({ type: 'none' });
  }

  if (!moto) {
    return (
      <div className="splash" role="status" aria-label="Cargando">
        <div className="splash-mark" aria-hidden="true">
          <span style={{ fontSize: '1.5rem' }}>🏍️</span>
        </div>
        <p className="splash-name">MotoMaint</p>
        <span className="splash-tag">Hoja de inspección</span>
      </div>
    );
  }

  const today = new Date();
  const folioDate = today.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="view-header">
          <div>
            <p className="view-eyebrow">Cuaderno de bitácora</p>
            <h1 className="view-title">MotoMaint</h1>
          </div>
          <button
            className="icon-btn"
            onClick={() => router.push('/settings')}
            aria-label="Ajustes"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>

        <div className="view-folio" style={{ marginTop: -16, marginBottom: 24 }}>
          <div><b>Folio</b> · 001 · {folioDate}</div>
        </div>

        <MotoCard
          moto={moto}
          onKmUpdated={(km) => setMoto((prev) => prev ? { ...prev, kmActual: km } : null)}
          urgentCount={urgentCount}
          warningCount={warningCount}
          onEditKm={openEditKm}
          onEditMoto={openEditMoto}
        />

        <div className="rule-numbered">
          <span>·</span>
          <b>02 — Servicios</b>
          <span>·</span>
        </div>

        <ServiceTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          services={services}
          history={history}
          onServiceCardClick={handleServiceCardClick}
          onServiceCheckClick={handleServiceCheckClick}
          onDeleteRecord={handleDeleteRecordClick}
        />
      </div>

      <FAB onClick={handleOpenServicePicker} />

      {modalState.type === 'editMoto' && (
        <EditMotoModal
          moto={modalState.moto}
          onClose={closeModal}
          onSaved={async () => {
            await refresh();
          }}
        />
      )}

      {modalState.type === 'editKm' && (
        <Modal
          eyebrow="Sec. 01 · Odómetro"
          title="Editar kilometraje"
          subtitle="Ingresa la lectura actual del odómetro de tu moto."
          folio="F-01A"
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar lectura', variant: 'btn-primary', onClick: handleSaveKm },
          ]}
        >
          <div className="form-group">
            <label htmlFor="edit-km">
              <span>Kilómetros</span>
              <span className="form-label-counter">máx. <b>999.999</b></span>
            </label>
            <input
              id="edit-km"
              type="number"
              inputMode="numeric"
              className="input"
              value={editKmValue}
              onChange={(e) => setEditKmValue(e.target.value)}
              min={0}
              max={999999}
            />
          </div>
        </Modal>
      )}

      {modalState.type === 'servicePicker' && (
        <Modal
          eyebrow="Sec. 02 · Registro"
          title="¿Qué mantuviste?"
          subtitle="Elige el servicio que acabas de realizar. Lo sellaremos en tu bitácora."
          folio="F-02A"
          onClose={closeModal}
        >
          <div className="service-picker-grid">
            {modalState.services.map((service) => (
              <button
                key={service.id}
                className="service-picker-item"
                onClick={() => handleServiceSelect(service)}
                type="button"
              >
                <span className="service-picker-icon" aria-hidden="true">{service.icon}</span>
                <span className="service-picker-name">{service.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalState.type === 'recordService' && (
        <RecordServiceModal
          service={modalState.service}
          defaultKm={modalState.defaultKm}
          recordKm={recordKm}
          setRecordKm={setRecordKm}
          recordNotes={recordNotes}
          setRecordNotes={setRecordNotes}
          onSave={handleSaveRecord}
          onClose={closeModal}
        />
      )}

      {modalState.type === 'serviceDetail' && (
        <ServiceDetailModal service={modalState.service} onClose={closeModal} />
      )}

      {modalState.type === 'confirmDeleteRecord' && (
        <ConfirmDialog
          eyebrow="Archivo · Eliminar"
          title="Eliminar registro"
          message="¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleConfirmDeleteRecord}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}

interface RecordServiceModalProps {
  service: TipoServicio;
  defaultKm: number;
  recordKm: string;
  setRecordKm: (v: string) => void;
  recordNotes: string;
  setRecordNotes: (v: string) => void;
  onSave: () => Promise<void> | void;
  onClose: () => void;
}

function RecordServiceModal({
  service,
  defaultKm,
  recordKm,
  setRecordKm,
  recordNotes,
  setRecordNotes,
  onSave,
  onClose,
}: RecordServiceModalProps) {
  const { showToast } = useToast();
  const idPrefix = useId();

  const handleSave = async () => {
    const km = parseInt(recordKm) || 0;
    if (km < 0) {
      showToast('El kilometraje no puede ser negativo', 'danger');
      return;
    }
    await onSave();
  };

  return (
    <Modal
      eyebrow="Sec. 02 · Sello de servicio"
      title={`Registrar ${service.name}`}
      subtitle={`Último servicio registrado: ${defaultKm.toLocaleString('es-CO')} km`}
      folio="F-02B"
      onClose={onClose}
      actions={[
        { label: 'Cancelar', variant: 'btn-ghost', onClick: onClose },
        { label: 'Sellar registro', variant: 'btn-primary', onClick: handleSave },
      ]}
    >
      <div className="form-group">
        <label htmlFor={`${idPrefix}-km`}>
          <span>Kilómetros al servicio</span>
        </label>
        <input
          id={`${idPrefix}-km`}
          type="number"
          inputMode="numeric"
          className="input"
          value={recordKm}
          onChange={(e) => setRecordKm(e.target.value)}
          min={0}
          max={999999}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-notes`}>
          <span>Notas del taller</span>
          <span className="form-label-counter">
            <b>{recordNotes.length}</b>/{MAX_NOTES_LENGTH}
          </span>
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          className="input"
          value={recordNotes}
          onChange={(e) => setRecordNotes(e.target.value)}
          rows={3}
          maxLength={MAX_NOTES_LENGTH}
        />
      </div>
    </Modal>
  );
}

function ServiceDetailModal({ service, onClose }: { service: ServicioCalculado; onClose: () => void }) {
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
