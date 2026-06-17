'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import MonthSelector from '@/components/ui/MonthSelector';
import MetricCard from '@/components/ui/MetricCard';
import WarningBanner from '@/components/ui/WarningBanner';
import { formatCurrency, formatNumber, formatDateThai, getCurrentMonthYYYYMM } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { DealerInfo, DealerSkuSummary } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: (TIER_COLORS[tier] ?? '#6B7280') + '22', color: TIER_COLORS[tier] ?? '#6B7280' }}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

function SkuChips({ skus }: { skus: DealerSkuSummary[] }) {
  if (skus.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {skus.map(s => (
        <span
          key={s.itemId}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#2A2A2A] text-gray-300 border border-[#333]"
        >
          <span className="text-gray-300">{s.itemDesc}</span>
          <span className="text-[#F5C400] font-medium tabular-nums">{formatNumber(s.cases, 1)} ลัง</span>
        </span>
      ))}
    </div>
  );
}

function DealerTable({ dealers, columns, showSkus = false }: { dealers: DealerInfo[]; columns: ('sales' | 'lastDate')[]; showSkus?: boolean }) {
  if (dealers.length === 0) return <p className="text-gray-500 text-sm py-4">ไม่มีข้อมูล</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
            <th className="text-left py-2 pr-3 font-medium">รหัส</th>
            <th className="text-left py-2 pr-3 font-medium">ชื่อดีลเลอร์{showSkus && ' / SKU ที่ซื้อ'}</th>
            <th className="text-center py-2 px-3 font-medium">เทียร์</th>
            {columns.includes('sales') && <th className="text-right py-2 px-3 font-medium">ยอดขาย</th>}
            {columns.includes('sales') && <th className="text-right py-2 px-3 font-medium">ลัง</th>}
            {columns.includes('lastDate') && <th className="text-right py-2 pl-3 font-medium">ล่าสุด</th>}
          </tr>
        </thead>
        <tbody>
          {dealers.map(d => (
            <tr key={d.customerId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
              <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs align-top">{d.customerId}</td>
              <td className="py-2 pr-3 align-top">
                <span className="text-white">{d.customerName}</span>
                {showSkus && <SkuChips skus={d.skus} />}
              </td>
              <td className="py-2 px-3 text-center align-top"><TierBadge tier={d.tier} /></td>
              {columns.includes('sales') && (
                <td className="py-2 px-3 text-right tabular-nums font-medium align-top">{formatCurrency(d.sales)}</td>
              )}
              {columns.includes('sales') && (
                <td className="py-2 px-3 text-right tabular-nums text-gray-400 align-top">{formatNumber(d.cases, 1)}</td>
              )}
              {columns.includes('lastDate') && (
                <td className="py-2 pl-3 text-right text-gray-400 tabular-nums text-xs align-top">{formatDateThai(d.lastInvoiceDate)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealerHealthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultMonth = getCurrentMonthYYYYMM();
  const from = searchParams.get('from') || searchParams.get('month') || defaultMonth;
  const to = searchParams.get('to') || searchParams.get('month') || from;
  const { data, loading, error, refresh } = useDashboard(from, to);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /><span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span></div>;
  if (error || !data) return <div className="flex items-center gap-3 p-8 text-red-400"><AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span></div>;

  const { dealerHealth: dh, meta } = data;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">สุขภาพดีลเลอร์</h1>
          <MonthSelector availableMonths={meta.availableMonths} from={from} to={to} onChange={(f, t) => router.push(`/dealer-health?from=${f}&to=${t}`)} />
        </div>

        <WarningBanner count={meta.tierJoinFailCount} ids={meta.tierJoinFailIds} />

        {/* Health Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard title="ดีลเลอร์ที่ขาย" value={formatNumber(dh.activeCount) + ' ราย'} highlight />
          <MetricCard title="ดีลเลอร์ใหม่" value={formatNumber(dh.newCount) + ' ราย'} subtitle="เดือนแรก" />
          <MetricCard title="กลับมาซื้อ" value={formatNumber(dh.returningCount) + ' ราย'} subtitle="ไม่ซื้อเดือนก่อน" />
          <MetricCard
            title="เสี่ยงหาย"
            value={formatNumber(dh.atRiskCount) + ' ราย'}
            subtitle="ไม่ซื้อ 60 วัน"
            className="border-amber-500/30"
          />
          <MetricCard
            title="หายไปแล้ว"
            value={formatNumber(dh.lostCount) + ' ราย'}
            subtitle="ไม่ซื้อ 90+ วัน"
            className="border-red-500/30"
          />
        </div>

        {/* Top 10 */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Top 10 ดีลเลอร์ยอดขายสูงสุด</h2>
          <DealerTable dealers={dh.top10} columns={['sales']} showSkus />
        </div>

        {/* New Dealers */}
        {dh.newDealers.length > 0 && (
          <div className="bg-[#1C1C1C] border border-green-500/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-green-400 mb-4">
              ดีลเลอร์ใหม่เดือนนี้ ({dh.newDealers.length} ราย)
            </h2>
            <DealerTable dealers={dh.newDealers} columns={['sales']} showSkus />
          </div>
        )}

        {/* At Risk */}
        {dh.atRisk.length > 0 && (
          <div className="bg-[#1C1C1C] border border-amber-500/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-400 mb-2">
              ดีลเลอร์เสี่ยงหาย ({dh.atRiskCount} ราย)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              เคยสั่งซื้อในช่วง 60 วันก่อนต้นเดือน แต่ไม่มีออเดอร์ในเดือนที่เลือก
            </p>
            <DealerTable dealers={dh.atRisk} columns={['lastDate']} />
          </div>
        )}
      </div>
    </>
  );
}

export default function DealerHealthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <DealerHealthContent />
    </Suspense>
  );
}
