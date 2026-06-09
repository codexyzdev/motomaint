/**
 * ============================================================
 * Engine — Cálculo de próximos mantenimientos
 * ============================================================
 * Módulo de cómputo puro: no accede a React ni a localStorage
 * directamente. Solo delega en `data.*`.
 * ============================================================
 */

import { data } from './data';
import type { ServicioCalculado } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcula el estado actual de cada TipoServicio habilitado.
 * Retorna un array vacío si no hay moto registrada.
 */
export async function computeServicesStatus(): Promise<ServicioCalculado[]> {
  const [moto, services, history] = await Promise.all([
    data.getMoto(),
    data.getServices(),
    data.getHistory(),
  ]);

  if (!moto) return [];

  const currentKm = moto.kmActual ?? 0;
  const now = Date.now();

  return services
    .filter(s => s.enabled)
    .map(service => {
      // Encontrar el último registro de este servicio (el más reciente por fecha)
      const records = history.filter(r => r.serviceId === service.id);
      const lastRecord =
        records.length > 0
          ? records.reduce((a, b) =>
              new Date(a.date) > new Date(b.date) ? a : b
            )
          : null;

      let kmSinceLast: number | null = null;
      let kmRemaining: number | null = null;
      let kmProgress = 0;

      let daysSinceLast: number | null = null;
      let daysRemaining: number | null = null;
      let daysProgress = 0;

      if (service.intervalKm !== null) {
        const intervalKm = service.intervalKm;
        if (lastRecord !== null) {
          kmSinceLast = currentKm - lastRecord.km;
        } else if (currentKm > 0) {
          // Req 3.4: sin historial, usar km actuales como transcurridos
          kmSinceLast = currentKm;
        }
        if (kmSinceLast !== null) {
          kmRemaining = intervalKm - kmSinceLast;
          kmProgress = Math.max(0, Math.min(1, kmSinceLast / intervalKm));
        }
      }

      if (service.intervalDays !== null) {
        const intervalDays = service.intervalDays;
        if (lastRecord !== null) {
          daysSinceLast = Math.floor(
            (now - new Date(lastRecord.date).getTime()) / DAY_MS
          );
          daysRemaining = intervalDays - daysSinceLast;
          daysProgress = Math.max(0, Math.min(1, daysSinceLast / intervalDays));
        } else {
          // Req 3.4: sin historial con intervalDays → daysRemaining = intervalDays, daysProgress = 0
          daysRemaining = intervalDays;
          daysProgress = 0;
        }
      }

      // Determinar status: urgent > warning > ok
      let status: 'ok' | 'warning' | 'urgent' = 'ok';

      // Colectar progresses/remainings de intervalos configurados
      const configured: Array<{ progress: number; remaining: number | null }> = [];
      if (service.intervalKm !== null) {
        configured.push({ progress: kmProgress, remaining: kmRemaining });
      }
      if (service.intervalDays !== null) {
        configured.push({ progress: daysProgress, remaining: daysRemaining });
      }

      for (const { remaining, progress } of configured) {
        if (remaining !== null && remaining <= 0) {
          status = 'urgent';
          break;
        }
        if (progress >= 0.85) {
          status = 'warning';
        }
      }

      return {
        ...service,
        lastRecord: lastRecord
          ? { km: lastRecord.km, date: lastRecord.date }
          : null,
        kmSinceLast,
        kmRemaining,
        kmProgress,
        daysSinceLast,
        daysRemaining,
        daysProgress,
        status,
      } satisfies ServicioCalculado;
    });
}

/**
 * Formatea el texto de estado legible para un servicio calculado.
 * - Sin intervalos configurados → 'Sin configurar'
 * - urgent  → 'Vencido hace X km' / 'Vencido hace X días'
 * - warning → 'Pronto: X km · Y días'  (solo partes configuradas)
 * - ok      → 'Faltan X km · Y días'   (solo partes configuradas)
 */
export function formatServiceStatus(s: ServicioCalculado): string {
  if (s.intervalKm === null && s.intervalDays === null) {
    return 'Sin configurar';
  }

  // Para urgent, emitir el primer intervalo vencido encontrado
  if (s.status === 'urgent') {
    if (s.intervalKm !== null && s.kmRemaining !== null && s.kmRemaining <= 0) {
      return `Vencido hace ${Math.abs(s.kmRemaining)} km`;
    }
    if (
      s.intervalDays !== null &&
      s.daysRemaining !== null &&
      s.daysRemaining <= 0
    ) {
      return `Vencido hace ${Math.abs(s.daysRemaining)} días`;
    }
  }

  // Construir partes con solo los intervalos configurados
  const parts: string[] = [];

  if (s.intervalKm !== null && s.kmRemaining !== null) {
    if (s.status === 'urgent' && s.kmRemaining <= 0) {
      parts.push(`Vencido hace ${Math.abs(s.kmRemaining)} km`);
    } else {
      parts.push(`${s.kmRemaining} km`);
    }
  }

  if (s.intervalDays !== null && s.daysRemaining !== null) {
    if (s.status === 'urgent' && s.daysRemaining <= 0) {
      parts.push(`Vencido hace ${Math.abs(s.daysRemaining)} días`);
    } else {
      parts.push(`${s.daysRemaining} días`);
    }
  }

  if (parts.length === 0) return 'Sin configurar';

  if (s.status === 'urgent') {
    return parts.join(' · ');
  }
  if (s.status === 'warning') {
    return `Pronto: ${parts.join(' · ')}`;
  }
  return `Faltan ${parts.join(' · ')}`;
}

/**
 * Retorna el progreso principal (el peor entre los intervalos configurados).
 * Valor entre 0 y 1. Retorna 0 si no hay intervalos configurados.
 */
export function getMainProgress(s: ServicioCalculado): number {
  const progresses: number[] = [];
  if (s.intervalKm !== null) progresses.push(s.kmProgress);
  if (s.intervalDays !== null) progresses.push(s.daysProgress);
  return progresses.length > 0 ? Math.max(...progresses) : 0;
}
