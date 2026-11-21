/**
 * Mad Max Gym — Currency, BIR 12% VAT-Inclusive & Date/Time Formatters
 */

const PHP_FORMATTER = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Round a numeric value to 2 decimal places accurately.
 */
export function round2(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format a numeric amount as Philippine Peso (`₱1,500.00`).
 */
export function formatPHP(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '₱0.00';
  const sign = num < 0 ? '-' : '';
  return `${sign}₱${PHP_FORMATTER.format(Math.abs(num))}`;
}

/**
 * Philippine BIR 12% VAT-Inclusive Calculator.
 * Menu/plan prices are tax-inclusive:
 *   discountAmount = grossTotal * (discountPct / 100)
 *   netTotal       = grossTotal - discountAmount
 *   vatableSales   = netTotal / 1.12
 *   vatAmount      = netTotal - vatableSales
 */
export function calculateBirVat(total, discountPct = 0) {
  const grossTotal = Math.max(0, round2(total));
  const clampedPct = Math.min(100, Math.max(0, Number(discountPct) || 0));
  const discountAmount = round2(grossTotal * (clampedPct / 100));
  const netTotal = Math.max(0, round2(grossTotal - discountAmount));
  const vatableSales = round2(netTotal / 1.12);
  const vatAmount = round2(netTotal - vatableSales);

  return {
    grossTotal,
    discountPct: clampedPct,
    discountAmount,
    netTotal,
    vatableSales,
    vatAmount,
  };
}

/**
 * Format an ISO date or Date instance as e.g. "Nov 21, 2026".
 */
export function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format an ISO timestamp or Date instance as e.g. "04:15 PM".
 */
export function formatTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format an ISO timestamp or Date instance as e.g. "Nov 21, 2026, 04:15 PM".
 */
export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Compute whole calendar days remaining until an end date.
 */
export function getDaysRemaining(endDate) {
  if (!endDate) return null;
  const target = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default {
  round2,
  formatPHP,
  calculateBirVat,
  formatDate,
  formatTime,
  formatDateTime,
  getDaysRemaining,
};
