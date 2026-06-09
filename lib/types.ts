export interface Moto {
  marca: string;
  modelo: string;
  kmActual: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface TipoServicio {
  id: string;
  name: string;
  icon: string;
  intervalKm: number | null;
  intervalDays: number | null;
  enabled: boolean;
}

export interface Registro {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  km: number;
  date: string; // ISO 8601
  notes: string;
}

export interface Ajustes {
  currency: string;
  language: string;
  notifications: boolean;
}

export interface ServicioCalculado extends TipoServicio {
  lastRecord: { km: number; date: string } | null;
  kmSinceLast: number | null;
  kmRemaining: number | null;
  kmProgress: number;
  daysSinceLast: number | null;
  daysRemaining: number | null;
  daysProgress: number;
  status: 'ok' | 'warning' | 'urgent';
}

export type ToastType = 'default' | 'success' | 'danger';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
  clear(): Promise<void>;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  moto: Moto | null;
  services: TipoServicio[];
  history: Registro[];
  settings: Ajustes;
}
