'use client';

import { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ModalAction {
  label: string;
  variant?: 'btn-primary' | 'btn-secondary' | 'btn-danger' | 'btn-ghost';
  onClick?: () => void | Promise<void | boolean>;
}

interface ModalProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: ModalAction[]; // max 4
  onClose: () => void;
}

export default function Modal({
  title,
  subtitle,
  children,
  actions,
  onClose,
}: ModalProps) {
  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // SSR safety: only render portal on the client
  if (typeof window === 'undefined') return null;

  const modal = (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Drag handle */}
        <div className="modal-handle" />

        <h2 id="modal-title">{title}</h2>

        {subtitle && <p className="modal-subtitle">{subtitle}</p>}

        {children}

        {actions && actions.length > 0 && (
          <div className="modal-actions">
            {actions.slice(0, 4).map((action) => (
              <button
                key={action.label}
                className={`btn ${action.variant ?? 'btn-primary'}`}
                onClick={action.onClick}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return ReactDOM.createPortal(modal, document.body);
}
