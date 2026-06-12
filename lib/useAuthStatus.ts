'use client';

import { useSyncExternalStore } from 'react';
import { getAuthState, subscribeAuthChange, type GoogleAuthState } from './googleAuth';

export function useAuthStatus(): GoogleAuthState {
  return useSyncExternalStore(
    subscribeAuthChange,
    getAuthState,
    () => ({ isAuthenticated: false, hasValidToken: false }),
  );
}
