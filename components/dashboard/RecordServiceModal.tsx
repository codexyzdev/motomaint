'use client';

import { useId } from 'react';
import type { TipoServicio } from '@/lib/types';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';

const MAX_NOTES_LENGTH = 500;

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

export default function RecordServiceModal({
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
