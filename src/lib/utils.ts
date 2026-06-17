import { THAI_MONTHS_SHORT, THAI_MONTHS_FULL } from './constants';

export function getBangkokDate(date = new Date()): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

export function getCurrentMonthYYYYMM(): string {
  const d = getBangkokDate();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(yyyymm: string, full = false): string {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10) - 1;
  const months = full ? THAI_MONTHS_FULL : THAI_MONTHS_SHORT;
  if (month < 0 || month > 11 || !months[month]) return yyyymm;
  return `${months[month]} ${year}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ฿';
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(2) + ' ล.';
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + ' พ.';
  return formatCurrency(amount);
}

export function formatNumber(n: number, decimals = 0): string {
  if (!isFinite(n)) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPct(pct: number | null, decimals = 1): string {
  if (pct === null) return '-';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function pctColor(pct: number | null): string {
  if (pct === null) return 'text-gray-400';
  if (pct >= 0) return 'text-green-400';
  return 'text-red-400';
}

export function getDaysInMonth(yyyymm: string): number {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return new Date(year, month, 0).getDate();
}

export function shiftMonths(yyyymm: string, delta: number): string {
  let year = parseInt(yyyymm.slice(0, 4), 10);
  let month = parseInt(yyyymm.slice(4, 6), 10) + delta;
  while (month <= 0) { month += 12; year--; }
  while (month > 12) { month -= 12; year++; }
  return `${year}${String(month).padStart(2, '0')}`;
}

export function getPrevMonth(yyyymm: string): string {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  if (month === 1) return `${year - 1}12`;
  return `${year}${String(month - 1).padStart(2, '0')}`;
}

export function getMonthStartEnd(yyyymm: string): { start: Date; end: Date } {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0),
  };
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateThai(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
