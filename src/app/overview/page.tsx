'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import MetricCard from '@/components/ui/MetricCard';
import ProgressBar from '@/components/ui/ProgressBar';
import MonthSelector from '@/components/ui/MonthSelector';
import TrendBadge from '@/components/ui/TrendBadge';
import { formatCurrency, formatNumber, formatCurrencyShort, getCurrentMonthYYYYMM } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

function OverviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultMonth = getCurrentMonthYYYYMM();
  const from = searchParams.get('from') || searchParams.get('month') || defaultMonth;
  const to = searchParams.get('to') || searchParams.get('month') || from;
  const { data, loading, error, refresh } = useDashboard(from, to);

  const handleMonthChange = (f: string, t: string) => {
    router.push(`/overview?from=${f}&to=${t}`);
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

  const { overview: ov, meta } = data;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F5C400]">Motobatt Thailand</p>
          <h1 className="mt-2 text-2xl font-bold text-white">ภาพรวมรายเดือน</h1>
          <p className="mt-1 text-sm text-gray-500">Sales performance, target progress, and dealer activity</p>
          <MonthSelector
            availableMonths={meta.availableMonths}
            from={from}
            to={to}
            onChange={handleMonthChange}
          />
        </div>

        {/* MTD Sales + Progress */}
        <div className="relative overflow-hidden rounded-lg border border-[#343A43] bg-[#17191C]/95 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C400]/70 to-transparent" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ยอดขาย MTD</p>
              <p className="text-4xl font-bold text-[#F5C400] tabular-nums leading-none">
                {formatCurrency(ov.mtdSales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {ov.isCurrentMonth
                  ? `วันที่ ${ov.daysElapsed} จาก ${ov.daysTotal} วัน`
                  : from !== to
                  ? `${ov.fromMonth.slice(4,6)}/${ov.fromMonth.slice(0,4)} – ${ov.toMonth.slice(4,6)}/${ov.toMonth.slice(0,4)}`
                  : `ยอดขายทั้งเดือน (ปิดแล้ว)`}
              </p>
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

        {/* Row 1: 4 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="ทำเป้าได้"
            value={ov.achievementPct !== null ? `${ov.achievementPct.toFixed(1)}%` : '-'}
            subtitle={ov.target ? `เป้า ${formatCurrencyShort(ov.target)}` : 'ไม่มีเป้า'}
            highlight={ov.achievementPct !== null && ov.achievementPct >= 100}
          />
          <MetricCard
            title="หน่วยทั้งหมด (ชิ้น)"
            value={formatNumber(ov.mtdUnits)}
            subtitle={`${formatNumber(ov.mtdCases, 1)} ลัง`}
          />
          <MetricCard
            title="ดีลเลอร์ที่ขายได้"
            value={formatNumber(ov.activeDealers) + ' ราย'}
            subtitle="เดือนนี้"
          />
          <MetricCard
            title="เทียบเดือนก่อน (MoM)"
            value={ov.momPct !== null ? `${ov.momPct >= 0 ? '+' : ''}${ov.momPct.toFixed(1)}%` : '-'}
            subtitle={`ก่อนหน้า ${formatCurrencyShort(ov.prevMonthSales)}`}
            badge={<TrendBadge pct={ov.momPct} />}
          />
        </div>

        {/* Row 2: projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title={ov.isCurrentMonth ? 'คาดการณ์สิ้นเดือน' : 'ยอดขายจริงทั้งเดือน'}
            value={formatCurrency(ov.projectedMonthEnd)}
            subtitle={
              ov.target
                ? `${ov.projectedMonthEnd >= ov.target ? '✓ เกินเป้า' : '✗ ต่ำกว่าเป้า'} ${formatCurrencyShort(ov.target)}`
                : undefined
            }
          />
          <MetricCard
            title={ov.isCurrentMonth ? 'ต้องขายต่อวัน (เพื่อถึงเป้า)' : 'ผลต่างจากเป้าหมาย'}
            value={
              ov.isCurrentMonth
                ? formatCurrency(Math.max(0, ov.requiredDailyOrGap)) + '/วัน'
                : formatCurrency(Math.abs(ov.requiredDailyOrGap))
            }
            subtitle={
              ov.isCurrentMonth
                ? `เหลือ ${ov.daysRemaining} วัน`
                : ov.requiredDailyOrGap >= 0 ? 'เกินเป้า' : 'ต่ำกว่าเป้า'
            }
            highlight={!ov.isCurrentMonth && ov.requiredDailyOrGap >= 0}
          />
          <MetricCard
            title="จำนวนลังที่ขายได้"
            value={formatNumber(ov.mtdCases, 1) + ' ลัง'}
            subtitle={`${formatNumber(ov.mtdUnits)} ชิ้น รวม`}
          />
        </div>

        {/* Day progress */}
        {ov.isCurrentMonth && (
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
