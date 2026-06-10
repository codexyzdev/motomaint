'use client';

import { useEffect } from 'react';
import { initAutoSync } from '@/lib/globalSync';

export function SyncProvider() {
  useEffect(() => {
    initAutoSync();
  }, []);

  return null;
}