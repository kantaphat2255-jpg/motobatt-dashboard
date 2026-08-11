'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useZoneTrend } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import TrendBadge from '@/components/ui/TrendBadge';
import ZoneTrendChart from '@/components/charts/ZoneTrendChart';
import { formatCurrencyShort, formatNumber } from '@/lib/utils';
import type { TrendGranularity } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function ZoneTrendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const granularity: TrendGranularity = searchParams.get('granularity') === 'quarter' ? 'quarter' : 'month';

  const { data, loading, error, refresh } = useZoneTrend(year, granularity);

  const setParams = (nextYear: number, nextGranularity: TrendGranularity) => {
    const p = new URLSearchParams({ year: String(nextYear), granularity: nextGranularity });
    router.push(`/zone-trend?${p.toString()}`);
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F5C400]" />
      <span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center gap-3 p-8 text-red-400">
      <AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span>
    </div>
  );

  const { meta, availableYears, data: trend } = data;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">แนวโน้มดีลเลอร์รายเขต</h1>
          <div className="flex items-center gap-2">
            <select
              value={trend.year}
              onChange={e => setParams(Number(e.target.value), granularity)}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-gray-200 cursor-pointer focus:outline-none focus:border-[#F5C400]/50"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>ปี {y}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-[#2A2A2A] overflow-hidden">
              {(['month', 'quarter'] as TrendGranularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => setParams(trend.year, g)}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    granularity === g
                      ? 'bg-[#F5C400] text-[#0A0B0D] font-semibold'
                      : 'bg-[#1C1C1C] text-gray-400 hover:text-white'
                  }`}
                >
                  {g === 'month' ? 'รายเดือน' : 'รายไตรมาส'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          แนวโน้ม % คำนวณจากค่าเฉลี่ยยอดขายครึ่งหลังเทียบครึ่งแรกของช่วงที่เลือก (เช่น เลือกรายเดือน 8 เดือน = ค่าเฉลี่ย 4 เดือนหลัง เทียบค่าเฉลี่ย 4 เดือนแรก) —
          SKU ขายดีคำนวณจากยอดขายรวมทั้งช่วงที่เลือก
        </p>

        {trend.zones.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">ไม่มีข้อมูลในปีที่เลือก</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trend.zones.map(zone => (
              <div key={zone.zoneId} className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">เขต {zone.zoneId}</p>
                    <p className="text-lg font-bold tabular-nums text-[#F5C400]">{formatCurrencyShort(zone.totalSales)}</p>
                  </div>
                  <TrendBadge pct={zone.trendPct} />
                </div>

                <ZoneTrendChart points={zone.points} />

                <p className="text-xs text-gray-400 mt-2">
                  ดีลเลอร์ที่ซื้อในช่วงนี้: <span className="text-gray-200 tabular-nums">{formatNumber(zone.periodDealerCount)}</span> ราย
                </p>

                <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 mb-1.5">SKU ขายดี Top 3</p>
                  {zone.topSkus.length === 0 ? (
                    <p className="text-xs text-gray-600">ไม่มีข้อมูล</p>
                  ) : (
                    <ul className="space-y-1">
                      {zone.topSkus.map((sku, i) => (
                        <li key={sku.itemId} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-gray-300 truncate">
                            <span className="text-gray-500 mr-1">{i + 1}.</span>{sku.itemDesc}
                          </span>
                          <span className="text-gray-400 tabular-nums shrink-0">{formatNumber(sku.cases, 1)} ลัง</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function ZoneTrendPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <ZoneTrendContent />
    </Suspense>
  );
}
