import type { RawDataRow } from '../types';
import { DATA_START_YYYYMM, EXCLUDED_ZONE_IDS } from '../constants';

export function applyBaseFilters(rows: RawDataRow[]): RawDataRow[] {
  return rows.filter(r => {
    if (r.CATEGORY !== 'แบตเตอรี่') return false;
    if (r.SALE_TYPE !== 'ในประเทศ') return false;
    if (parseInt(r.YYYYMM, 10) < DATA_START_YYYYMM) return false;
    if (r.QTY <= 0) return false;
    if (r.NET_AMOUNT <= 0) return false;
    return true;
  });
}

// Excludes online marketplace channels (Lazada/Shopee/TikTok) and the 40-70
// out-of-scope zone from every "core business" aggregation. The Zone Sales
// page intentionally does NOT call this — it exists to show these zones.
export function filterCoreZones(rows: RawDataRow[]): RawDataRow[] {
  return rows.filter(r => !EXCLUDED_ZONE_IDS.includes(r.ZONE_ID));
}

// For new dealer detection: battery + domestic only, no YYYYMM cutoff, includes 2023+
export function applyNewDealerFilters(rows: RawDataRow[]): RawDataRow[] {
  return rows.filter(r => {
    if (r.CATEGORY !== 'แบตเตอรี่') return false;
    if (r.SALE_TYPE !== 'ในประเทศ') return false;
    if (r.QTY <= 0) return false;
    if (r.NET_AMOUNT <= 0) return false;
    return true;
  });
}

// Returns/claims: battery + domestic, negative QTY or NET_AMOUNT
export function applyReturnFilters(rows: RawDataRow[]): RawDataRow[] {
  return rows.filter(r => {
    if (r.CATEGORY !== 'แบตเตอรี่') return false;
    if (r.SALE_TYPE !== 'ในประเทศ') return false;
    if (parseInt(r.YYYYMM, 10) < DATA_START_YYYYMM) return false;
    if (r.QTY >= 0 && r.NET_AMOUNT >= 0) return false;
    return true;
  });
}
