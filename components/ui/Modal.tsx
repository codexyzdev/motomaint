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
  children?: React.ReactNode;
  actions?: ModalAction[];
  onClose: () => void;
  dismissible?: boolean;
}

const MAX_ACTIONS = 4;

export default function Modal({
  title,
  subtitle,
  children,
  actions,
  onClose,
  dismissible = true,
}: ModalProps) {
  const handleActionClick = (action: ModalAction) => async () => {
    if (!action.onClick) return;
    const result = await action.onClick();
    if (result === false) return;
    if (dismissible) onClose();
  };

  const renderedActions = actions && actions.length > 0 ? actions.slice(0, MAX_ACTIONS) : null;
  if (actions && actions.length > MAX_ACTIONS) {
    console.warn(`Modal: actions array has ${actions.length} items, truncating to ${MAX_ACTIONS}.`);
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && dismissible && onClose()}>
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
          <DialogPrimitive.Close
            className="modal-close-btn"
            aria-label="Cerrar"
            tabIndex={dismissible ? 0 : -1}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </DialogPrimitive.Close>
          {children}
          {renderedActions && (
            <div className="modal-actions">
              {renderedActions.map((action, index) => (
                <button
                  key={`${action.label}-${index}`}
                  className={cn('btn', action.variant ?? 'btn-primary')}
                  onClick={handleActionClick(action)}
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
