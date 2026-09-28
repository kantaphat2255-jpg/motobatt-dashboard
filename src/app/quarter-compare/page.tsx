'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import { formatCurrency, formatNumber, formatPct, pctColor } from '@/lib/utils';
import {
  todayISO, startOfQuarterISO, addDaysISO, isoToQuarterCode, quarterCodeToRange,
  formatQuarterLabel, quarterCodesInRange, formatDateRangeThai,
} from '@/lib/dateRange';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { TierSummary, TierKnown } from '@/lib/types';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function defaultQuarterCodes() {
  const today = todayISO();
  const targetQ = isoToQuarterCode(today);
  const prevAnchor = addDaysISO(startOfQuarterISO(today), -1);
  const baseQ = isoToQuarterCode(prevAnchor);
  return { baseQ, targetQ };
}

/** % change from `base` to `target`. Null when base is 0 and target isn't (undefined growth rate). */
function pctOf(base: number, target: number): number | null {
  if (base === 0) return target === 0 ? 0 : null;
  return ((target - base) / Math.abs(base)) * 100;
}

function DeltaCell({ diff, pct, format }: { diff: number; pct: number | null; format: (n: number) => string }) {
  const up = diff > 0, down = diff < 0;
  return (
    <td className="py-2.5 pl-4 text-right">
      <div className={`inline-flex items-center gap-1 justify-end text-sm font-semibold tabular-nums ${up ? 'text-green-400' : down ? 'text-red-400' : 'text-gray-500'}`}>
        {up && <TrendingUp size={13} />}
        {down && <TrendingDown size={13} />}
        {!up && !down && <Minus size={13} />}
        {diff >= 0 ? '+' : ''}{format(diff)}
      </div>
      {pct !== null && <div className={`text-xs tabular-nums ${pctColor(pct)}`}>{formatPct(pct)}</div>}
    </td>
  );
}

function KpiRow({ label, base, target, format = formatCurrency }: {
  label: string; base: number; target: number; format?: (n: number) => string;
}) {
  const diff = target - base;
  const pct = pctOf(base, target);
  return (
    <tr className="border-b border-[#1A1A1A] hover:bg-[#1E2126]">
      <td className="py-2.5 pr-4 text-gray-300 text-sm whitespace-nowrap">{label}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-gray-400">{format(base)}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-white font-medium">{format(target)}</td>
      <DeltaCell diff={diff} pct={pct} format={format} />
    </tr>
  );
}

function KpiRowPoints({ label, base, target }: { label: string; base: number | null; target: number | null }) {
  if (base === null && target === null) return null;
  const b = base ?? 0, t = target ?? 0;
  const diff = t - b;
  const up = diff > 0, down = diff < 0;
  return (
    <tr className="border-b border-[#1A1A1A] hover:bg-[#1E2126]">
      <td className="py-2.5 pr-4 text-gray-300 text-sm whitespace-nowrap">{label}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-gray-400">{base !== null ? `${base.toFixed(1)}%` : '-'}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-white font-medium">{target !== null ? `${target.toFixed(1)}%` : '-'}</td>
      <td className="py-2.5 pl-4 text-right">
        <span className={`text-sm font-semibold tabular-nums ${up ? 'text-green-400' : down ? 'text-red-400' : 'text-gray-500'}`}>
          {diff >= 0 ? '+' : ''}{diff.toFixed(1)} จุด
        </span>
      </td>
    </tr>
  );
}

