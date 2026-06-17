'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useMonthCompare } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import MetricCard from '@/components/ui/MetricCard';
import { formatCurrency, formatNumber, formatPct, pctColor, formatMonthLabel } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { DealerMovementRow, SkuMovementRow, DealerMovementGroup } from '@/lib/types';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, UserMinus, UserPlus } from 'lucide-react';

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

function DiffCell({ diff, pct }: { diff: number; pct: number | null }) {
  const sign = diff >= 0 ? '+' : '';
  return (
    <div className="text-right">
      <div className={`tabular-nums font-medium text-sm ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {sign}{formatCurrency(diff)}
      </div>
      {pct !== null && (
        <div className={`text-xs tabular-nums ${pctColor(pct)}`}>{formatPct(pct)}</div>
      )}
    </div>
  );
}

const GROUP_CONFIG: Record<DealerMovementGroup, { label: string; color: string; Icon: React.ElementType }> = {
  increased: { label: 'เพิ่มขึ้น', color: 'text-green-400', Icon: TrendingUp },
  decreased: { label: 'ลดลง', color: 'text-red-400', Icon: TrendingDown },
  lost: { label: 'หายไปในเดือนเปรียบเทียบ', color: 'text-amber-400', Icon: UserMinus },
  returned_new: { label: 'กลับมา / ใหม่ในเดือนเปรียบเทียบ', color: 'text-blue-400', Icon: UserPlus },
};

function DealerMovementSection({ rows, group }: { rows: DealerMovementRow[]; group: DealerMovementGroup }) {
  const { label, color, Icon } = GROUP_CONFIG[group];
  if (rows.length === 0) return null;
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${color}`}>
        <Icon size={15} />
        {label} ({rows.length} ราย)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
              <th className="text-left py-2 pr-3 font-medium">รหัส</th>
              <th className="text-left py-2 pr-3 font-medium">ชื่อดีลเลอร์</th>
              <th className="text-center py-2 px-2 font-medium">เทียร์</th>
              <th className="text-right py-2 px-3 font-medium">ยอดฐาน</th>
              <th className="text-right py-2 px-3 font-medium">ยอดเปรียบ</th>
              <th className="text-right py-2 px-3 font-medium">ผลต่าง / %</th>
              <th className="text-right py-2 px-2 font-medium">ลังฐาน</th>
              <th className="text-right py-2 pl-2 font-medium">ลังเปรียบ</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).map(r => (
              <tr key={r.customerId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{r.customerId}</td>
                <td className="py-2 pr-3 text-white">{r.customerName}</td>
                <td className="py-2 px-2 text-center"><TierBadge tier={r.tier} /></td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatCurrency(r.baseSales)}</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(r.compareSales)}</td>
                <td className="py-2 px-3"><DiffCell diff={r.diff} pct={r.diffPct} /></td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-400">{formatNumber(r.baseCases, 1)}</td>
                <td className="py-2 pl-2 text-right tabular-nums text-gray-400">{formatNumber(r.compareCases, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkuMovementTable({ rows }: { rows: SkuMovementRow[] }) {
  if (rows.length === 0) return <p className="text-gray-500 text-sm py-4">ไม่มีข้อมูล</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
            <th className="text-left py-2 pr-3 font-medium">รหัสสินค้า</th>
            <th className="text-left py-2 pr-3 font-medium">ชื่อสินค้า</th>
            <th className="text-right py-2 px-3 font-medium">ยอดฐาน</th>
            <th className="text-right py-2 px-3 font-medium">ยอดเปรียบ</th>
            <th className="text-right py-2 px-3 font-medium">ผลต่าง / %</th>
            <th className="text-right py-2 px-2 font-medium">ลังฐาน</th>
            <th className="text-right py-2 pl-2 font-medium">ลังเปรียบ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.itemId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
              <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{r.itemId}</td>
              <td className="py-2 pr-3 text-white">{r.itemDesc}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatCurrency(r.baseSales)}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(r.compareSales)}</td>
              <td className="py-2 px-3"><DiffCell diff={r.diff} pct={r.diffPct} /></td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-400">{formatNumber(r.baseCases, 1)}</td>
              <td className="py-2 pl-2 text-right tabular-nums text-gray-400">{formatNumber(r.compareCases, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCompare({ label, base, compare }: {
  label: string;
  base: string;
  compare: string;
}) {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-4 py-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">เดือนฐาน</p>
          <p className="text-lg font-bold tabular-nums text-gray-300">{base}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">เดือนเปรียบ</p>
          <p className="text-lg font-bold tabular-nums text-white">{compare}</p>
        </div>
      </div>
    </div>
  );
}

function MonthCompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const base = searchParams.get('base') || '';
  const compare = searchParams.get('compare') || '';

  // Load with empty strings — API defaults to prev/current month
  const { data, loading, error, refresh } = useMonthCompare(base, compare);

  const availableMonths = data?.meta.availableMonths ?? [];
  const latest = availableMonths[availableMonths.length - 1] ?? '';
  const effectiveBase = base || (availableMonths.length >= 2 ? availableMonths[availableMonths.length - 2] : latest);
  const effectiveCompare = compare || latest;

  function navigate(b: string, c: string) {
    router.push(`/month-compare?base=${b}&compare=${c}`);
  }

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

  const { data: d, meta } = data;

  const dealerGroups: DealerMovementGroup[] = ['increased', 'decreased', 'lost', 'returned_new'];
  const groupedDealers = dealerGroups.reduce((acc, g) => {
    acc[g] = d.dealerMovement.filter(r => r.group === g);
    return acc;
  }, {} as Record<DealerMovementGroup, DealerMovementRow[]>);

  const salesDiff = d.compare.totalSales - d.base.totalSales;
  const salesDiffPct = d.base.totalSales > 0 ? (salesDiff / d.base.totalSales) * 100 : null;

  return (
    <>
      <DataFreshness meta={{ ...meta, totalRawRows: 0, validRows: 0, invalidRows: 0, latestMonth: latest, tierJoinFailCount: 0, tierJoinFailIds: [] }} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        {/* Header + month pickers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl font-bold">เปรียบเทียบรายเดือน</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">เดือนฐาน</span>
              <select
                value={effectiveBase}
                onChange={e => navigate(e.target.value, effectiveCompare)}
                className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
              >
                {[...availableMonths].reverse().map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m, true)}</option>
                ))}
              </select>
            </div>
            <span className="text-gray-500 mt-4">vs</span>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">เดือนเปรียบเทียบ</span>
              <select
                value={effectiveCompare}
                onChange={e => navigate(effectiveBase, e.target.value)}
                className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
              >
                {[...availableMonths].reverse().map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m, true)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary metrics comparison */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="ยอดขาย"
            value={formatCurrency(d.compare.totalSales)}
            subtitle={formatPct(salesDiffPct) + ' vs เดือนฐาน'}
            highlight={salesDiff >= 0}
            className={salesDiff < 0 ? 'border-red-500/30' : ''}
          />
          <MetricCard title="จำนวนลัง" value={formatNumber(d.compare.totalCases, 1) + ' ลัง'}
            subtitle={`ฐาน: ${formatNumber(d.base.totalCases, 1)} ลัง`} />
          <MetricCard title="จำนวนใบแจ้งหนี้" value={formatNumber(d.compare.invoiceCount) + ' ใบ'}
            subtitle={`ฐาน: ${formatNumber(d.base.invoiceCount)} ใบ`} />
          <MetricCard title="ดีลเลอร์ที่ขาย" value={formatNumber(d.compare.activeDealers) + ' ราย'}
            subtitle={`ฐาน: ${formatNumber(d.base.activeDealers)} ราย`} />
        </div>

        {/* Average per invoice */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCompare
            label="ยอดเฉลี่ยต่อใบแจ้งหนี้"
            base={formatCurrency(d.base.avgSalesPerInvoice)}
            compare={formatCurrency(d.compare.avgSalesPerInvoice)}
          />
          <SummaryCompare
            label="ลังเฉลี่ยต่อใบแจ้งหนี้"
            base={`${formatNumber(d.base.avgCasesPerInvoice, 1)} ลัง`}
            compare={`${formatNumber(d.compare.avgCasesPerInvoice, 1)} ลัง`}
          />
        </div>

        {/* Dealer movement */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">การเคลื่อนไหวของดีลเลอร์</h2>
          <div className="space-y-4">
            {dealerGroups.map(g => (
              <DealerMovementSection key={g} rows={groupedDealers[g]} group={g} />
            ))}
          </div>
        </div>

        {/* SKU movement */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">การเคลื่อนไหวของสินค้า (SKU)</h2>
          <SkuMovementTable rows={d.skuMovement} />
        </div>
      </div>
    </>
  );
}

export default function MonthComparePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <MonthCompareContent />
    </Suspense>
  );
}
