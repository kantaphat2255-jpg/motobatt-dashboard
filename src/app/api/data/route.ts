import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters, applyNewDealerFilters } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import {
  aggregateMonthlyOverview, aggregateTierAnalysis,
  aggregateSkuBreakdown, aggregateDealerHealth, aggregateTrend,
} from '@/lib/data/aggregations';
import { getCurrentMonthYYYYMM } from '@/lib/utils';
import type { DashboardApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currentMonth = getCurrentMonthYYYYMM();
    const from = searchParams.get('from') || searchParams.get('month') || currentMonth;
    const to = searchParams.get('to') || searchParams.get('month') || currentMonth;
    const forceRefresh = searchParams.get('refresh') === '1';

    const rawData = await fetchSheetsData(forceRefresh);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows, invalidCount, totalCount } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);

    const allBatteryDomestic = applyNewDealerFilters(parsedRows);
    const baseFiltered = applyBaseFilters(parsedRows);
    const { rows: normalizedRows, failedIds } = joinDealerTier(baseFiltered, dealers);

    const availableMonths = [...new Set(normalizedRows.map(r => r.YYYYMM))].sort();
    const latestMonth = availableMonths[availableMonths.length - 1] || '';

    const meta = {
      fetchedAt,
      totalRawRows: totalCount,
      validRows: normalizedRows.length,
      invalidRows: totalCount - normalizedRows.length,
      latestMonth,
      tierJoinFailCount: failedIds.length,
      tierJoinFailIds: failedIds,
      availableMonths,
    };

    const response: DashboardApiResponse = {
      meta,
      overview: aggregateMonthlyOverview(normalizedRows, from, to),
      tierAnalysis: aggregateTierAnalysis(normalizedRows, from, to),
      skuBreakdown: aggregateSkuBreakdown(normalizedRows, from, to),
      dealerHealth: aggregateDealerHealth(normalizedRows, allBatteryDomestic, from, to),
      trend: aggregateTrend(normalizedRows),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/data]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', details: message },
      { status: 500 }
    );
  }
}
