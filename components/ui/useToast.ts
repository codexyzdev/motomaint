'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ToastType } from '@/lib/types';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  showToast(message: string, type?: ToastType, duration?: number): void;
  toast: ToastState;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'default',
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'default', duration: number = 2500) => {
      // Clamp duration between 500 and 10000 ms
      const clampedDuration = Math.max(500, Math.min(10000, duration));
      // Truncate message to 120 characters
      const truncatedMessage = message.slice(0, 120);

      // Clear any existing timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      setToast({ message: truncatedMessage, type, visible: true });

      timerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
        timerRef.current = null;
      }, clampedDuration);
    },
    [],
  );

  return React.createElement(
    ToastContext.Provider,
    { value: { showToast, toast } },
    children,
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
