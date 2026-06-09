'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { data } from '@/lib/data';
import { computeServicesStatus } from '@/lib/engine';
import type { Moto, Registro, ServicioCalculado, TipoServicio } from '@/lib/types';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MotoCard from './MotoCard';
import ServiceTabs from './ServiceTabs';
import FAB from './FAB';

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

  const [editMotoMarca, setEditMotoMarca] = useState('');
  const [editMotoModelo, setEditMotoModelo] = useState('');
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

  const urgentCount = services.filter(s => s.status === 'urgent').length;
  const warningCount = services.filter(s => s.status === 'warning').length;

  function openEditMoto() {
    if (!moto) return;
    setEditMotoMarca(moto.marca);
    setEditMotoModelo(moto.modelo);
    setModalState({ type: 'editMoto', moto });
  }

  function openEditKm() {
    if (!moto) return;
    setEditKmValue(String(moto.kmActual));
    setModalState({ type: 'editKm', currentKm: moto.kmActual });
  }

  async function handleSaveMoto() {
    const marca = editMotoMarca.trim();
    const modelo = editMotoModelo.trim();
    if (!marca || !modelo) {
      showToast('Marca y modelo son requeridos', 'danger');
      return;
    }
    await data.saveMoto({ marca, modelo });
    await refresh();
    setModalState({ type: 'none' });
    showToast('Moto actualizada', 'success');
  }

  async function handleSaveKm() {
    const km = parseInt(editKmValue) || 0;
    await data.updateKm(Math.max(0, km));
    await refresh();
    setModalState({ type: 'none' });
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
    setModalState({ type: 'none' });
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
    const record = history.find(r => r.id === id);
    if (record) {
      setModalState({ type: 'confirmDeleteRecord', record });
    }
  }

  async function handleConfirmDeleteRecord() {
    const recordModal = modalState;
    if (recordModal.type !== 'confirmDeleteRecord') return;
    await data.removeRecord(recordModal.record.id);
    await refresh();
    setModalState({ type: 'none' });
    showToast('Registro eliminado', 'success');
  }

  function closeModal() {
    setModalState({ type: 'none' });
  }

  if (!moto) {
    return (
      <div className="splash" role="status" aria-label="Cargando">
        <div className="splash-logo" aria-hidden="true">
          <span style={{ fontSize: '3rem' }}>🏍️</span>
        </div>
        <p>MotoMaint</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="top-bar">
        <h1>MotoMaint</h1>
        <button
          className="icon-btn"
          onClick={() => router.push('/settings')}
          aria-label="Ajustes"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <MotoCard
        moto={moto}
        onKmUpdated={(km) => setMoto((prev) => prev ? { ...prev, kmActual: km } : null)}
        urgentCount={urgentCount}
        warningCount={warningCount}
        onEditKm={openEditKm}
        onEditMoto={openEditMoto}
      />

      <ServiceTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        services={services}
        history={history}
        onServiceCardClick={handleServiceCardClick}
        onServiceCheckClick={handleServiceCheckClick}
        onDeleteRecord={handleDeleteRecordClick}
      />

      <FAB onClick={handleOpenServicePicker} />

      {modalState.type === 'editMoto' && (
        <Modal
          title="Editar moto"
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar', variant: 'btn-primary', onClick: handleSaveMoto },
          ]}
        >
          <div className="form-group">
            <label htmlFor="edit-marca">Marca</label>
            <input
              id="edit-marca"
              type="text"
              className="input"
              value={editMotoMarca}
              onChange={(e) => setEditMotoMarca(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-modelo">Modelo</label>
            <input
              id="edit-modelo"
              type="text"
              className="input"
              value={editMotoModelo}
              onChange={(e) => setEditMotoModelo(e.target.value)}
              maxLength={50}
            />
          </div>
        </Modal>
      )}

      {modalState.type === 'editKm' && (
        <Modal
          title="Editar kilometraje"
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar', variant: 'btn-primary', onClick: handleSaveKm },
          ]}
        >
          <div className="form-group">
            <label htmlFor="edit-km">Kilómetros</label>
            <input
              id="edit-km"
              type="number"
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
          title="Registrar mantenimiento"
          onClose={closeModal}
        >
          <div className="service-picker-grid">
            {modalState.services.map((service) => (
              <button
                key={service.id}
                className="service-picker-item"
                onClick={() => handleServiceSelect(service)}
              >
                <span className="service-picker-icon">{service.icon}</span>
                <span className="service-picker-name">{service.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalState.type === 'recordService' && (
        <Modal
          title={`Registrar ${modalState.service.name}`}
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar', variant: 'btn-primary', onClick: handleSaveRecord },
          ]}
        >
          <div className="form-group">
            <label htmlFor="record-km">Kilómetros</label>
            <input
              id="record-km"
              type="number"
              className="input"
              value={recordKm}
              onChange={(e) => setRecordKm(e.target.value)}
              min={0}
              max={999999}
            />
          </div>
          <div className="form-group">
            <label htmlFor="record-notes">Notas (opcional)</label>
            <textarea
              id="record-notes"
              className="input"
              value={recordNotes}
              onChange={(e) => setRecordNotes(e.target.value)}
              rows={3}
            />
          </div>
        </Modal>
      )}

      {modalState.type === 'serviceDetail' && (
        <Modal
          title={modalState.service.name}
          subtitle={modalState.service.icon}
          onClose={closeModal}
          actions={[
            { label: 'Cerrar', variant: 'btn-primary', onClick: closeModal },
          ]}
        >
          <div className="service-detail-info">
            <div className={`service-status ${modalState.service.status}`}>
              {modalState.service.status === 'urgent' && '⚠️ Vencido'}
              {modalState.service.status === 'warning' && '⏰ Por vencer'}
              {modalState.service.status === 'ok' && '✅ OK'}
            </div>
            {modalState.service.kmRemaining !== null && (
              <p>Kilómetros restantes: {modalState.service.kmRemaining} km</p>
            )}
            {modalState.service.daysRemaining !== null && (
              <p>Días restantes: {modalState.service.daysRemaining}</p>
            )}
            {modalState.service.lastRecord && (
              <p>
                Último servicio: {modalState.service.lastRecord.km} km —{' '}
                {new Date(modalState.service.lastRecord.date).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
        </Modal>
      )}

      {modalState.type === 'confirmDeleteRecord' && (
        <ConfirmDialog
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
