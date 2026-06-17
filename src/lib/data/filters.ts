import type { RawDataRow } from '../types';
import { DATA_START_YYYYMM } from '../constants';

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
