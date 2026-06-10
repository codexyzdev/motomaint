const listeners: Set<(authenticated: boolean) => void> = new Set();

export function notifyAuthChange(authenticated: boolean) {
  listeners.forEach((listener) => listener(authenticated));
}

export function subscribeAuthChange(listener: (authenticated: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}