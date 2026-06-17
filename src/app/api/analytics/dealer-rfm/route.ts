import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetsData, getCacheTimestamp } from '@/lib/sheets';
import { normalizeDataRows, normalizeDealerRows } from '@/lib/data/normalize';
import { applyBaseFilters } from '@/lib/data/filters';
import { joinDealerTier } from '@/lib/data/join';
import { aggregateDealerRfm } from '@/lib/data/aggregations';
import type { DealerRfmApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1';

    const rawData = await fetchSheetsData(forceRefresh);
    const fetchedAt = new Date(getCacheTimestamp() ?? Date.now()).toISOString();

    const { rows: parsedRows } = normalizeDataRows(rawData.dataRows);
    const dealers = normalizeDealerRows(rawData.dealerRows);
    const baseFiltered = applyBaseFilters(parsedRows);
    const { rows: normalizedRows } = joinDealerTier(baseFiltered, dealers);

    const availableMonths = [...new Set(normalizedRows.map(r => r.YYYYMM))].sort();
    const { dealers: rfmDealers, segmentCounts } = aggregateDealerRfm(normalizedRows);

    const response: DealerRfmApiResponse = {
      meta: { fetchedAt, availableMonths },
      dealers: rfmDealers,
      segmentCounts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/analytics/dealer-rfm]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', details: message },
      { status: 500 }
    );
  }
}
