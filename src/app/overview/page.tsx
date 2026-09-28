'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import MetricCard from '@/components/ui/MetricCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DateRangePicker from '@/components/ui/DateRangePicker';
import TrendBadge from '@/components/ui/TrendBadge';
import { formatCurrency, formatNumber, formatCurrencyShort } from '@/lib/utils';
import { formatDateRangeThai } from '@/lib/dateRange';
import { ONLINE_CHANNEL_COLORS } from '@/lib/constants';
import { Loader2, AlertCircle } from 'lucide-react';

function OverviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const cfrom = searchParams.get('cfrom');
  const cto = searchParams.get('cto');
  const { data, loading, error, refresh } = useDashboard(from, to, cfrom, cto);
  const [netView, setNetView] = useState(false);

  const handleChange = (f: string, t: string, compare: { from: string; to: string } | null) => {
    const p = new URLSearchParams({ from: f, to: t });
    if (compare) { p.set('cfrom', compare.from); p.set('cto', compare.to); }
    router.push(`/overview?${p.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#F5C400]" />
        <span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 p-8 text-red-400">
        <AlertCircle size={20} />
        <span>{error || 'ไม่พบข้อมูล'}</span>
      </div>
    );
  }

  const { overview, overviewCompare, overviewNet, overviewNetCompare, compareRange, meta } = data;
  const ov = netView ? overviewNet : overview;
  const cmp = netView ? overviewNetCompare : overviewCompare;
  const salesDelta = cmp && cmp.mtdSales > 0 ? ((ov.mtdSales - cmp.mtdSales) / cmp.mtdSales) * 100 : null;
  const returnsAmount = overview.mtdSales - overviewNet.mtdSales;

  // Online sales are ALWAYS net of returns (user rule) — independent of the
  // Gross/Net toggle above, which only drives the dealer figures. The all-channel
  // share bar therefore uses NET dealer sales as well, so its two segments share
  // one basis instead of mixing gross dealers with net online.
  const on = data.online;
  const onCmp = data.onlineCompare;
  const pctDelta = (cur: number, prev: number | undefined) => (prev && prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const onlineDelta = onCmp ? pctDelta(on.totalSales, onCmp.totalSales) : on.momPct;
  const onlineBeforeReturns = on.totalSales + on.returnAmount;
  const allChannelSales = overviewNet.mtdSales + on.totalSales;
  const onlineShare = allChannelSales > 0 ? (on.totalSales / allChannelSales) * 100 : 0;
  const dealerShare = allChannelSales > 0 ? 100 - onlineShare : 0;
  const allChannelOrders = overviewNet.invoiceCount + on.orderCount;
  const allChannelAvgOrderValue = allChannelOrders > 0 ? allChannelSales / allChannelOrders : 0;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F5C400]">Motobatt Thailand</p>
            <h1 className="mt-2 text-2xl font-bold text-white">ภาพรวมยอดขาย</h1>
            <p className="mt-1 text-sm text-gray-500">Sales performance, target progress, and dealer activity</p>
          </div>
          <DateRangePicker
            minDate={meta.minDate}
            maxDate={meta.maxDate}
            from={ov.fromDate}
            to={ov.toDate}
            compareFrom={compareRange?.from ?? null}
            compareTo={compareRange?.to ?? null}
            onChange={handleChange}
          />
        </div>

        {/* MTD Sales + Progress */}
        <div className="relative overflow-hidden rounded-lg border border-[#343A43] bg-[#17191C]/95 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C400]/70 to-transparent" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">ยอดขายในช่วง (ดีลเลอร์)</p>
                <div className="flex rounded-md border border-[#2A2F36] overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNetView(false)}
                    className={`px-2 py-0.5 ${!netView ? 'bg-[#F5C400] text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    Gross
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetView(true)}
                    className={`px-2 py-0.5 ${netView ? 'bg-[#F5C400] text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    Net
                  </button>
                </div>
              </div>
              <p className="text-4xl font-bold text-[#F5C400] tabular-nums leading-none">
                {formatCurrency(ov.mtdSales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {ov.isOngoing
                  ? `วันที่ ${ov.daysElapsed} จาก ${ov.daysTotal} วัน`
                  : formatDateRangeThai(ov.fromDate, ov.toDate)}
                {netView && returnsAmount !== 0 && (
                  <span className="text-gray-500"> · หักคืนสินค้า/เคลม {formatCurrency(Math.abs(returnsAmount))}</span>
                )}
              </p>
              {cmp && compareRange && (
                <p className="text-sm mt-1.5 flex items-center gap-2">
                  <span className="text-gray-500">เทียบ {formatDateRangeThai(compareRange.from, compareRange.to)}:</span>
                  <span className="text-gray-300 tabular-nums">{formatCurrency(cmp.mtdSales)}</span>
                  {salesDelta !== null && (
                    <span className={`font-semibold tabular-nums ${salesDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {salesDelta >= 0 ? '+' : ''}{salesDelta.toFixed(1)}%
                    </span>
                  )}
                </p>
              )}
            </div>
            {ov.target && (
              <div className="rounded-lg border border-[#2A2F36] bg-[#111316]/70 px-4 py-3 text-right">
                <p className="text-xs text-gray-400 mb-1">เป้าหมาย</p>
                <p className="text-lg font-semibold text-gray-300 tabular-nums">{formatCurrency(ov.target)}</p>
              </div>
            )}
          </div>
          {ov.target && (
            <ProgressBar current={ov.mtdSales} target={ov.target} label="ความคืบหน้าสู่เป้า" />
          )}
        </div>

        {/* Row 1: 6 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="ทำเป้าได้"
            value={ov.achievementPct !== null ? `${ov.achievementPct.toFixed(1)}%` : '-'}
            subtitle={ov.target ? `เป้า ${formatCurrencyShort(ov.target)}` : 'ไม่มีเป้า'}
            highlight={ov.achievementPct !== null && ov.achievementPct >= 100}
          />
          <MetricCard
            title="จำนวนบิล (ดีลเลอร์)"
            value={formatNumber(ov.invoiceCount) + ' บิล'}
            subtitle="ในช่วงที่เลือก"
          />
          <MetricCard
            title="บิลเฉลี่ย/ออเดอร์"
            value={formatCurrency(ov.avgOrderValue)}
            subtitle={`${formatNumber(ov.invoiceCount)} บิล`}
          />
          <MetricCard
            title="หน่วยทั้งหมด (ชิ้น)"
            value={formatNumber(ov.mtdUnits)}
            subtitle={`${formatNumber(ov.mtdCases, 1)} ลัง`}
          />
          <MetricCard
            title="ดีลเลอร์ที่ขายได้"
            value={formatNumber(ov.activeDealers) + ' ราย'}
            subtitle="ในช่วงที่เลือก"
          />
          <MetricCard
            title={cmp ? 'เทียบช่วงก่อน' : 'เทียบช่วงก่อนหน้า'}
            value={ov.momPct !== null ? `${ov.momPct >= 0 ? '+' : ''}${ov.momPct.toFixed(1)}%` : '-'}
            subtitle={`ก่อนหน้า ${formatCurrencyShort(ov.prevMonthSales)}`}
            badge={<TrendBadge pct={ov.momPct} />}
          />
        </div>

        {/* Row 2: projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title={ov.isOngoing ? 'คาดการณ์สิ้นเดือน' : 'ยอดขายจริงในช่วง'}
            value={formatCurrency(ov.projectedMonthEnd)}
            subtitle={
              ov.target
                ? `${ov.projectedMonthEnd >= ov.target ? '✓ เกินเป้า' : '✗ ต่ำกว่าเป้า'} ${formatCurrencyShort(ov.target)}`
                : undefined
            }
          />
          <MetricCard
            title={ov.isOngoing ? 'ต้องขายต่อวัน (เพื่อถึงเป้า)' : 'ผลต่างจากเป้าหมาย'}
            value={
              ov.isOngoing
                ? formatCurrency(Math.max(0, ov.requiredDailyOrGap)) + '/วัน'
                : formatCurrency(Math.abs(ov.requiredDailyOrGap))
            }
            subtitle={
              ov.isOngoing
                ? `เหลือ ${ov.daysRemaining} วัน`
                : ov.requiredDailyOrGap >= 0 ? 'เกินเป้า' : 'ต่ำกว่าเป้า'
            }
            highlight={!ov.isOngoing && ov.requiredDailyOrGap >= 0}
          />
          <MetricCard
            title="จำนวนลังที่ขายได้"
            value={formatNumber(ov.mtdCases, 1) + ' ลัง'}
            subtitle={`${formatNumber(ov.mtdUnits)} ชิ้น รวม`}
          />
        </div>

        {/* Day progress */}
        {ov.isOngoing && (
          <div className="bg-[#17191C]/92 border border-[#2A2F36] rounded-lg p-4 shadow-[0_18px_40px_rgba(0,0,0,0.14)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">ความคืบหน้าของเดือน</p>
              <p className="text-sm text-gray-300 tabular-nums">
                วันที่ {ov.daysElapsed}/{ov.daysTotal}
              </p>
            </div>
            <ProgressBar
              current={ov.daysElapsed}
              target={ov.daysTotal}
              label="จำนวนวันที่ผ่านมา"
              height={6}
            />
          </div>
        )}

        {/* Online sales */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-lg font-bold text-white">ยอดขายออนไลน์</h2>
            <p className="mt-1 text-sm text-gray-500">
              Lazada · Shopee · TikTok · Facebook (โซน 80-01 ถึง 80-04) แยกจากยอดดีลเลอร์ด้านบน · แสดงแบบ Net (หักคืนสินค้า/เคลมแล้ว) เสมอ ไม่ขึ้นกับปุ่ม Gross/Net
            </p>
          </div>

          <div className="rounded-lg border border-[#343A43] bg-[#17191C]/95 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ยอดขายออนไลน์รวม (Net)</p>
                <p className="text-3xl font-bold text-[#F5C400] tabular-nums leading-none">{formatCurrency(on.totalSales)}</p>
                <p className="text-sm text-gray-500 mt-2 tabular-nums">
                  {on.returnAmount > 0
                    ? <>ก่อนหักคืน {formatCurrency(onlineBeforeReturns)} · <span className="text-red-400">หักคืนสินค้า/เคลม −{formatCurrency(on.returnAmount)}</span></>
                    : 'ไม่มีรายการคืนสินค้า/เคลมในช่วงนี้'}
                </p>
                <p className="text-sm text-gray-500 mt-1 tabular-nums">
                  {formatNumber(on.totalUnits)} ชิ้น · {formatNumber(on.orderCount)} ออเดอร์ (เฉลี่ย {formatCurrency(on.avgOrderValue)}/ออเดอร์) · {formatNumber(on.buyerCount)} ผู้ซื้อ
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">
                  {onCmp && compareRange ? `เทียบ ${formatDateRangeThai(compareRange.from, compareRange.to)}` : 'เทียบช่วงก่อนหน้า'}
                </p>
                <TrendBadge pct={onlineDelta} size="md" />
                <p className="text-xs text-gray-500 mt-1 tabular-nums">
                  ก่อนหน้า {formatCurrencyShort(onCmp ? onCmp.totalSales : on.prevSales)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs text-gray-400 mb-2">
                <span>สัดส่วนยอดขายทุกช่องทาง (Net: ดีลเลอร์ + ออนไลน์ หักคืนทั้งคู่)</span>
                <span className="tabular-nums text-gray-300">{formatCurrency(allChannelSales)}</span>
              </div>
              <div className="flex h-3 rounded-md overflow-hidden bg-[#2A2A2A]">
                <div style={{ width: `${dealerShare}%`, background: '#F5C400' }} title={`ดีลเลอร์ ${dealerShare.toFixed(1)}%`} />
                <div style={{ width: `${onlineShare}%`, background: '#38BDF8' }} title={`ออนไลน์ ${onlineShare.toFixed(1)}%`} />
              </div>
              <div className="flex gap-6 mt-2 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5C400]" />ดีลเลอร์ <span className="tabular-nums text-gray-300">{dealerShare.toFixed(1)}%</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />ออนไลน์ <span className="tabular-nums text-gray-300">{onlineShare.toFixed(1)}%</span></span>
              </div>
              <p className="mt-3 pt-3 border-t border-[#2A2F36] text-xs text-gray-500 tabular-nums">
                รวมทุกช่องทาง {formatNumber(allChannelOrders)} ออเดอร์ (ดีลเลอร์ {formatNumber(overviewNet.invoiceCount)} บิล + ออนไลน์ {formatNumber(on.orderCount)} ออเดอร์) · เฉลี่ย {formatCurrency(allChannelAvgOrderValue)}/ออเดอร์
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {on.channels.map(c => {
              const cmpCh = onCmp?.channels.find(x => x.zoneId === c.zoneId);
              const delta = onCmp ? pctDelta(c.sales, cmpCh?.sales) : c.momPct;
              const color = ONLINE_CHANNEL_COLORS[c.channel] ?? '#6B7280';
              return (
                <div
                  key={c.zoneId}
                  className="rounded-lg border border-[#2A2F36] bg-[#17191C]/92 p-4"
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide" style={{ color }}>{c.channel}</p>
                    <TrendBadge pct={delta} />
                  </div>
                  <p className="text-xl font-bold tabular-nums">{c.sales !== 0 ? formatCurrency(c.sales) : '—'}</p>
                  <p className="text-xs text-gray-500 mt-1 tabular-nums">
                    {c.sales !== 0 ? `${c.salesPct.toFixed(1)}% ของยอดออนไลน์` : 'ไม่มียอดขายในช่วงนี้'}
                  </p>
                  {c.returnAmount > 0 && (
                    <p className="text-xs text-red-400 mt-1 tabular-nums">หักคืนสินค้า −{formatCurrency(c.returnAmount)}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 tabular-nums">
                    {formatNumber(c.orderCount)} ออเดอร์ · {formatNumber(c.units)} ชิ้น
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#F5C400]" />
      </div>
    }>
      <OverviewContent />
    </Suspense>
  );
}
