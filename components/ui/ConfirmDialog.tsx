'use client';

import { useState } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void | boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = loading || internalLoading;

  const handleConfirm = async () => {
    if (isLoading) return;
    setInternalLoading(true);
    try {
      const result = await onConfirm();
      if (result === false) return;
      onCancel();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      title={title}
      subtitle={message}
      onClose={onCancel}
      actions={[
        {
          label: cancelLabel,
          variant: 'btn-ghost',
          onClick: onCancel,
        },
        {
          label: isLoading ? '...' : confirmLabel,
          variant: danger ? 'btn-danger' : 'btn-primary',
          onClick: handleConfirm,
        },
      ]}
    />
  );
}
