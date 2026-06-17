import type { RawDataRow, DealerMaster } from '../types';

const REQUIRED_DATA_COLS = [
  'INV_NO', 'INV_DATE', 'YYYYMM', 'ITEM_ID', 'ITEM_DESC',
  'CATEGORY', 'QTY', 'NET_AMOUNT', 'CUSTOMER_ID', 'CUSTOMER_NAME',
  'SALE_TYPE', 'SALE_TYPE1',
] as const;

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => { map[h.trim()] = i; });
  return map;
}

function parseNum(val: string | undefined): number | null {
  if (val == null || val.trim() === '') return null;
  const n = parseFloat(val.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export function normalizeDataRows(rawRows: string[][]): {
  rows: RawDataRow[];
  invalidCount: number;
  totalCount: number;
} {
  if (rawRows.length === 0) return { rows: [], invalidCount: 0, totalCount: 0 };

  const headers = rawRows[0].map(h => h.trim());
  const headerMap = buildHeaderMap(headers);

  for (const col of REQUIRED_DATA_COLS) {
    if (!(col in headerMap)) {
      throw new Error(`ไม่พบคอลัมน์ที่จำเป็น: ${col}`);
    }
  }

  const rows: RawDataRow[] = [];
  let invalidCount = 0;
  const totalCount = rawRows.length - 1; // exclude header

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    const get = (col: string) => r[headerMap[col]]?.trim() ?? '';

    const qty = parseNum(get('QTY'));
    const netAmount = parseNum(get('NET_AMOUNT'));
    const invNo = get('INV_NO');
    const invDate = get('INV_DATE');
    const yyyymm = get('YYYYMM');
    const customerId = get('CUSTOMER_ID');

    if (qty === null || netAmount === null || !invNo || !invDate || !yyyymm || !customerId) {
      invalidCount++;
      continue;
    }

    rows.push({
      INV_NO: invNo,
      INV_DATE: invDate,
      YYYYMM: yyyymm,
      ITEM_ID: get('ITEM_ID'),
      ITEM_DESC: get('ITEM_DESC'),
      CATEGORY: get('CATEGORY'),
      QTY: qty,
      NET_AMOUNT: netAmount,
      CUSTOMER_ID: customerId,
      CUSTOMER_NAME: get('CUSTOMER_NAME'),
      SALE_TYPE: get('SALE_TYPE'),
      SALE_TYPE1: get('SALE_TYPE1'),
    });
  }

  return { rows, invalidCount, totalCount };
}

const REQUIRED_DEALER_COLS = ['CUSTOMER_ID', 'CUSTOMER_NAME', 'GRADE'] as const;

export function normalizeDealerRows(rawRows: string[][]): DealerMaster[] {
  if (rawRows.length === 0) return [];

  const headers = rawRows[0].map(h => h.trim());
  const headerMap = buildHeaderMap(headers);

  for (const col of REQUIRED_DEALER_COLS) {
    if (!(col in headerMap)) {
      throw new Error(`ไม่พบคอลัมน์ที่จำเป็นในชีต dealer: ${col}`);
    }
  }

  const dealers: DealerMaster[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    const get = (col: string) => {
      const idx = headerMap[col] ?? -1;
      return idx >= 0 ? (r[idx]?.trim() ?? '') : '';
    };

    const customerId = get('CUSTOMER_ID');
    const tier = get('GRADE') as 'A' | 'B' | 'C' | 'D';

    if (customerId && ['A', 'B', 'C', 'D'].includes(tier)) {
      dealers.push({
        CUSTOMER_ID: customerId,
        CUSTOMER_NAME: get('CUSTOMER_NAME'),
        Tier: tier,
      });
    }
  }
  return dealers;
}
