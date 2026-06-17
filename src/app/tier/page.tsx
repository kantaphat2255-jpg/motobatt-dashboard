'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import WarningBanner from '@/components/ui/WarningBanner';
import MonthSelector from '@/components/ui/MonthSelector';
import TierBarChart from '@/components/charts/TierBarChart';
import { formatCurrency, formatNumber, getCurrentMonthYYYYMM } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { TierKnown } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function TierContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultMonth = getCurrentMonthYYYYMM();
  const from = searchParams.get('from') || searchParams.get('month') || defaultMonth;
  const to = searchParams.get('to') || searchParams.get('month') || from;
  const { data, loading, error, refresh } = useDashboard(from, to);

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

  const { tierAnalysis: ta, meta } = data;
  const knownTiers = ta.tiers.filter(t => t.tier !== 'Unknown');
  const unknownTier = ta.tiers.find(t => t.tier === 'Unknown');

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">วิเคราะห์ระดับชั้น (Tier)</h1>
          <MonthSelector availableMonths={meta.availableMonths} from={from} to={to} onChange={(f, t) => router.push(`/tier?from=${f}&to=${t}`)} />
        </div>

        <WarningBanner count={meta.tierJoinFailCount} ids={meta.tierJoinFailIds} />

        {/* Tier Cards */}
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
              <p className="text-xl font-bold tabular-nums">{formatCurrency(t.sales)}</p>
              <p className="text-sm text-gray-400 mt-1 tabular-nums">{t.salesPct.toFixed(1)}% ของยอดรวม</p>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">ดีลเลอร์</p>
                  <p className="text-white font-semibold tabular-nums">{t.dealerCount} ราย</p>
                </div>
                <div>
                  <p className="text-gray-500">เฉลี่ย/ราย</p>
                  <p className="text-white font-semibold tabular-nums">{formatCurrency(t.avgSalesPerDealer)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {unknownTier && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-amber-400 mb-1">ไม่ระบุเทียร์</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(unknownTier.sales)}</p>
            </div>
            <div className="text-sm text-gray-400">
              {unknownTier.dealerCount} ราย — {unknownTier.salesPct.toFixed(1)}% ของยอดรวม
            </div>
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
            การกระจายขนาดคำสั่งซื้อ (เฉลี่ย ลัง/ออเดอร์)
          </h2>
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
