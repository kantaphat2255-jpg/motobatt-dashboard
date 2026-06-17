import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters, applyReturnFilters } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateReturns } from '@/lib/data/aggregations';
import type { ReturnsApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || null;
    const to = searchParams.get('to') || null;

    const rawData = await fetchSheetsData(false);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);

    const salesFiltered = applyBaseFilters(parsedRows);
    const returnFiltered = applyReturnFilters(parsedRows);

    const { rows: allSalesRows } = joinDealerTier(salesFiltered, dealers);
    const { rows: allReturnRows } = joinDealerTier(returnFiltered, dealers);

    const availableMonths = [...new Set(allSalesRows.map(r => r.YYYYMM))].sort();

    const salesRows = from && to ? allSalesRows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to) : allSalesRows;
    const returnRows = from && to ? allReturnRows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to) : allReturnRows;

    const result = aggregateReturns(returnRows, salesRows);

    const response: ReturnsApiResponse = {
      meta: { fetchedAt, availableMonths },
      ...result,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด', details: message }, { status: 500 });
  }
}
