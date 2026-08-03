'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useZoneSales } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import DateRangePicker from '@/components/ui/DateRangePicker';
import MetricCard from '@/components/ui/MetricCard';
import TrendBadge from '@/components/ui/TrendBadge';
import ZoneBarChart from '@/components/charts/ZoneBarChart';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { formatDateRangeThai } from '@/lib/dateRange';
import { ONLINE_CHANNEL_COLORS } from '@/lib/constants';
import { Loader2, AlertCircle } from 'lucide-react';

function pctDelta(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

function ZoneSalesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || searchParams.get('month') || undefined;
  const to = searchParams.get('to') || searchParams.get('month') || undefined;
  const cfrom = searchParams.get('cfrom');
  const cto = searchParams.get('cto');
  const { data, loading, error, refresh } = useZoneSales(from, to, cfrom, cto);

  const handleChange = (f: string, t: string, compare: { from: string; to: string } | null) => {
    const p = new URLSearchParams({ from: f, to: t });
    if (compare) { p.set('cfrom', compare.from); p.set('cto', compare.to); }
    router.push(`/zone-sales?${p.toString()}`);
  };

  if (loading) return (
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

  const { meta, data: ds, dataCompare: dc, compareRange } = data;

  const zoneCompareMap = new Map(dc?.zones.map(z => [z.zoneId, z]) ?? []);
  const channelCompareMap = new Map(dc?.onlineChannels.map(c => [c.zoneId, c]) ?? []);
  const totalDelta = pctDelta(ds.totalSales, dc?.totalSales);
  const coreDelta = pctDelta(ds.coreZoneSales, dc?.coreZoneSales);
  const onlineDelta = pctDelta(ds.onlineSales, dc?.onlineSales);
  const otherDelta = pctDelta(ds.otherSales, dc?.otherSales);

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">ยอดขายตามเขต</h1>
          <DateRangePicker
            minDate={meta.minDate}
            maxDate={meta.maxDate}
            from={meta.rangeFrom}
            to={meta.rangeTo}
            compareFrom={compareRange?.from ?? null}
            compareTo={compareRange?.to ?? null}
            onChange={handleChange}
          />
        </div>

        {compareRange && (
          <p className="text-xs text-gray-500">
            เทียบกับ {formatDateRangeThai(compareRange.from, compareRange.to)}
          </p>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="ยอดขายรวม"
            value={formatCurrency(ds.totalSales)}
            badge={dc && <TrendBadge pct={totalDelta} />}
          />
          <MetricCard
            title="เขตหลักที่ดูแล"
            value={formatCurrency(ds.coreZoneSales)}
            subtitle={`${(ds.coreZoneSales / (ds.totalSales || 1) * 100).toFixed(1)}% ของยอดรวม`}
            badge={dc && <TrendBadge pct={coreDelta} />}
            highlight
          />
          <MetricCard
            title="ออนไลน์"
            value={formatCurrency(ds.onlineSales)}
            subtitle={`${ds.onlinePctOfTotal.toFixed(1)}% ของยอดรวม`}
            badge={dc && <TrendBadge pct={onlineDelta} />}
          />
          <MetricCard
            title="อื่นๆ / นอกเขตที่ดูแล"
            value={formatCurrency(ds.otherSales)}
            subtitle={`${(ds.otherSales / (ds.totalSales || 1) * 100).toFixed(1)}% ของยอดรวม`}
            badge={dc && <TrendBadge pct={otherDelta} />}
          />
        </div>

        {/* Core zones */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">เขตหลักที่ดูแล</h2>
          {ds.zones.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">ไม่มีข้อมูลในช่วงที่เลือก</p>
          ) : (
            <>
              <ZoneBarChart zones={ds.zones} />
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                      <th className="text-left py-2 pr-3 font-medium">เขต</th>
                      <th className="text-right py-2 px-3 font-medium">ยอดขาย</th>
                      <th className="text-right py-2 px-3 font-medium">% ของรวม</th>
                      <th className="text-right py-2 px-3 font-medium">จำนวนหน่วย</th>
                      <th className="text-right py-2 px-3 font-medium">ลัง</th>
                      <th className="text-right py-2 px-3 font-medium">ดีลเลอร์</th>
                      <th className="text-right py-2 px-3 font-medium">บิล</th>
                      {dc && <th className="text-right py-2 pl-3 font-medium">เทียบช่วงก่อน</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ds.zones.map(z => (
                      <tr key={z.zoneId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                        <td className="py-2 pr-3 text-white tabular-nums">{z.zoneId}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(z.sales)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-400">{z.salesPct.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(z.units)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(z.cases, 1)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-400">{z.dealerCount}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-400">{z.invoiceCount}</td>
                        {dc && (
                          <td className="py-2 pl-3 text-right">
                            <TrendBadge pct={pctDelta(z.sales, zoneCompareMap.get(z.zoneId)?.sales)} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Online channels */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ช่องทางออนไลน์</h2>
          {ds.onlineChannels.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">ไม่มียอดขายออนไลน์ในช่วงที่เลือก</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ds.onlineChannels.map(c => (
                <div
                  key={c.zoneId}
                  className="bg-[#17191C] border border-[#2A2A2A] rounded-xl p-4"
                  style={{ borderLeftColor: ONLINE_CHANNEL_COLORS[c.channel] ?? '#6B7280', borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide" style={{ color: ONLINE_CHANNEL_COLORS[c.channel] ?? '#9CA3AF' }}>
                      {c.channel}
                    </p>
                    {dc && <TrendBadge pct={pctDelta(c.sales, channelCompareMap.get(c.zoneId)?.sales)} />}
                  </div>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(c.sales)}</p>
                  <p className="text-sm text-gray-400 mt-1 tabular-nums">{c.salesPct.toFixed(1)}% ของยอดรวม</p>
                  <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">ผู้ซื้อ</p>
                      <p className="text-white font-semibold tabular-nums">{formatNumber(c.buyerCount)} ราย</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ออเดอร์</p>
                      <p className="text-white font-semibold tabular-nums">{formatNumber(c.orderCount)} ครั้ง</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 tabular-nums">
                    {formatNumber(c.cases, 1)} ลัง · {formatNumber(c.units)} ก้อน
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600">
          หมายเหตุ: เขต 40-70 เป็นพื้นที่ดูแลของทีมอื่น ไม่รวมในตัวเลข &quot;เขตหลักที่ดูแล&quot; ด้านบน —
          ดูยอดของเขตเหล่านั้นได้ที่การ์ด &quot;อื่นๆ / นอกเขตที่ดูแล&quot;
        </p>
      </div>
    </>
  );
}

export default function ZoneSalesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <ZoneSalesContent />
    </Suspense>
  );
}
