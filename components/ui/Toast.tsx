'use client';

import { useToast } from './useToast';

export default function Toast() {
  const { toast } = useToast();

  const className = [
    'toast',
    toast.visible ? 'show' : '',
    toast.type === 'success' ? 'success' : '',
    toast.type === 'danger' ? 'danger' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role={toast.type === 'danger' ? 'alert' : 'status'}
      aria-live={toast.type === 'danger' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {toast.message}
    </div>
  );
}