function CompareTable({ title, subtitle, baseLabel, targetLabel, children }: {
  title: string; subtitle?: string; baseLabel: string; targetLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-gray-500 text-xs">
              <th className="text-left py-2 pr-4 font-medium">ตัวชี้วัด</th>
              <th className="text-right py-2 px-4 font-medium">{baseLabel}</th>
              <th className="text-right py-2 px-4 font-medium">{targetLabel}</th>
              <th className="text-right py-2 pl-4 font-medium">ผลต่าง</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

type TierMetric = 'sales' | 'dealerCount' | 'avgSalesPerDealer';

function TierDeltaTable({ tiers, metric, label, format, baseLabel, targetLabel }: {
  tiers: TierSummary[]; metric: TierMetric; label: string;
  format: (n: number) => string; baseLabel: string; targetLabel: string;
}) {
  const known = tiers.filter((t): t is TierSummary & { tier: TierKnown } =>
    t.tier === 'A' || t.tier === 'B' || t.tier === 'C' || t.tier === 'D');
  if (known.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 mb-2">{label}</h3>
      <table className="w-full text-sm mb-5">
        <thead>
          <tr className="border-b border-[#2A2A2A] text-gray-500 text-xs">
            <th className="text-left py-1.5 pr-3 font-medium">เทียร์</th>
            <th className="text-right py-1.5 px-3 font-medium">{baseLabel}</th>
            <th className="text-right py-1.5 px-3 font-medium">{targetLabel}</th>
            <th className="text-right py-1.5 pl-3 font-medium">ผลต่าง</th>
          </tr>
        </thead>
        <tbody>
          {known.map(t => {
            const base = metric === 'sales' ? t.prevSales : metric === 'dealerCount' ? t.prevDealerCount : t.avgPrevSalesPerDealer;
            const target = metric === 'sales' ? t.sales : metric === 'dealerCount' ? t.dealerCount : t.avgSalesPerDealer;
            const diff = target - base;
            const pct = pctOf(base, target);
            const up = diff > 0, down = diff < 0;
            return (
              <tr key={t.tier} className="border-b border-[#1A1A1A]">
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: TIER_COLORS[t.tier] }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
                    {TIER_LABELS[t.tier]}
                  </span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-400">{format(base)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-white font-medium">{format(target)}</td>
                <td className="py-2 pl-3 text-right whitespace-nowrap">
                  <span className={`text-xs font-semibold tabular-nums ${up ? 'text-green-400' : down ? 'text-red-400' : 'text-gray-500'}`}>
                    {diff >= 0 ? '+' : ''}{format(diff)}
                  </span>
                  {pct !== null && <span className={`ml-1.5 text-[11px] tabular-nums ${pctColor(pct)}`}>({formatPct(pct)})</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuarterCompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaults = defaultQuarterCodes();
  const baseQ = searchParams.get('base') || defaults.baseQ;
  const targetQ = searchParams.get('target') || defaults.targetQ;

  const baseRange = quarterCodeToRange(baseQ);
  const targetRange = quarterCodeToRange(targetQ);

  // Primary period = target quarter (from/to); compare period = base quarter
  // (cfrom/cto) — reuses the same /api/data comparison wiring as Overview and Tier.
  const { data, loading, error, refresh } = useDashboard(targetRange.from, targetRange.to, baseRange.from, baseRange.to);

  function navigate(b: string, t: string) {
    router.push(`/quarter-compare?base=${b}&target=${t}`);
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

  const { overview, overviewCompare, overviewNet, overviewNetCompare, online, onlineCompare, tierAnalysis, meta } = data;
  if (!overviewCompare || !overviewNetCompare || !onlineCompare) return (
    <div className="flex items-center gap-3 p-8 text-red-400">
      <AlertCircle size={20} /><span>ไม่สามารถโหลดข้อมูลของไตรมาสฐานได้</span>
    </div>
  );

  const quarterOptions = quarterCodesInRange(meta.minDate, meta.maxDate).reverse();
  const baseLabel = formatQuarterLabel(baseQ);
  const targetLabel = formatQuarterLabel(targetQ);

  // Combined = dealer (net of returns) + online, matching the convention already
  // used on the Overview page's all-channel share bar.
  const combinedSalesB = overviewNetCompare.mtdSales + onlineCompare.totalSales;
  const combinedSalesT = overviewNet.mtdSales + online.totalSales;
  const combinedOrdersB = overviewNetCompare.invoiceCount + onlineCompare.orderCount;
  const combinedOrdersT = overviewNet.invoiceCount + online.orderCount;
  const combinedAvgB = combinedOrdersB > 0 ? combinedSalesB / combinedOrdersB : 0;
  const combinedAvgT = combinedOrdersT > 0 ? combinedSalesT / combinedOrdersT : 0;
  const combinedCustomersB = overviewNetCompare.activeDealers + onlineCompare.buyerCount;
  const combinedCustomersT = overviewNet.activeDealers + online.buyerCount;
  const dealerReturnsB = overviewCompare.mtdSales - overviewNetCompare.mtdSales;
  const dealerReturnsT = overview.mtdSales - overviewNet.mtdSales;

  const unitFmt = (n: number) => formatNumber(n) + ' ชิ้น';
  const caseFmt = (n: number) => formatNumber(n, 1) + ' ลัง';
  const countFmt = (n: number) => formatNumber(n);
  const dealerFmt = (n: number) => formatNumber(n) + ' ราย';
  const orderFmt = (n: number) => formatNumber(n) + ' ออเดอร์/บิล';

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        {/* Header + quarter pickers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">เปรียบเทียบไตรมาส (Q)</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateRangeThai(baseRange.from, baseRange.to)} เทียบกับ {formatDateRangeThai(targetRange.from, targetRange.to)}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ไตรมาสฐาน</span>
              <select
                value={baseQ}
                onChange={e => navigate(e.target.value, targetQ)}
                className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
              >
                {quarterOptions.map(q => (
                  <option key={q} value={q}>{formatQuarterLabel(q)}</option>
                ))}
              </select>
            </div>
            <span className="text-gray-500 mt-4">vs</span>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ไตรมาสเปรียบเทียบ</span>
              <select
                value={targetQ}
                onChange={e => navigate(baseQ, e.target.value)}
                className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
              >
                {quarterOptions.map(q => (
                  <option key={q} value={q}>{formatQuarterLabel(q)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Combined all-channels headline */}
        <CompareTable
          title="ยอดขายรวมทุกช่องทาง (Net: ดีลเลอร์ + ออนไลน์ หักคืนแล้ว)"
          baseLabel={baseLabel}
          targetLabel={targetLabel}
        >
          <KpiRow label="ยอดขายรวม" base={combinedSalesB} target={combinedSalesT} />
          <KpiRow label="จำนวนออเดอร์รวม (บิลดีลเลอร์ + ออเดอร์ออนไลน์)" base={combinedOrdersB} target={combinedOrdersT} format={orderFmt} />
          <KpiRow label="บิลเฉลี่ยต่อออเดอร์ (รวม)" base={combinedAvgB} target={combinedAvgT} />
          <KpiRow label="ลูกค้ารวม (ดีลเลอร์ + ผู้ซื้อออนไลน์)" base={combinedCustomersB} target={combinedCustomersT} format={dealerFmt} />
        </CompareTable>

        {/* Dealer side */}
        <CompareTable
          title="ยอดขายดีลเลอร์"
          subtitle="Net = หักคืนสินค้า/เคลมแล้ว"
          baseLabel={baseLabel}
          targetLabel={targetLabel}
        >
          <KpiRow label="ยอดขาย (Gross)" base={overviewCompare.mtdSales} target={overview.mtdSales} />
          <KpiRow label="ยอดขาย (Net)" base={overviewNetCompare.mtdSales} target={overviewNet.mtdSales} />
          <KpiRow label="หักคืนสินค้า/เคลม" base={dealerReturnsB} target={dealerReturnsT} />
          <KpiRow label="จำนวนบิล" base={overviewNetCompare.invoiceCount} target={overviewNet.invoiceCount} format={countFmt} />
          <KpiRow label="บิลเฉลี่ยต่อบิล" base={overviewNetCompare.avgOrderValue} target={overviewNet.avgOrderValue} />
          <KpiRow label="ดีลเลอร์ที่ขายได้" base={overviewNetCompare.activeDealers} target={overviewNet.activeDealers} format={dealerFmt} />
          <KpiRow label="หน่วยขาย" base={overviewNetCompare.mtdUnits} target={overviewNet.mtdUnits} format={unitFmt} />
          <KpiRow label="จำนวนลัง" base={overviewNetCompare.mtdCases} target={overviewNet.mtdCases} format={caseFmt} />
          <KpiRowPoints label="ทำเป้าได้" base={overviewCompare.achievementPct} target={overview.achievementPct} />
        </CompareTable>

        {/* Online side */}
        <CompareTable
          title="ยอดขายออนไลน์ (Net เสมอ)"
          subtitle="Lazada · Shopee · TikTok · Facebook"
          baseLabel={baseLabel}
          targetLabel={targetLabel}
        >
          <KpiRow label="ยอดขาย" base={onlineCompare.totalSales} target={online.totalSales} />
          <KpiRow label="หักคืนสินค้า/เคลม" base={onlineCompare.returnAmount} target={online.returnAmount} />
          <KpiRow label="จำนวนออเดอร์" base={onlineCompare.orderCount} target={online.orderCount} format={countFmt} />
          <KpiRow label="ออเดอร์เฉลี่ย" base={onlineCompare.avgOrderValue} target={online.avgOrderValue} />
          <KpiRow label="ผู้ซื้อ" base={onlineCompare.buyerCount} target={online.buyerCount} format={dealerFmt} />
          <KpiRow label="หน่วยขาย" base={onlineCompare.totalUnits} target={online.totalUnits} format={unitFmt} />
          {online.channels.map(c => {
            const cB = onlineCompare.channels.find(x => x.zoneId === c.zoneId);
            return (
              <KpiRow
                key={c.zoneId}
                label={`— ${c.channel}`}
                base={cB?.sales ?? 0}
                target={c.sales}
              />
            );
          })}
        </CompareTable>

        {/* Tier breakdown */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">ความต่างแต่ละเทียร์ (A/B/C/D)</h2>
          <p className="text-xs text-gray-500 mb-4">ยอดขายดีลเลอร์ (Gross) ตามระดับชั้น — ดีลเลอร์ที่ไม่มียอดขายในไตรมาสใดไตรมาสหนึ่งจะแสดงเป็น 0</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
            <TierDeltaTable tiers={tierAnalysis.tiers} metric="sales" label="ยอดขาย" format={formatCurrency} baseLabel={baseLabel} targetLabel={targetLabel} />
            <TierDeltaTable tiers={tierAnalysis.tiers} metric="dealerCount" label="จำนวนดีลเลอร์" format={dealerFmt} baseLabel={baseLabel} targetLabel={targetLabel} />
            <TierDeltaTable tiers={tierAnalysis.tiers} metric="avgSalesPerDealer" label="ยอดเฉลี่ย/ราย" format={formatCurrency} baseLabel={baseLabel} targetLabel={targetLabel} />
          </div>
        </div>
      </div>
    </>
  );
}

export default function QuarterComparePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <QuarterCompareContent />
    </Suspense>
  );
}
