import type { StorageAdapter } from './types';

const STORAGE_PREFIX = 'motomaint:';

function prefixedKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export const storage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(prefixedKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[storage] get("${key}") failed:`, err);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(prefixedKey(key), JSON.stringify(value));
    } catch (err) {
      console.error(`[storage] set("${key}") failed:`, err);
      throw err;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(prefixedKey(key));
    } catch (err) {
      console.error(`[storage] remove("${key}") failed:`, err);
      throw err;
    }
  },

  async getAll(): Promise<Record<string, unknown>> {
    try {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey === null || !fullKey.startsWith(STORAGE_PREFIX)) continue;
        const key = fullKey.slice(STORAGE_PREFIX.length);
        const raw = localStorage.getItem(fullKey);
        if (raw !== null) {
          try {
            result[key] = JSON.parse(raw);
          } catch {
            result[key] = raw;
          }
        }
      }
      return result;
    } catch (err) {
      console.error('[storage] getAll() failed:', err);
      throw err;
    }
  },

  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey !== null && fullKey.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(fullKey);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error('[storage] clear() failed:', err);
      throw err;
    }
  },
};
