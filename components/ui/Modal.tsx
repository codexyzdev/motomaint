'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface ModalAction {
  label: string;
  variant?: 'btn-primary' | 'btn-secondary' | 'btn-danger' | 'btn-ghost';
  onClick?: () => void | Promise<void | boolean>;
}

interface ModalProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: ModalAction[];
  onClose: () => void;
}

export default function Modal({
  title,
  subtitle,
  children,
  actions,
  onClose,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-backdrop" />
        <DialogPrimitive.Content className="modal">
          <div className="modal-handle" />
          <DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title>
          {subtitle && (
            <DialogPrimitive.Description className="modal-subtitle">
              {subtitle}
            </DialogPrimitive.Description>
          )}
          {children}
          {actions && actions.length > 0 && (
            <div className="modal-actions">
              {actions.slice(0, 4).map((action) => (
                <button
                  key={action.label}
                  className={cn('btn', action.variant ?? 'btn-primary')}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
