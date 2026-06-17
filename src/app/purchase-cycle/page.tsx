'use client';

import { useState, Suspense, useMemo } from 'react';
import { usePurchaseCycle } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import { formatNumber, formatDateThai } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { CycleStatus, PurchaseCycleRow } from '@/lib/types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG: Record<CycleStatus, { label: string; color: string; bg: string }> = {
  not_enough_data: { label: 'ข้อมูลไม่เพียงพอ', color: '#6B7280', bg: '#6B728022' },
  on_track:        { label: 'ปกติ', color: '#34D399', bg: '#34D39922' },
  due_soon:        { label: 'ใกล้ครบรอบ', color: '#60A5FA', bg: '#60A5FA22' },
  overdue:         { label: 'เกินกำหนด', color: '#F97316', bg: '#F9731622' },
  critical:        { label: 'วิกฤต', color: '#EF4444', bg: '#EF444422' },
};

const STATUS_ORDER: CycleStatus[] = ['critical', 'overdue', 'due_soon', 'on_track', 'not_enough_data'];

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

function StatusBadge({ status }: { status: CycleStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

const ALL_TIERS = ['A', 'B', 'C', 'D', 'Unknown'];

function PurchaseCycleContent() {
  const { data, loading, error, refresh } = usePurchaseCycle();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [minOverdue, setMinOverdue] = useState<string>('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.dealers.filter(d => {
      if (statusFilter && d.status !== statusFilter) return false;
      if (tierFilter && d.tier !== tierFilter) return false;
      if (minOverdue) {
        const minDays = parseInt(minOverdue, 10);
        if (!isNaN(minDays) && (d.daysOverdue ?? 0) < minDays) return false;
      }
      return true;
    });
  }, [data, statusFilter, tierFilter, minOverdue]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F5C400]" />
      <span className="ml-3 text-gray-400">กำลังวิเคราะห์รอบการสั่งซื้อ...</span>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center gap-3 p-8 text-red-400">
      <AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span>
    </div>
  );

  const { meta } = data;
  const latest = meta.availableMonths[meta.availableMonths.length - 1] ?? '';

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const d of data.dealers) statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;

  // Sort filtered: critical → overdue → due_soon → on_track → not_enough_data, then by daysOverdue desc
  const sortedFiltered = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
  });

  return (
    <>
      <DataFreshness
        meta={{ fetchedAt: meta.fetchedAt, totalRawRows: 0, validRows: 0, invalidRows: 0, latestMonth: latest, tierJoinFailCount: 0, tierJoinFailIds: [], availableMonths: meta.availableMonths }}
        onRefresh={refresh}
        loading={loading}
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">รอบการสั่งซื้อดีลเลอร์</h1>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#1C1C1C] border border-[#3A3A3A] text-gray-400 hover:border-[#F5C400] hover:text-white transition-colors"
          >
            <RefreshCw size={12} />
            รีเฟรช
          </button>
        </div>

        {/* Status summary chips */}
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.filter(s => statusCounts[s]).map(s => {
            const { label, color, bg } = STATUS_CONFIG[s];
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? '' : s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                style={{
                  background: active ? bg : color + '11',
                  borderColor: active ? color : color + '44',
                  color,
                }}
              >
                {label}
                <span className="opacity-70">{statusCounts[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-gray-500">กรอง:</span>
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
          >
            <option value="">ทุกเทียร์</option>
            {ALL_TIERS.filter(t => data.dealers.some(d => d.tier === t)).map(t => (
              <option key={t} value={t}>{TIER_LABELS[t] ?? t}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">เกินกำหนดขั้นต่ำ</span>
            <input
              type="number"
              min={0}
              placeholder="วัน"
              value={minOverdue}
              onChange={e => setMinOverdue(e.target.value)}
              className="w-20 bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#F5C400] transition-colors"
            />
          </div>
          {(statusFilter || tierFilter || minOverdue) && (
            <button
              onClick={() => { setStatusFilter(''); setTierFilter(''); setMinOverdue(''); }}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{sortedFiltered.length} รายการ</span>
        </div>

        {/* Purchase cycle table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3 font-medium">รหัส</th>
                  <th className="text-left py-2 pr-3 font-medium">ชื่อดีลเลอร์</th>
                  <th className="text-center py-2 px-2 font-medium">เทียร์</th>
                  <th className="text-center py-2 px-2 font-medium">สถานะ</th>
                  <th className="text-right py-2 px-3 font-medium">ใบแจ้งหนี้</th>
                  <th className="text-right py-2 px-3 font-medium">รอบเฉลี่ย</th>
                  <th className="text-right py-2 px-3 font-medium">มัธยฐาน</th>
                  <th className="text-right py-2 px-2 font-medium">ล่าสุด</th>
                  <th className="text-right py-2 px-2 font-medium">นัดหมายถัดไป</th>
                  <th className="text-right py-2 pl-2 font-medium">เกินกำหนด</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((d: PurchaseCycleRow) => (
                  <tr key={d.customerId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{d.customerId}</td>
                    <td className="py-2 pr-3 text-white">{d.customerName}</td>
                    <td className="py-2 px-2 text-center"><TierBadge tier={d.tier} /></td>
                    <td className="py-2 px-2 text-center"><StatusBadge status={d.status} /></td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-300">{d.invoiceCount}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-300">
                      {d.avgDaysBetween !== null ? `${formatNumber(d.avgDaysBetween)} วัน` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">
                      {d.medianDaysBetween !== null ? `${formatNumber(d.medianDaysBetween)} วัน` : '-'}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-400 text-xs">{formatDateThai(d.lastInvoiceDate)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-xs">
                      {d.expectedNextDate ? (
                        <span className={d.daysOverdue && d.daysOverdue > 0 ? 'text-red-400' : 'text-gray-300'}>
                          {formatDateThai(d.expectedNextDate)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums font-medium">
                      {d.daysOverdue !== null && d.daysOverdue > 0 ? (
                        <span className={d.daysOverdue > 14 ? 'text-red-400' : 'text-amber-400'}>
                          {d.daysOverdue} วัน
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedFiltered.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center">ไม่มีข้อมูลตามตัวกรองที่เลือก</p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">คำอธิบายสถานะ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {STATUS_ORDER.map(s => {
              const { label, color } = STATUS_CONFIG[s];
              const desc: Record<CycleStatus, string> = {
                on_track:        'คาดว่าจะสั่งซื้ออีกมากกว่า 7 วัน',
                due_soon:        'คาดว่าจะสั่งซื้อใน 7 วัน',
                overdue:         'เกินกำหนด 1–14 วัน',
                critical:        'เกินกำหนดมากกว่า 14 วัน',
                not_enough_data: 'มีประวัติน้อยกว่า 2 ครั้ง',
              };
              return (
                <div key={s} className="flex items-start gap-2">
                  <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span style={{ color }}>{label}</span>
                  <span className="text-gray-500">— {desc[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PurchaseCyclePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <PurchaseCycleContent />
    </Suspense>
  );
}
