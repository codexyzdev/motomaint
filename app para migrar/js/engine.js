/**
 * ============================================================
 * Engine — Cálculo de próximos mantenimientos
 * ============================================================
 * Dado el estado actual (km actual, historial, configuración),
 * determina cuánto falta para cada servicio.
 * ============================================================
 */

import { data } from './data.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcula el estado actual de cada servicio configurado.
 * @returns {Promise<Array>} Lista de servicios con su estado:
 *   {
 *     ...service,
 *     lastRecord: { km, date } | null,
 *     kmSinceLast: number | null,   // km recorridos desde el último servicio
 *     kmRemaining: number | null,   // km que faltan (negativo = vencido)
 *     kmProgress: number,           // 0..1 (1 = vencido)
 *     daysSinceLast: number | null,
 *     daysRemaining: number | null,
 *     daysProgress: number,
 *     status: 'ok' | 'warning' | 'urgent',
 *   }
 */
export async function computeServicesStatus() {
  const [moto, services, history] = await Promise.all([
    data.getMoto(),
    data.getServices(),
    data.getHistory(),
  ]);

  if (!moto) return [];

  const currentKm = moto.kmActual || 0;
  const now = Date.now();

  return services
    .filter(s => s.enabled)
    .map(service => {
      // Encontrar el último registro de este servicio
      const records = history.filter(r => r.serviceId === service.id);
      const lastRecord = records.length > 0
        ? records.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
        : null;

      let kmSinceLast = null, kmRemaining = null, kmProgress = 0;
      let daysSinceLast = null, daysRemaining = null, daysProgress = 0;

      if (lastRecord) {
        kmSinceLast = currentKm - lastRecord.km;
        if (service.intervalKm) {
          kmRemaining = service.intervalKm - kmSinceLast;
          kmProgress = Math.max(0, Math.min(1, kmSinceLast / service.intervalKm));
        }

        daysSinceLast = Math.floor((now - new Date(lastRecord.date).getTime()) / DAY_MS);
        if (service.intervalDays) {
          daysRemaining = service.intervalDays - daysSinceLast;
          daysProgress = Math.max(0, Math.min(1, daysSinceLast / service.intervalDays));
        }
      } else {
        // Sin historial: si la moto ya tiene km, asumimos que está "vencido" si supera el intervalo
        if (service.intervalKm && currentKm > 0) {
          kmSinceLast = currentKm;
          kmRemaining = service.intervalKm - currentKm;
          kmProgress = Math.max(0, Math.min(1, currentKm / service.intervalKm));
        }
        if (service.intervalDays) {
          daysSinceLast = 9999;
          daysRemaining = service.intervalDays;
          daysProgress = 0;
        }
      }

      // Determinar status (peor de los dos: km o días)
      let status = 'ok';
      const progresses = [];
      if (service.intervalKm) progresses.push({ p: kmProgress, r: kmRemaining });
      if (service.intervalDays) progresses.push({ p: daysProgress, r: daysRemaining });

      for (const { p, r } of progresses) {
        if (r <= 0) { status = 'urgent'; break; }
        if (p >= 0.85) status = status === 'urgent' ? 'urgent' : 'warning';
      }

      return {
        ...service,
        lastRecord,
        kmSinceLast,
        kmRemaining,
        kmProgress,
        daysSinceLast,
        daysRemaining,
        daysProgress,
        status,
      };
    });
}

/**
 * Formatea el texto de estado legible para un servicio.
 */
export function formatServiceStatus(s) {
  if (s.status === 'urgent') {
    if (s.kmRemaining !== null && s.kmRemaining <= 0) return `Vencido hace ${Math.abs(s.kmRemaining).toLocaleString()} km`;
    if (s.daysRemaining !== null && s.daysRemaining <= 0) return `Vencido hace ${Math.abs(s.daysRemaining)} días`;
  }

  const parts = [];
  if (s.kmRemaining !== null) {
    if (s.kmRemaining > 0) parts.push `${s.kmRemaining.toLocaleString()} km`;
  }
  if (s.daysRemaining !== null) {
    if (s.daysRemaining > 0) parts.push(`${s.daysRemaining} días`);
  }

  if (parts.length === 0) return 'Sin configurar';
  if (s.status === 'warning') return `Pronto: ${parts.join(' · ')}`;
  return `Faltan ${parts.join(' · ')}`;
}

/**
 * Calcula el porcentaje de progreso principal (el peor entre km y días).
 */
export function getMainProgress(s) {
  const p = [];
  if (s.intervalKm) p.push(s.kmProgress);
  if (s.intervalDays) p.push(s.daysProgress);
  if (p.length === 0) return 0;
  return Math.max(...p);
}
