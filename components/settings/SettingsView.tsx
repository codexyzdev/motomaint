'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { data } from '@/lib/data';
import type { Moto, TipoServicio } from '@/lib/types';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EditMotoModal from '@/components/ui/EditMotoModal';
import ServiceTypeRow from './ServiceTypeRow';
import IconPicker from './IconPicker';
import { ThemeToggle } from './ThemeToggle';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { SyncStatus } from '@/components/SyncStatus';
import { triggerSyncNow } from '@/lib/globalSync';

const DEFAULT_SERVICE_ICON = '🔧';

type ModalState =
  | { type: 'none' }
  | { type: 'editMoto'; moto: Moto }
  | { type: 'editService'; service?: TipoServicio }
  | { type: 'confirmReset' }
  | { type: 'resetIntent' }
  | { type: 'resetFinal' };

export default function SettingsView() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [moto, setMoto] = useState<Moto | null>(null);
  const [services, setServices] = useState<TipoServicio[]>([]);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [googleConnected, setGoogleConnected] = useState(false);

  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceIcon, setEditServiceIcon] = useState(DEFAULT_SERVICE_ICON);
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
    setModalState({ type: 'editMoto', moto });
  }

  function openAddService() {
    setEditServiceName('');
    setEditServiceIcon(DEFAULT_SERVICE_ICON);
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
      return false;
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
    triggerSyncNow();
  }

  async function handleToggleService() {
    const currentModal = modalState;
    if (currentModal.type !== 'editService' || !currentModal.service) return;

    await data.updateService(currentModal.service.id, {
      enabled: !currentModal.service.enabled,
    });
    await refresh();
    triggerSyncNow();
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
    triggerSyncNow();
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
    setModalState({ type: 'resetIntent' });
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
      <div className="splash" aria-label="Cargando">
        <div className="splash-mark" aria-hidden="true">
          <span style={{ fontSize: '1.5rem' }}>🏍️</span>
        </div>
        <p className="splash-name">MotoMaint</p>
        <span className="splash-tag">Hoja de inspección</span>
      </div>
    );
  }

  return (
    <div className="settings">
      <header className="view-header">
        <div className="view-header-main">
          <div className="view-header-titles">
            <p className="view-eyebrow">Cuaderno · Configuración</p>
            <h1 className="view-title">Ajustes</h1>
          </div>
          <button
            className="icon-btn"
            onClick={() => router.back()}
            aria-label="Volver"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="settings-container">
        <section className="settings-section">
          <h2>Tu moto</h2>
          <button className="settings-row" onClick={openEditMoto} type="button">
            <div className="settings-row-info">
              <span className="settings-row-title">{moto.marca} {moto.modelo}</span>
              <span className="settings-row-subtitle">
                Odómetro · {moto.kmActual.toLocaleString('es-CO')} km
              </span>
            </div>
            <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </section>

        <section className="settings-section">
          <h2>Servicios registrados</h2>
          <div className="service-list">
            {services.length === 0 && (
              <div className="empty" style={{ padding: '28px 18px' }}>
                <div className="empty-icon" aria-hidden="true">⚙</div>
                <p className="empty-text">
                  <b>Sin servicios aún.</b><br />
                  Crea el primero con el botón inferior.
                </p>
              </div>
            )}
            {services.map((service) => (
              <ServiceTypeRow
                key={service.id}
                service={service}
                onClick={openEditService}
              />
            ))}
          </div>
          <button type="button" className="btn btn-secondary add-service-btn" onClick={openAddService}>
            <span style={{ color: 'var(--accent)' }}>+</span> Agregar servicio personalizado
          </button>
        </section>

        <section className="settings-section">
          <h2>Respaldo</h2>
          <button className="btn btn-secondary" onClick={handleExport} type="button">
            Exportar datos · JSON
          </button>
          <button className="btn btn-secondary" onClick={handleImportClick} type="button">
            Importar datos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
            aria-label="Importar archivo de backup"
          />
        </section>

        <section className="settings-section">
          <h2>Google Drive</h2>
          <p className="settings-description">
            Conecta tu cuenta de Google para respaldar tus datos automáticamente en Google Drive.
          </p>
          <GoogleLoginButton key={`auth-${googleConnected}`} onAuthenticated={() => setGoogleConnected(true)} />
          <SyncStatus key={`sync-${googleConnected}`} />
        </section>

        <section className="settings-section danger-zone">
          <h2>Zona de peligro</h2>
          <button className="btn btn-danger" onClick={openConfirmReset} type="button">
            Borrar todo y empezar de cero
          </button>
        </section>
      </div>

      {modalState.type === 'editMoto' && (
        <EditMotoModal
          moto={modalState.moto}
          onClose={closeModal}
          onSaved={async () => {
            await refresh();
            triggerSyncNow();
          }}
        />
      )}

      {modalState.type === 'editService' && (
        <Modal
          eyebrow={modalState.service ? 'Servicio · Editar' : 'Servicio · Nuevo'}
          title={modalState.service ? 'Editar servicio' : 'Agregar servicio'}
          subtitle="Define los intervalos en kilómetros o días. Se usan para calcular el estado."
          folio="F-02D"
          onClose={closeModal}
          actions={[
            { label: 'Cancelar', variant: 'btn-ghost', onClick: closeModal },
            { label: 'Guardar', variant: 'btn-primary', onClick: handleSaveService },
          ]}
        >
          <div className="form-group">
            <label htmlFor="service-name">
              <span>Nombre</span>
            </label>
            <input
              id="service-name"
              type="text"
              className="input"
              value={editServiceName}
              onChange={(e) => setEditServiceName(e.target.value)}
              maxLength={50}
              placeholder="Ej: Cambio de aceite"
            />
          </div>

          <div className="form-group">
            <label htmlFor="icon-picker">Icono</label>
            <IconPicker selected={editServiceIcon} onSelect={setEditServiceIcon} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="service-km">
                <span>Intervalo km</span>
              </label>
              <input
                id="service-km"
                type="number"
                inputMode="numeric"
                className="input"
                value={editServiceIntervalKm}
                onChange={(e) => setEditServiceIntervalKm(e.target.value)}
                min={0}
                placeholder="3000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="service-days">
                <span>Intervalo días</span>
              </label>
              <input
                id="service-days"
                type="number"
                inputMode="numeric"
                className="input"
                value={editServiceIntervalDays}
                onChange={(e) => setEditServiceIntervalDays(e.target.value)}
                min={0}
                placeholder="30"
              />
            </div>
          </div>

          {modalState.service && (
            <div className="form-group service-toggle">
              <button
                type="button"
                className={`btn ${editServiceEnabled ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setEditServiceEnabled(!editServiceEnabled)}
                aria-pressed={editServiceEnabled}
              >
                {editServiceEnabled ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteService}>
                Eliminar
              </button>
            </div>
          )}
        </Modal>
      )}

      {modalState.type === 'resetIntent' && (
        <ConfirmDialog
          eyebrow="Hoja · Reiniciar"
          title="Borrar todo"
          message="Se eliminarán la moto, servicios e historial. Esta acción no se puede deshacer. ¿Deseas continuar?"
          confirmLabel="Sí, continuar"
          cancelLabel="Cancelar"
          danger
          onConfirm={() => {
            setModalState({ type: 'resetFinal' });
          }}
          onCancel={closeModal}
        />
      )}

      {modalState.type === 'resetFinal' && (
        <ConfirmDialog
          eyebrow="Confirmación final"
          title="Última confirmación"
          message="Esta es tu última oportunidad para cancelar. ¿Confirmas que quieres borrar todos los datos?"
          confirmLabel="Borrar definitivamente"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleConfirmReset}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}
