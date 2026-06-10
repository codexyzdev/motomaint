const SYNC_COMPLETED_EVENT = 'motomaint:sync-completed';

export interface SyncCompletedDetail {
  success: boolean;
  modifiedTime?: string;
  error?: string;
}

export function emitSyncCompleted(detail: SyncCompletedDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_COMPLETED_EVENT, { detail }));
  }
}

export function onSyncCompleted(callback: (detail: SyncCompletedDetail) => void) {
  if (typeof window !== 'undefined') {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SyncCompletedDetail>;
      callback(customEvent.detail);
    };
    window.addEventListener(SYNC_COMPLETED_EVENT, handler);
    return () => window.removeEventListener(SYNC_COMPLETED_EVENT, handler);
  }
  return () => {};
}