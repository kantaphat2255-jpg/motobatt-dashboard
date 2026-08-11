'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useZoneTrend } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import TrendBadge from '@/components/ui/TrendBadge';
import MetricCard from '@/components/ui/MetricCard';
import ZoneTrendChart from '@/components/charts/ZoneTrendChart';
import { formatCurrency, formatCurrencyShort, formatNumber } from '@/lib/utils';
import type { TrendGranularity, ZoneTrendRow } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function ZoneTrendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const granularity: TrendGranularity = searchParams.get('granularity') === 'quarter' ? 'quarter' : 'month';
  const zoneParam = searchParams.get('zone');

  const { data, loading, error, refresh } = useZoneTrend(year, granularity);

  const setParams = (next: { year?: number; granularity?: TrendGranularity; zone?: string }) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next.year !== undefined) p.set('year', String(next.year));
    if (next.granularity !== undefined) p.set('granularity', next.granularity);
    if (next.zone !== undefined) p.set('zone', next.zone);
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
  const selectedZone: ZoneTrendRow | undefined =
    trend.zones.find(z => z.zoneId === zoneParam) ?? trend.zones[0];
  const avgSalesPerPeriod = selectedZone && selectedZone.points.length > 0
    ? selectedZone.totalSales / selectedZone.points.length
    : 0;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">แนวโน้มดีลเลอร์รายเขต</h1>
          <div className="flex items-center gap-2">
            <select
              value={trend.year}
              onChange={e => setParams({ year: Number(e.target.value) })}
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
                  onClick={() => setParams({ granularity: g })}
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
          เลือกเขตด้านซ้ายเพื่อดูรายละเอียด — แนวโน้ม % คำนวณจากค่าเฉลี่ยยอดขายครึ่งหลังเทียบครึ่งแรกของช่วงที่เลือก
          SKU ขายดีคำนวณจากยอดขายรวมทั้งช่วงที่เลือก
        </p>

        {trend.zones.length === 0 || !selectedZone ? (
          <p className="text-gray-500 text-sm py-8 text-center">ไม่มีข้อมูลในปีที่เลือก</p>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Zone list */}
            <div className="md:w-60 shrink-0">
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                {trend.zones.map(zone => {
                  const active = zone.zoneId === selectedZone.zoneId;
                  return (
                    <button
                      key={zone.zoneId}
                      onClick={() => setParams({ zone: zone.zoneId })}
                      className={`shrink-0 md:shrink text-left rounded-lg border px-3 py-2.5 min-w-[140px] md:min-w-0 md:w-full transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#F5C400]/12 border-[#F5C400]/40'
                          : 'bg-[#17191C] border-[#2A2F36] hover:border-[#3B424C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${active ? 'text-[#F5C400]' : 'text-white'}`}>เขต {zone.zoneId}</span>
                        <TrendBadge pct={zone.trendPct} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{formatCurrencyShort(zone.totalSales)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            <div className="flex-1 min-w-0 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">เขต {selectedZone.zoneId}</h2>
                <TrendBadge pct={selectedZone.trendPct} size="md" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard title="ยอดขายรวม" value={formatCurrencyShort(selectedZone.totalSales)} highlight />
                <MetricCard title="ดีลเลอร์ที่ซื้อในช่วงนี้" value={`${formatNumber(selectedZone.periodDealerCount)} ราย`} />
                <MetricCard title={granularity === 'month' ? 'ยอดขายเฉลี่ย/เดือน' : 'ยอดขายเฉลี่ย/ไตรมาส'} value={formatCurrencyShort(avgSalesPerPeriod)} />
              </div>

              <ZoneTrendChart points={selectedZone.points} height={260} />

              <div>
                <p className="text-xs text-gray-500 mb-2">รายละเอียดต่อ{granularity === 'month' ? 'เดือน' : 'ไตรมาส'}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                        <th className="text-left py-2 pr-3 font-medium">ช่วง</th>
                        <th className="text-right py-2 px-3 font-medium">ยอดขาย</th>
                        <th className="text-right py-2 px-3 font-medium">ดีลเลอร์</th>
                        <th className="text-right py-2 px-3 font-medium">จำนวนหน่วย</th>
                        <th className="text-right py-2 pl-3 font-medium">ลัง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedZone.points.map(p => (
                        <tr key={p.period} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                          <td className="py-2 pr-3 text-white">{p.label}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(p.sales)}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-gray-400">{formatNumber(p.dealerCount)}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(p.units)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-gray-300">{formatNumber(p.cases, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A2A2A]">
                <p className="text-xs text-gray-500 mb-2">SKU ขายดี Top 3 (ทั้งช่วงที่เลือก)</p>
                {selectedZone.topSkus.length === 0 ? (
                  <p className="text-xs text-gray-600">ไม่มีข้อมูล</p>
                ) : (
                  <ul className="space-y-1.5">
                    {selectedZone.topSkus.map((sku, i) => (
                      <li key={sku.itemId} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-300 truncate">
                          <span className="text-gray-500 mr-1.5">{i + 1}.</span>{sku.itemDesc}
                        </span>
                        <span className="text-gray-400 tabular-nums shrink-0">
                          {formatNumber(sku.cases, 1)} ลัง · {formatCurrencyShort(sku.sales)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
