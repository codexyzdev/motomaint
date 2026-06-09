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

  return <div className={className}>{toast.message}</div>;
}
