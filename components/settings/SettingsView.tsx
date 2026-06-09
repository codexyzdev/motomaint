'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { data } from '@/lib/data';
import type { Moto, TipoServicio } from '@/lib/types';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ServiceTypeRow from './ServiceTypeRow';
import IconPicker from './IconPicker';

type ModalState =
  | { type: 'none' }
  | { type: 'editMoto'; moto: Moto }
  | { type: 'editService'; service?: TipoServicio }
  | { type: 'confirmReset' };

export default function SettingsView() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [moto, setMoto] = useState<Moto | null>(null);
  const [services, setServices] = useState<TipoServicio[]>([]);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });

  const [editMotoMarca, setEditMotoMarca] = useState('');
  const [editMotoModelo, setEditMotoModelo] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceIcon, setEditServiceIcon] = useState('🔧');
  const [editServiceIntervalKm, setEditServiceIntervalKm] = useState('');
  const [editServiceIntervalDays, setEditServiceIntervalDays] = useState('');
  const [editServiceEnabled, setEditServiceEnabled] = useState(true);

  const refresh = async () => {
    const [motoData, servicesData] = await Promise.all([
      data.getMoto(),
      data.getServices(),
    ]);
    setMoto(motoData);
    setServices(servicesData);
  };

  useEffect(() => {
    refresh();
  }, []);

  function openEditMoto() {
    if (!moto) return;
    setEditMotoMarca(moto.marca);
    setEditMotoModelo(moto.modelo);
    setModalState({ type: 'editMoto', moto });
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

  function openAddService() {
    setEditServiceName('');
    setEditServiceIcon('🔧');
    setEditServiceIntervalKm('');
    setEditServiceIntervalDays('');
    setEditServiceEnabled(true);
    setModalState({ type: 'editService' });
  }

  function openEditService(service: TipoServicio) {
    setEditServiceName(service.name);
    setEditServiceIcon(service.icon);
    setEditServiceIntervalKm(service.intervalKm !== null ? String(service.intervalKm) : '');
    setEditServiceIntervalDays(service.intervalDays !== null ? String(service.intervalDays) : '');
    setEditServiceEnabled(service.enabled);
    setModalState({ type: 'editService', service });
  }

  async function handleSaveService() {
    const name = editServiceName.trim();
    if (!name) {
      showToast('El nombre es requerido', 'danger');
      return;
    }

    const intervalKm = editServiceIntervalKm ? parseInt(editServiceIntervalKm) : null;
    const intervalDays = editServiceIntervalDays ? parseInt(editServiceIntervalDays) : null;

    const serviceData = {
      name,
      icon: editServiceIcon,
      intervalKm,
      intervalDays,
      enabled: editServiceEnabled,
    };

    const currentModal = modalState;
    if (currentModal.type === 'editService' && currentModal.service) {
      await data.updateService(currentModal.service.id, serviceData);
 showToast('Servicio actualizado', 'success');
    } else {
      await data.addService(serviceData);
      showToast('Servicio agregado', 'success');
    }

    await refresh();
    setModalState({ type: 'none' });
  }

  async function handleToggleService() {
    const currentModal = modalState;
    if (currentModal.type !== 'editService' || !currentModal.service) return;

    await data.updateService(currentModal.service.id, {
      enabled: !currentModal.service.enabled,
    });
    await refresh();
    setModalState({ type: 'none' });
    showToast(
      currentModal.service.enabled ? 'Servicio desactivado' : 'Servicio activado',
      'success'
    );
  }

  async function handleDeleteService() {
    const currentModal = modalState;
    if (currentModal.type !== 'editService' || !currentModal.service) return;

    await data.removeService(currentModal.service.id);
    await refresh();
    setModalState({ type: 'none' });
    showToast('Servicio eliminado', 'success');
  }

  async function handleExport() {
    const payload = await data.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `motomaint-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado', 'success');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await data.importAll(payload);
      showToast('Backup importado', 'success');
      router.push('/');
    } catch {
      showToast('Archivo inválido', 'danger');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function openConfirmReset() {
    setModalState({ type: 'confirmReset' });
  }

  async function handleConfirmReset() {
    await data.reset();
    setModalState({ type: 'none' });
    router.push('/');
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
    <div className="settings">
      <header className="top-bar">
        <button
          className="icon-btn back-btn"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1>Ajustes</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="settings-container">
        <section className="settings-section">
          <h2>Tu moto</h2>
          <button className="settings-row" onClick={openEditMoto}>
            <div className="settings-row-info">
              <span className="settings-row-title">{moto.marca} {moto.modelo}</span>
              <span className="settings-row-subtitle">{moto.kmActual.toLocaleString('es-CO')} km</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </section>

        <section className="settings-section">
          <h2>Servicios</h2>
          <div className="service-list">
            {services.map((service) => (
              <ServiceTypeRow
                key={service.id}
                service={service}
                onClick={openEditService}
              />
            ))}
          </div>
          <button className="btn btn-secondary add-service-btn" onClick={openAddService}>
            + Agregar servicio personalizado
          </button>
        </section>

        <section className="settings-section">
          <h2>Backup</h2>
          <button className="btn btn-secondary" onClick={handleExport}>
            Exportar datos
          </button>
          <button className="btn btn-secondary" onClick={handleImportClick}>
            Importar datos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </section>

        <section className="settings-section danger-zone">
          <h2>Zona de peligro</h2>
          <button className="btn btn-danger" onClick={openConfirmReset}>
            Borrar todo y empezar de cero
          </button>
        </section>
      </div>

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

      {modalState.type === 'editService' && (
        <Modal
          title={modalState.service ? 'Editar servicio' : 'Agregar servicio'}
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar', variant: 'btn-primary', onClick: handleSaveService },
          ]}
        >
          <div className="form-group">
            <label htmlFor="service-name">Nombre</label>
            <input
              id="service-name"
              type="text"
              className="input"
              value={editServiceName}
              onChange={(e) => setEditServiceName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Icono</label>
            <IconPicker selected={editServiceIcon} onSelect={setEditServiceIcon} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="service-km">Intervalo km</label>
              <input
                id="service-km"
                type="number"
                className="input"
                value={editServiceIntervalKm}
                onChange={(e) => setEditServiceIntervalKm(e.target.value)}
                min={0}
                placeholder="Ej: 3000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="service-days">Intervalo días</label>
              <input
                id="service-days"
                type="number"
                className="input"
                value={editServiceIntervalDays}
                onChange={(e) => setEditServiceIntervalDays(e.target.value)}
                min={0}
                placeholder="Ej: 30"
              />
            </div>
          </div>

          {modalState.service && (
            <div className="form-group service-toggle">
              <button
                type="button"
                className={`btn ${editServiceEnabled ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setEditServiceEnabled(!editServiceEnabled)}
              >
                {editServiceEnabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          )}
        </Modal>
      )}

      {modalState.type === 'confirmReset' && (
        <ConfirmDialog
          title="Borrar todo"
          message="Se eliminarán la moto, servicios e historial. Esta acción no se puede deshacer."
          confirmLabel="Borrar todo"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleConfirmReset}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}
