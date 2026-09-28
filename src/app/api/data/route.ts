import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters, applyBaseFiltersInclReturns, applyNewDealerFilters, filterCoreZones, filterOnlineZones } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import {
  aggregateMonthlyOverview, aggregateTierAnalysis, aggregateBillSizeDistribution,
  aggregateSkuBreakdown, aggregateBatteryTypes, aggregateOnlineSales, aggregateDealerHealth, aggregateTrend,
} from '@/lib/data/aggregations';
import { yyyymmToRange, defaultRange } from '@/lib/dateRange';
import type { DashboardApiResponse } from '@/lib/types';

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

    const allBatteryDomestic = filterCoreZones(applyNewDealerFilters(parsedRows));
    const baseFiltered = filterCoreZones(applyBaseFilters(parsedRows));
    const { rows: normalizedRows, failedIds } = joinDealerTier(baseFiltered, dealers);

    // Net-of-returns rowset, core zones only, for the opt-in Overview toggle.
    const netFiltered = filterCoreZones(applyBaseFiltersInclReturns(parsedRows));
    const { rows: normalizedNetRows } = joinDealerTier(netFiltered, dealers);

    // Online channels (Lazada/Shopee/TikTok/Facebook): the zones filterCoreZones
    // drops from everything above. Online sales are ALWAYS net of returns (user
    // rule), so only the return-inclusive rowset is built. Online buyers aren't in
    // the dealer master, so their tier-join misses are expected and deliberately
    // kept out of meta.
    const { rows: onlineNetRows } = joinDealerTier(filterOnlineZones(applyBaseFiltersInclReturns(parsedRows)), dealers);

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

    const cfrom = normalizeDateParam(searchParams.get('cfrom'), 'from');
    const cto = normalizeDateParam(searchParams.get('cto'), 'to');
    const hasCompare = !!(cfrom && cto);

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

    const overview = aggregateMonthlyOverview(normalizedRows, from, to, maxDate);
    const overviewCompare = hasCompare ? aggregateMonthlyOverview(normalizedRows, cfrom!, cto!, maxDate) : null;

    // Net-of-returns variant of the same figures. Active-dealer count is
    // pinned back to the gross figure — netting dealer counts against
    // returns was tried and explicitly rejected before, so the toggle only
    // ever changes the ฿/units/cases numbers, never who counts as "active."
    const overviewNet = { ...aggregateMonthlyOverview(normalizedNetRows, from, to, maxDate), activeDealers: overview.activeDealers };
    const overviewNetCompare = hasCompare
      ? { ...aggregateMonthlyOverview(normalizedNetRows, cfrom!, cto!, maxDate), activeDealers: overviewCompare!.activeDealers }
      : null;

    const response: DashboardApiResponse = {
      meta,
      overview,
      overviewCompare,
      overviewNet,
      overviewNetCompare,
      online: aggregateOnlineSales(onlineNetRows, from, to),
      onlineCompare: hasCompare ? aggregateOnlineSales(onlineNetRows, cfrom!, cto!) : null,
      compareRange: hasCompare ? { from: cfrom!, to: cto! } : null,
      tierAnalysis: aggregateTierAnalysis(normalizedRows, from, to, cfrom ?? undefined, cto ?? undefined),
      billSizeDistribution: aggregateBillSizeDistribution(normalizedRows, from, to),
      skuBreakdown: aggregateSkuBreakdown(normalizedRows, from, to),
      batteryTypes: aggregateBatteryTypes(normalizedRows, from, to, { dealerRows: normalizedNetRows, onlineRows: onlineNetRows }),
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
