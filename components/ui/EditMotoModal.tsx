'use client';

import { useState, useId } from 'react';
import Modal from './Modal';
import { useToast } from './useToast';
import { data } from '@/lib/data';
import type { Moto } from '@/lib/types';

interface EditMotoModalProps {
  moto: Moto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function EditMotoModal({ moto, onClose, onSaved }: EditMotoModalProps) {
  const { showToast } = useToast();
  const idPrefix = useId();
  const [marca, setMarca] = useState(moto.marca);
  const [modelo, setModelo] = useState(moto.modelo);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedMarca = marca.trim();
    const trimmedModelo = modelo.trim();
    if (!trimmedMarca || !trimmedModelo) {
      showToast('Marca y modelo son requeridos', 'danger');
      return false;
    }
    setSaving(true);
    try {
      await data.saveMoto({ marca: trimmedMarca, modelo: trimmedModelo });
      await onSaved();
      showToast('Moto actualizada', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Editar moto"
      onClose={onClose}
      actions={[
        { label: 'Cancelar', variant: 'btn-ghost', onClick: onClose },
        {
          label: saving ? 'Guardando...' : 'Guardar',
          variant: 'btn-primary',
          onClick: handleSave,
        },
      ]}
    >
      <div className="form-group">
        <label htmlFor={`${idPrefix}-marca`}>Marca</label>
        <input
          id={`${idPrefix}-marca`}
          type="text"
          className="input"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          maxLength={50}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-modelo`}>Modelo</label>
        <input
          id={`${idPrefix}-modelo`}
          type="text"
          className="input"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          maxLength={50}
        />
      </div>
    </Modal>
  );
}
