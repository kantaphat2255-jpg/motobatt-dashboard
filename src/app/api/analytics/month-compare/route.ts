import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateMonthCompare } from '@/lib/data/aggregations';
import { getCurrentMonthYYYYMM, shiftMonths } from '@/lib/utils';
import type { MonthCompareApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currentMonth = getCurrentMonthYYYYMM();
    const base = searchParams.get('base') || shiftMonths(currentMonth, -1);
    const compare = searchParams.get('compare') || currentMonth;
    const forceRefresh = searchParams.get('refresh') === '1';

    const rawData = await fetchSheetsData(forceRefresh);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);
    const baseFiltered = applyBaseFilters(parsedRows);
    const { rows: normalizedRows } = joinDealerTier(baseFiltered, dealers);

    const availableMonths = [...new Set(normalizedRows.map(r => r.YYYYMM))].sort();

    const response: MonthCompareApiResponse = {
      meta: { fetchedAt, availableMonths },
      data: aggregateMonthCompare(normalizedRows, base, compare),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/analytics/month-compare]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', details: message },
      { status: 500 }
    );
  }
}
