/**
 * ============================================================
 * Storage — Capa de abstracción de persistencia
 * ============================================================
 *
 * AHORA: LocalStorage (gratis, sin backend, sin login)
 * DESPUÉS: solo cambias este archivo por otro que implemente
 *          la misma interfaz (Supabase, Firebase, REST API, etc.)
 *
 * INTERFAZ QUE TODA DB DEBE CUMPLIR:
 *
 *   await storage.get(key)                  -> value | null
 *   await storage.set(key, value)           -> void
 *   await storage.remove(key)               -> void
 *   await storage.getAll()                  -> { [key]: value }
 *   await storage.clear()                   -> void
 *
 * El resto de la app NUNCA toca LocalStorage directo.
 * Solo usa `storage.get(...)` / `storage.set(...)`.
 * ============================================================
 */

const STORAGE_PREFIX = 'motomaint:';

const LocalStorageAdapter = {
  name: 'localStorage',

  async get(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      console.error(`[storage.get:${key}]`, err);
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.error(`[storage.set:${key}]`, err);
      throw err;
    }
  },

  async remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  async getAll() {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) {
        const shortKey = fullKey.slice(STORAGE_PREFIX.length);
        result[shortKey] = await this.get(shortKey);
      }
    }
    return result;
  },

  async clear() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};

/**
 * EJEMPLO de cómo se vería un futuro adapter de Supabase:
 *
 * const SupabaseAdapter = {
 *   name: 'supabase',
 *   client: null,
 *   init() { this.client = createClient(URL, KEY); },
 *   async get(key) {
 *     const { data } = await this.client.from('kv').select('value').eq('key', key).single();
 *     return data?.value ?? null;
 *   },
 *   async set(key, value) {
 *     await this.client.from('kv').upsert({ key, value });
 *   },
 *   // ... resto de métodos con la misma firma
 * };
 *
 * const storage = SupabaseAdapter;  // ← cambiar UNA línea y listo
 */

export const storage = LocalStorageAdapter;
export { LocalStorageAdapter, STORAGE_PREFIX };
