import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters, applyReturnFilters, filterCoreZones } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateReturns } from '@/lib/data/aggregations';
import { yyyymmToRange } from '@/lib/dateRange';
import type { ReturnsApiResponse } from '@/lib/types';

// Accept 'YYYY-MM-DD' or legacy 'YYYYMM' (back-compat).
function normalizeDateParam(value: string | null, edge: 'from' | 'to'): string | null {
  if (!value) return null;
  if (/^\d{6}$/.test(value)) {
    const r = yyyymmToRange(value);
    return edge === 'from' ? r.from : r.to;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = normalizeDateParam(searchParams.get('from'), 'from');
    const to = normalizeDateParam(searchParams.get('to'), 'to');

    const rawData = await fetchSheetsData(false);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);

    const salesFiltered = filterCoreZones(applyBaseFilters(parsedRows));
    const returnFiltered = filterCoreZones(applyReturnFilters(parsedRows));

    const { rows: allSalesRows } = joinDealerTier(salesFiltered, dealers);
    const { rows: allReturnRows } = joinDealerTier(returnFiltered, dealers);

    const availableMonths = [...new Set(allSalesRows.map(r => r.YYYYMM))].sort();
    let minDate = '', maxDate = '';
    for (const r of allSalesRows) {
      if (!minDate || r.INV_DATE < minDate) minDate = r.INV_DATE;
      if (!maxDate || r.INV_DATE > maxDate) maxDate = r.INV_DATE;
    }

    const salesRows = from && to ? allSalesRows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to) : allSalesRows;
    const returnRows = from && to ? allReturnRows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to) : allReturnRows;

    const result = aggregateReturns(returnRows, salesRows);

    const response: ReturnsApiResponse = {
      meta: { fetchedAt, availableMonths, minDate, maxDate },
      ...result,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด', details: message }, { status: 500 });
  }
}
