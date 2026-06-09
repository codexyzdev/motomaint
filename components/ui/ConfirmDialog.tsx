'use client';

import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      actions={[
        {
          label: cancelLabel,
          variant: 'btn-ghost',
          onClick: onCancel,
        },
        {
          label: confirmLabel,
          variant: danger ? 'btn-danger' : 'btn-primary',
          onClick: onConfirm,
        },
      ]}
    >
      <p>{message}</p>
    </Modal>
  );
}
