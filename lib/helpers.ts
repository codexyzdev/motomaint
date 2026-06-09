/**
 * Format a date ISO string as a relative Spanish label.
 *
 * Returns:
 *  - 'Hoy'         if the date is today (same year, month, day in local timezone)
 *  - 'Ayer'        if the date is yesterday
 *  - 'Hace N días' for N in [2–6] days ago
 *  - locale date string (es-CO) for anything older
 *  - ''            for invalid ISO input
 */
export function formatDate(iso: string): string {
  if (!iso) return '';

  const date = new Date(iso);

  // Check for invalid date
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // Midnight of today in local timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Midnight of the input date in local timezone
  const inputDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = today.getTime() - inputDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays >= 2 && diffDays <= 6) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-CO');
}

/**
 * Format a number with thousand separators using the es-CO locale
 * (uses '.' as the thousands separator, e.g. 1000 → '1.000').
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n);
}
