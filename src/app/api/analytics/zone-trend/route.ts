import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateZoneTrend } from '@/lib/data/aggregations';
import type { ZoneTrendApiResponse, TrendGranularity } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === '1';

    const rawData = await fetchSheetsData(forceRefresh);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows, totalCount } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);

    const baseFiltered = applyBaseFilters(parsedRows);
    const { rows: normalizedRows, failedIds } = joinDealerTier(baseFiltered, dealers);

    const availableMonths = [...new Set(normalizedRows.map(r => r.YYYYMM))].sort();
    const latestMonth = availableMonths[availableMonths.length - 1] || '';

    let minDate = '', maxDate = '';
    for (const r of normalizedRows) {
      if (!minDate || r.INV_DATE < minDate) minDate = r.INV_DATE;
      if (!maxDate || r.INV_DATE > maxDate) maxDate = r.INV_DATE;
    }

    const availableYears = [...new Set(availableMonths.map(m => Number(m.slice(0, 4))))].sort((a, b) => a - b);
    const latestYear = availableYears[availableYears.length - 1] ?? new Date().getFullYear();

    const yearParam = Number(searchParams.get('year'));
    const year = availableYears.includes(yearParam) ? yearParam : latestYear;
    const granularity: TrendGranularity = searchParams.get('granularity') === 'quarter' ? 'quarter' : 'month';

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
      rangeFrom: minDate,
      rangeTo: maxDate,
    };

    const response: ZoneTrendApiResponse = {
      meta,
      availableYears,
      data: aggregateZoneTrend(normalizedRows, year, granularity),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/analytics/zone-trend]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', details: message },
      { status: 500 }
    );
  }
}
