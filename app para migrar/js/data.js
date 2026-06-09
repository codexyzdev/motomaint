/**
 * ============================================================
 * Data — Modelos y operaciones de dominio
 * ============================================================
 * Esta es la única capa que sabe qué es una "moto" o un
 * "mantenimiento". El resto de la app le pide cosas por nombre
 * y nunca toca la forma del dato crudo.
 * ============================================================
 */

import { storage } from './storage.js';

// ============ Claves de almacenamiento ============
const KEYS = {
  MOTO: 'moto',
  SERVICES: 'serviceTypes',     // tipos de servicio configurados por el usuario
  HISTORY: 'history',            // historial de mantenimientos
  SETTINGS: 'settings',          // ajustes generales
};

// ============ Valores por defecto ============
const DEFAULT_SERVICES = [
  { id: 'oil',       name: 'Cambio de aceite',    icon: '🛢️', intervalKm: 3000, intervalDays: null,  enabled: true },
  { id: 'service',   name: 'Mantenimiento general', icon: '🔧', intervalKm: 5000, intervalDays: null,  enabled: true },
  { id: 'wash',      name: 'Lavada',              icon: '🧼', intervalKm: null,  intervalDays: 7,     enabled: true },
  { id: 'chain',     name: 'Cadena',              icon: '⛓️', intervalKm: 1000, intervalDays: null,  enabled: true },
  { id: 'tire',      name: 'Llantas',             icon: '🛞', intervalKm: 8000, intervalDays: null,  enabled: true },
  { id: 'filter',    name: 'Filtro de aire',      icon: '💨', intervalKm: 6000, intervalDays: null,  enabled: false },
  { id: 'spark',     name: 'Bujía',               icon: '⚡', intervalKm: 10000, intervalDays: null, enabled: false },
  { id: 'brakes',    name: 'Frenos',              icon: '🛑', intervalKm: 15000, intervalDays: null, enabled: false },
];

const DEFAULT_SETTINGS = {
  currency: 'COP',
  language: 'es',
  notifications: false,
};

// ============ API pública ============
export const data = {
  // --- MOTO ---
  async getMoto() {
    return await storage.get(KEYS.MOTO);
  },

  async saveMoto(moto) {
    const current = await this.getMoto();
    const merged = {
      ...(current || {}),
      ...moto,
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set(KEYS.MOTO, merged);
    return merged;
  },

  async updateKm(newKm) {
    const moto = await this.getMoto();
    if (!moto) throw new Error('No hay moto registrada');
    const updated = { ...moto, kmActual: Math.max(0, parseInt(newKm) || 0), updatedAt: new Date().toISOString() };
    await storage.set(KEYS.MOTO, updated);
    return updated;
  },

  // --- SERVICIOS ---
  async getServices() {
    let services = await storage.get(KEYS.SERVICES);
    if (!services || !Array.isArray(services) || services.length === 0) {
      services = DEFAULT_SERVICES;
      await storage.set(KEYS.SERVICES, services);
    }
    return services;
  },

  async saveServices(services) {
    await storage.set(KEYS.SERVICES, services);
    return services;
  },

  async addService(service) {
    const services = await this.getServices();
    const newService = {
      id: 'svc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: service.name || 'Nuevo servicio',
      icon: service.icon || '🔧',
      intervalKm: service.intervalKm || null,
      intervalDays: service.intervalDays || null,
      enabled: service.enabled !== false,
    };
    services.push(newService);
    await this.saveServices(services);
    return newService;
  },

  async updateService(id, patch) {
    const services = await this.getServices();
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Servicio no encontrado');
    services[idx] = { ...services[idx], ...patch };
    await this.saveServices(services);
    return services[idx];
  },

  async removeService(id) {
    const services = await this.getServices();
    const filtered = services.filter(s => s.id !== id);
    await this.saveServices(filtered);
    return filtered;
  },

  // --- HISTORIAL ---
  async getHistory() {
    const history = await storage.get(KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  },

  async addRecord(record) {
    const history = await this.getHistory();
    const newRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      serviceIcon: record.serviceIcon,
      km: parseInt(record.km) || 0,
      date: record.date || new Date().toISOString(),
      notes: record.notes || '',
    };
    history.unshift(newRecord); // más reciente primero
    await storage.set(KEYS.HISTORY, history);
    return newRecord;
  },

  async removeRecord(id) {
    const history = await this.getHistory();
    const filtered = history.filter(r => r.id !== id);
    await storage.set(KEYS.HISTORY, filtered);
    return filtered;
  },

  // --- SETTINGS ---
  async getSettings() {
    return { ...DEFAULT_SETTINGS, ...(await storage.get(KEYS.SETTINGS) || {}) };
  },

  async saveSettings(settings) {
    await storage.set(KEYS.SETTINGS, settings);
    return settings;
  },

  // --- RESET TOTAL ---
  async reset() {
    await storage.clear();
  },

  // --- EXPORTAR (backup) ---
  async exportAll() {
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
  async importAll(payload) {
    if (!payload || payload.version !== 1) throw new Error('Formato de backup inválido');
    if (payload.moto) await storage.set(KEYS.MOTO, payload.moto);
    if (payload.services) await storage.set(KEYS.SERVICES, payload.services);
    if (payload.history) await storage.set(KEYS.HISTORY, payload.history);
    if (payload.settings) await storage.set(KEYS.SETTINGS, payload.settings);
  },
};

export { KEYS, DEFAULT_SERVICES };
