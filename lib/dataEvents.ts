const DATA_CHANGED_EVENT = 'motomaint:data-changed';

export function emitDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

export function onDataChanged(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener(DATA_CHANGED_EVENT, callback);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, callback);
  }
  return () => {};
}