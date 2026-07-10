import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters, filterCoreZones } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateDealerSales } from '@/lib/data/aggregations';
import { yyyymmToRange, defaultRange } from '@/lib/dateRange';
import type { DealerSalesApiResponse } from '@/lib/types';

// Accept either a 'YYYY-MM-DD' date or a legacy 'YYYYMM' month (back-compat links).
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
    const forceRefresh = searchParams.get('refresh') === '1';

    const rawData = await fetchSheetsData(forceRefresh);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows, totalCount } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);

    const baseFiltered = filterCoreZones(applyBaseFilters(parsedRows));
    const { rows: normalizedRows, failedIds } = joinDealerTier(baseFiltered, dealers);

    const availableMonths = [...new Set(normalizedRows.map(r => r.YYYYMM))].sort();
    const latestMonth = availableMonths[availableMonths.length - 1] || '';

    // Data day bounds (INV_DATE is ISO, so string min/max works).
    let minDate = '', maxDate = '';
    for (const r of normalizedRows) {
      if (!minDate || r.INV_DATE < minDate) minDate = r.INV_DATE;
      if (!maxDate || r.INV_DATE > maxDate) maxDate = r.INV_DATE;
    }

    const def = defaultRange(minDate, maxDate);
    const from = normalizeDateParam(searchParams.get('from'), 'from') || def.from;
    const to = normalizeDateParam(searchParams.get('to'), 'to') || def.to;

    const meta = {
      fetchedAt,
      totalRawRows: totalCount,
      validRows: normalizedRows.length,
      invalidRows: totalCount - normalizedRows.length,
      latestMonth,
      tierJoinFailCount: failedIds.length,
      tierJoinFailIds: failedIds,
      availableMonths,
      minDate,
      maxDate,
      rangeFrom: from,
      rangeTo: to,
    };

    const response: DealerSalesApiResponse = {
      meta,
      data: aggregateDealerSales(normalizedRows, from, to),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/analytics/dealer-sales]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', details: message },
      { status: 500 }
    );
  }
}
