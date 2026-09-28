'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import WarningBanner from '@/components/ui/WarningBanner';
import DateRangePicker from '@/components/ui/DateRangePicker';
import TrendBadge from '@/components/ui/TrendBadge';
import TierBarChart from '@/components/charts/TierBarChart';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { formatDateRangeThai } from '@/lib/dateRange';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { TierKnown } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function TierContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || searchParams.get('month') || undefined;
  const to = searchParams.get('to') || searchParams.get('month') || undefined;
  const cfrom = searchParams.get('cfrom');
  const cto = searchParams.get('cto');
  const { data, loading, error, refresh } = useDashboard(from, to, cfrom, cto);

  const handleChange = (f: string, t: string, compare: { from: string; to: string } | null) => {
    const p = new URLSearchParams({ from: f, to: t });
    if (compare) { p.set('cfrom', compare.from); p.set('cto', compare.to); }
    router.push(`/tier?${p.toString()}`);
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

  const { tierAnalysis: ta, billSizeDistribution: bs, meta, compareRange } = data;
  const knownTiers = ta.tiers.filter(t => t.tier !== 'Unknown');
  const unknownTier = ta.tiers.find(t => t.tier === 'Unknown');
  const compareLabel = compareRange
    ? `เทียบ ${formatDateRangeThai(compareRange.from, compareRange.to)}`
    : 'เทียบเดือนก่อน';

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">วิเคราะห์ระดับชั้น (Tier)</h1>
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

        <WarningBanner count={meta.tierJoinFailCount} ids={meta.tierJoinFailIds} />

        {/* Tier Cards */}
        <p className="text-xs text-gray-500">{compareLabel}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {knownTiers.map(t => (
            <div
              key={t.tier}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4"
              style={{ borderLeftColor: TIER_COLORS[t.tier], borderLeftWidth: 3 }}
            >
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide" style={{ color: TIER_COLORS[t.tier] }}>
                {TIER_LABELS[t.tier]}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold tabular-nums">{formatCurrency(t.sales)}</p>
                <TrendBadge pct={t.salesMomPct} />
              </div>
              <p className="text-sm text-gray-400 mt-1 tabular-nums">{t.salesPct.toFixed(1)}% ของยอดรวม</p>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">ดีลเลอร์</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold tabular-nums">{t.dealerCount} ราย</p>
                    <TrendBadge pct={t.dealerCountMomPct} />
                  </div>
                </div>
                <div>
                  <p className="text-gray-500">เฉลี่ย/ราย</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold tabular-nums">{formatCurrency(t.avgSalesPerDealer)}</p>
                    <TrendBadge pct={t.avgMomPct} />
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-3 pt-1">
                  <span className="text-gray-500">
                    ต่ำกว่าเฉลี่ย <span className="text-red-400 font-semibold tabular-nums">{t.belowAvgCount}</span> ราย
                  </span>
                  <span className="text-gray-500">
                    สูงกว่าเฉลี่ย <span className="text-green-400 font-semibold tabular-nums">{t.aboveAvgCount}</span> ราย
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {unknownTier && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-amber-400 mb-1">ไม่ระบุเทียร์</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(unknownTier.sales)}</p>
              </div>
              <div className="text-sm text-gray-400">
                {unknownTier.dealerCount} ราย — {unknownTier.salesPct.toFixed(1)}% ของยอดรวม
              </div>
            </div>
            {ta.unknownDealers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-500/20">
                <p className="text-xs text-gray-400 mb-2">รายชื่อร้านที่ยังไม่ระบุเทียร์ในช่วงนี้:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left py-1 pr-4 font-medium">รหัส</th>
                        <th className="text-left py-1 pr-4 font-medium">ชื่อร้าน</th>
                        <th className="text-right py-1 pl-4 font-medium">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ta.unknownDealers.map(d => (
                        <tr key={d.customerId} className="border-t border-amber-500/10">
                          <td className="py-1.5 pr-4 text-gray-400 tabular-nums text-xs whitespace-nowrap">{d.customerId}</td>
                          <td className="py-1.5 pr-4 text-white whitespace-nowrap">{d.customerName || '—'}</td>
                          <td className="py-1.5 pl-4 text-right text-gray-300 tabular-nums">{formatCurrency(d.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bar Chart */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ยอดขายแยกตามเทียร์</h2>
          <TierBarChart tiers={ta.tiers} />
        </div>

        {/* Order Size Distribution */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            การกระจายขนาดการซื้อต่อร้าน (เฉลี่ยลัง/เดือนที่ซื้อจริง)
          </h2>
          <p className="text-xs text-gray-500 -mt-3 mb-4">
            คิดจากยอดลังรวม ÷ จำนวนเดือนที่ร้านนั้นมีการซื้อจริงในช่วงที่เลือก — เลือกช่วงยาวกว่า 1 เดือน (เช่นไตรมาส) ก็ยังสะท้อนขนาดกองที่ซื้อต่อครั้งได้ถูกต้อง
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium text-xs whitespace-nowrap">ขนาด (ลัง)</th>
                  {(['A', 'B', 'C', 'D'] as TierKnown[]).map(t => (
                    <th key={t} className="text-center py-2 px-3 text-xs font-medium whitespace-nowrap"
                      style={{ color: TIER_COLORS[t] }}>
                      {TIER_LABELS[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ta.orderSizeDistribution.map(row => {
                  const hasData = Object.values(row.counts).some(v => v && v > 0);
                  if (!hasData) return null;
                  return (
                    <tr key={row.label} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                      <td className="py-2 pr-4 text-gray-300 tabular-nums text-xs whitespace-nowrap">{row.label}</td>
                      {(['A', 'B', 'C', 'D'] as TierKnown[]).map(t => (
                        <td key={t} className="py-2 px-3 text-center tabular-nums text-xs">
                          {row.counts[t] ? (
                            <span>
                              <span className="text-white font-medium">{row.counts[t]}</span>
                              <span className="text-gray-500 ml-1">({(row.pcts[t] ?? 0).toFixed(0)}%)</span>
                            </span>
                          ) : <span className="text-gray-700">-</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill Size Distribution */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            สัดส่วนขนาดบิล (฿ ต่อบิล) — กำลังซื้อต่อบิล
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium text-xs whitespace-nowrap">ขนาดบิล (฿)</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium text-xs whitespace-nowrap">จำนวนบิล</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium text-xs whitespace-nowrap">ยอดรวม</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium text-xs whitespace-nowrap">% ของยอด</th>
                  <th className="text-right py-2 pl-3 text-gray-400 font-medium text-xs whitespace-nowrap">เฉลี่ย/บิล</th>
                </tr>
              </thead>
              <tbody>
                {bs.buckets.map(row => (
                  <tr key={row.label} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-4 text-gray-300 tabular-nums text-xs whitespace-nowrap">฿{row.label}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs text-white">
                      {row.invoiceCount} <span className="text-gray-500">({row.invoiceCountPct.toFixed(1)}%)</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs text-white font-medium">{formatCurrency(row.sales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs text-gray-300">{row.salesPct.toFixed(1)}%</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-xs text-gray-300">{formatCurrency(row.avgPerInvoice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            รวม {formatNumber(bs.totalInvoices)} บิล — {formatCurrency(bs.totalSales)}
          </p>
        </div>
      </div>
    </>
  );
}

export default function TierPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <TierContent />
    </Suspense>
  );
}
