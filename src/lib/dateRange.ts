// Day-level date-range helpers. All dates are ISO 'YYYY-MM-DD' strings.
// Math goes through Date.UTC to avoid local-timezone drift (see plan risk note).
import { getBangkokDate } from './utils';
import { THAI_MONTHS_SHORT } from './constants';

export type Granularity = 'day' | 'month' | 'quarter';

export interface Preset {
  key: string;
  label: string;
  from: string;
  to: string;
  granularity: Granularity;
}

function isoToUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const d = getBangkokDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(iso: string, n: number): string {
  const d = isoToUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToISO(d);
}

/** Days from a to b (b - a); positive when b is after a. Inclusive length = diff + 1. */
export function diffDaysISO(a: string, b: string): number {
  return Math.round((isoToUTC(b).getTime() - isoToUTC(a).getTime()) / 86400000);
}

export function startOfMonthISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Shift by whole months, landing on the 1st. */
export function addMonthsISO(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}-01`;
}

export function endOfMonthISO(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

export function startOfQuarterISO(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const qStart = Math.floor((m - 1) / 3) * 3 + 1;
  return `${y}-${String(qStart).padStart(2, '0')}-01`;
}

export function endOfQuarterISO(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const qEnd = Math.floor((m - 1) / 3) * 3 + 3;
  const last = new Date(Date.UTC(y, qEnd, 0)).getUTCDate();
  return `${y}-${String(qEnd).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/** Week starts Sunday (matches the FB picker layout: อา อ. อ. …). */
export function startOfWeekISO(iso: string): string {
  return addDaysISO(iso, -isoToUTC(iso).getUTCDay());
}

export function endOfWeekISO(iso: string): string {
  return addDaysISO(startOfWeekISO(iso), 6);
}

export function startOfYearISO(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

export function endOfYearISO(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`;
}

export function isoToYYYYMM(iso: string): string {
  return iso.slice(0, 4) + iso.slice(5, 7);
}

/** '202606' -> { from: '2026-06-01', to: '2026-06-30' } (for URL back-compat). */
export function yyyymmToRange(yyyymm: string): { from: string; to: string } {
  const anchor = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`;
  return { from: anchor, to: endOfMonthISO(anchor) };
}

export function formatDateISOThai(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
}

/** Compact human label for the trigger button, e.g. "1 – 6 ก.ค. 2026". */
export function formatDateRangeThai(from: string, to: string): string {
  if (from === to) return formatDateISOThai(from);
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (fy === ty && fm === tm) return `${fd} – ${td} ${THAI_MONTHS_SHORT[tm - 1]} ${ty}`;
  if (fy === ty) return `${fd} ${THAI_MONTHS_SHORT[fm - 1]} – ${td} ${THAI_MONTHS_SHORT[tm - 1]} ${ty}`;
  return `${formatDateISOThai(from)} – ${formatDateISOThai(to)}`;
}

function clampISO(iso: string, min: string, max: string): string {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

/**
 * Presets relative to `today`, clamped to available data [minDate, maxDate].
 * "N วันที่ผ่านมา" = the N complete days ending yesterday, matching FB Ads Manager
 * (e.g. 90 days with today=2026-07-07 -> 2026-04-08 to 2026-07-06).
 */
export function buildPresets(today: string, minDate: string, maxDate: string): Preset[] {
  const yest = addDaysISO(today, -1);
  const prevWeekAnchor = addDaysISO(today, -7);
  const prevMonthAnchor = addDaysISO(startOfMonthISO(today), -1);
  const prevQuarterAnchor = addDaysISO(startOfQuarterISO(today), -1);

  const raw: Preset[] = [
    { key: 'yesterday', label: 'เมื่อวานนี้', from: yest, to: yest, granularity: 'day' },
    { key: 'last7', label: '7 วันที่ผ่านมา', from: addDaysISO(today, -7), to: yest, granularity: 'day' },
    { key: 'last28', label: '28 วันที่ผ่านมา', from: addDaysISO(today, -28), to: yest, granularity: 'day' },
    { key: 'last90', label: '90 วันที่ผ่านมา', from: addDaysISO(today, -90), to: yest, granularity: 'day' },
    { key: 'thisWeek', label: 'สัปดาห์นี้', from: startOfWeekISO(today), to: today, granularity: 'day' },
    { key: 'thisMonth', label: 'เดือนนี้', from: startOfMonthISO(today), to: today, granularity: 'month' },
    { key: 'thisQuarter', label: 'ไตรมาสนี้', from: startOfQuarterISO(today), to: today, granularity: 'quarter' },
    { key: 'thisYear', label: 'ปีนี้', from: startOfYearISO(today), to: today, granularity: 'day' },
    { key: 'lastWeek', label: 'สัปดาห์ที่แล้ว', from: startOfWeekISO(prevWeekAnchor), to: endOfWeekISO(prevWeekAnchor), granularity: 'day' },
    { key: 'lastMonth', label: 'เดือนที่แล้ว', from: startOfMonthISO(prevMonthAnchor), to: endOfMonthISO(prevMonthAnchor), granularity: 'month' },
    { key: 'lastQuarter', label: 'ไตรมาสที่แล้ว', from: startOfQuarterISO(prevQuarterAnchor), to: endOfQuarterISO(prevQuarterAnchor), granularity: 'quarter' },
  ];

  return raw
    .map(p => ({ ...p, from: clampISO(p.from, minDate, maxDate), to: clampISO(p.to, minDate, maxDate) }))
    .filter(p => p.from <= p.to);
}

export function matchPresetKey(presets: Preset[], from: string, to: string): string | null {
  return presets.find(p => p.from === from && p.to === to)?.key ?? null;
}

/** Expand a picked range to whole months/quarters based on the active granularity. */
export function snapRange(from: string, to: string, g: Granularity): { from: string; to: string } {
  if (g === 'month') return { from: startOfMonthISO(from), to: endOfMonthISO(to) };
  if (g === 'quarter') return { from: startOfQuarterISO(from), to: endOfQuarterISO(to) };
  return { from, to };
}

export type CompareMode = 'prevMonth' | 'prevPeriod';

/** Shift by whole months keeping the day-of-month (clamped for short months). */
export function addMonthsPreserveDay(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/**
 * Compare period for [from, to]:
 *  - 'prevMonth'  → same dates one month earlier (useful MoM for this sales data)
 *  - 'prevPeriod' → the equal-length window immediately before the selection
 */
export function compareRangeFor(from: string, to: string, mode: CompareMode): { from: string; to: string } {
  if (mode === 'prevMonth') {
    return { from: addMonthsPreserveDay(from, -1), to: addMonthsPreserveDay(to, -1) };
  }
  const len = diffDaysISO(from, to);
  const prevTo = addDaysISO(from, -1);
  return { from: addDaysISO(prevTo, -len), to: prevTo };
}

/** Initial dashboard range: the latest data month up to the newest data day. */
export function defaultRange(minDate: string, maxDate: string): { from: string; to: string } {
  const from = startOfMonthISO(maxDate);
  return { from: from < minDate ? minDate : from, to: maxDate };
}
