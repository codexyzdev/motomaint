/**
 * ============================================================
 * Data — Modelos y operaciones de dominio
 * ============================================================
 * Única capa que sabe qué es una "moto" o un "mantenimiento".
 * El resto de la app le pide cosas por nombre y nunca toca
 * la forma del dato crudo.
 * ============================================================
 */

import { storage } from './storage';
import { emitDataChanged } from './dataEvents';
import type { Moto, TipoServicio, Registro, Ajustes, BackupPayload } from './types';

// ============ Claves de almacenamiento ============
const KEYS = {
  MOTO: 'moto',
  SERVICES: 'serviceTypes',
  HISTORY: 'history',
  SETTINGS: 'settings',
} as const;

// ============ Valores por defecto ============
const DEFAULT_SERVICES: TipoServicio[] = [
  { id: 'oil',     name: 'Cambio de aceite',      icon: '🛢️', intervalKm: 3000,  intervalDays: null, enabled: true  },
  { id: 'service', name: 'Mantenimiento general',  icon: '🔧', intervalKm: 5000,  intervalDays: null, enabled: true  },
  { id: 'wash',    name: 'Lavada',                 icon: '🧼', intervalKm: null,  intervalDays: 7,    enabled: true  },
  { id: 'chain',   name: 'Cadena',                 icon: '⛓️', intervalKm: 1000,  intervalDays: null, enabled: true  },
  { id: 'tire',    name: 'Llantas',                icon: '🛞', intervalKm: 8000,  intervalDays: null, enabled: true  },
  { id: 'filter',  name: 'Filtro de aire',         icon: '💨', intervalKm: 6000,  intervalDays: null, enabled: false },
  { id: 'spark',   name: 'Bujía',                  icon: '⚡', intervalKm: 10000, intervalDays: null, enabled: false },
  { id: 'brakes',  name: 'Frenos',                 icon: '🛑', intervalKm: 15000, intervalDays: null, enabled: false },
];

const DEFAULT_SETTINGS: Ajustes = {
  currency: 'USD',
  language: 'es',
  notifications: false,
};

// ============ API pública ============
export const data = {
  // --- MOTO ---

  async getMoto(): Promise<Moto | null> {
    return await storage.get<Moto>(KEYS.MOTO);
  },

  async saveMoto(patch: Partial<Moto>): Promise<Moto> {
    const current = await this.getMoto();
    const merged: Moto = {
      ...(current ?? ({} as Moto)),
      ...patch,
      createdAt: current?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set<Moto>(KEYS.MOTO, merged);
    emitDataChanged();
    return merged;
  },

  async updateKm(newKm: number | string): Promise<Moto> {
    const moto = await this.getMoto();
    if (!moto) throw new Error('No hay moto registrada');
    const updated: Moto = {
      ...moto,
      kmActual: Math.max(0, parseInt(String(newKm)) || 0),
      updatedAt: new Date().toISOString(),
    };
    await storage.set<Moto>(KEYS.MOTO, updated);
    emitDataChanged();
    return updated;
  },

  // --- SERVICIOS ---

  async getServices(): Promise<TipoServicio[]> {
    const services = await storage.get<TipoServicio[]>(KEYS.SERVICES);
    if (!services || !Array.isArray(services) || services.length === 0) {
      await storage.set<TipoServicio[]>(KEYS.SERVICES, DEFAULT_SERVICES);
      return DEFAULT_SERVICES;
    }
    return services;
  },

  async saveServices(services: TipoServicio[]): Promise<TipoServicio[]> {
    await storage.set<TipoServicio[]>(KEYS.SERVICES, services);
    emitDataChanged();
    return services;
  },

  async addService(service: Omit<TipoServicio, 'id'>): Promise<TipoServicio> {
    const services = await this.getServices();
    const newService: TipoServicio = {
      ...service,
      id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    services.push(newService);
    await this.saveServices(services);
    emitDataChanged();
    return newService;
  },

  async updateService(id: string, patch: Partial<TipoServicio>): Promise<TipoServicio> {
    const services = await this.getServices();
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Servicio no encontrado');
    services[idx] = { ...services[idx], ...patch };
    await this.saveServices(services);
    return services[idx];
  },

  async removeService(id: string): Promise<TipoServicio[]> {
    const services = await this.getServices();
    const filtered = services.filter(s => s.id !== id);
    await this.saveServices(filtered);
    return filtered;
  },

  // --- HISTORIAL ---

  async getHistory(): Promise<Registro[]> {
    const history = await storage.get<Registro[]>(KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  },

  async addRecord(record: Omit<Registro, 'id'>): Promise<Registro> {
    const history = await this.getHistory();
    const newRecord: Registro = {
      ...record,
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    history.unshift(newRecord); // más reciente primero
    await storage.set<Registro[]>(KEYS.HISTORY, history);
    emitDataChanged();
    return newRecord;
  },

  async removeRecord(id: string): Promise<Registro[]> {
    const history = await this.getHistory();
    const filtered = history.filter(r => r.id !== id);
    await storage.set<Registro[]>(KEYS.HISTORY, filtered);
    emitDataChanged();
    return filtered;
  },

  // --- SETTINGS ---

  async getSettings(): Promise<Ajustes> {
    const stored = await storage.get<Ajustes>(KEYS.SETTINGS);
    if (stored === null) {
      await storage.set<Ajustes>(KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...stored };
  },

  async saveSettings(settings: Ajustes): Promise<Ajustes> {
    await storage.set<Ajustes>(KEYS.SETTINGS, settings);
    emitDataChanged();
    return settings;
  },

  // --- RESET TOTAL ---

  async reset(): Promise<void> {
    await storage.clear();
    emitDataChanged();
  },

  // --- EXPORTAR (backup) ---

  async exportAll(): Promise<BackupPayload> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      moto: await this.getMoto(),
      services: await this.getServices(),
      history: await this.getHistory(),
      settings: await this.getSettings(),
    };
  },

  // --- IMPORTAR (restaurar backup) ---

  async importAll(payload: unknown): Promise<void> {
    if (!payload || (payload as BackupPayload).version !== 1) {
      throw new Error('Formato de backup inválido');
    }
    const p = payload as BackupPayload;
    if (p.moto)     await storage.set<Moto>(KEYS.MOTO, p.moto);
    if (p.services) await storage.set<TipoServicio[]>(KEYS.SERVICES, p.services);
    if (p.history)  await storage.set<Registro[]>(KEYS.HISTORY, p.history);
    if (p.settings) await storage.set<Ajustes>(KEYS.SETTINGS, p.settings);
  },
};

export { KEYS, DEFAULT_SERVICES };
