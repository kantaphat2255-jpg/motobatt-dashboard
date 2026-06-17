'use client';

import { useState, Suspense, useMemo } from 'react';
import { useDealerRfm } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import { formatCurrency, formatNumber, formatDateThai } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { DealerRfmRow } from '@/lib/types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const SEGMENT_COLORS: Record<string, string> = {
  VIP: '#F5C400',
  Loyal: '#60A5FA',
  Potential: '#34D399',
  'At Risk': '#F97316',
  Lost: '#EF4444',
  New: '#A78BFA',
  Normal: '#6B7280',
};

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

function SegmentBadge({ segment }: { segment: string }) {
  const color = SEGMENT_COLORS[segment] ?? '#6B7280';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: color + '22', color }}
    >
      {segment}
    </span>
  );
}

function ScoreDot({ score }: { score: number }) {
  const colors = ['', '#EF4444', '#F97316', '#EAB308', '#60A5FA', '#F5C400'];
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
      style={{ background: colors[score] + '33', color: colors[score] }}
    >
      {score}
    </span>
  );
}

const ALL_SEGMENTS = ['VIP', 'Loyal', 'Potential', 'Normal', 'New', 'At Risk', 'Lost'];
const ALL_TIERS = ['A', 'B', 'C', 'D', 'Unknown'];

function DealerRfmContent() {
  const { data, loading, error, refresh } = useDealerRfm();
  const [segmentFilter, setSegmentFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.dealers.filter(d => {
      if (segmentFilter && d.segment !== segmentFilter) return false;
      if (tierFilter && d.tier !== tierFilter) return false;
      return true;
    });
  }, [data, segmentFilter, tierFilter]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F5C400]" />
      <span className="ml-3 text-gray-400">กำลังคำนวณคะแนน RFM...</span>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center gap-3 p-8 text-red-400">
      <AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span>
    </div>
  );

  const { meta, segmentCounts } = data;
  const latest = meta.availableMonths[meta.availableMonths.length - 1] ?? '';

  return (
    <>
      <DataFreshness
        meta={{ fetchedAt: meta.fetchedAt, totalRawRows: 0, validRows: 0, invalidRows: 0, latestMonth: latest, tierJoinFailCount: 0, tierJoinFailIds: [], availableMonths: meta.availableMonths }}
        onRefresh={refresh}
        loading={loading}
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">RFM Score ดีลเลอร์</h1>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#1C1C1C] border border-[#3A3A3A] text-gray-400 hover:border-[#F5C400] hover:text-white transition-colors"
          >
            <RefreshCw size={12} />
            รีเฟรช
          </button>
        </div>

        {/* Segment summary */}
        <div className="flex flex-wrap gap-2">
          {ALL_SEGMENTS.filter(s => segmentCounts[s]).map(s => {
            const color = SEGMENT_COLORS[s] ?? '#6B7280';
            const active = segmentFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSegmentFilter(active ? '' : s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                style={{
                  background: active ? color + '33' : color + '11',
                  borderColor: active ? color : color + '44',
                  color,
                }}
              >
                {s}
                <span className="opacity-70">{segmentCounts[s]}</span>
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
          {(segmentFilter || tierFilter) && (
            <button
              onClick={() => { setSegmentFilter(''); setTierFilter(''); }}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} รายการ</span>
        </div>

        {/* RFM table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3 font-medium">รหัส</th>
                  <th className="text-left py-2 pr-3 font-medium">ชื่อดีลเลอร์</th>
                  <th className="text-center py-2 px-2 font-medium">เทียร์</th>
                  <th className="text-center py-2 px-2 font-medium">Segment</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดขายรวม</th>
                  <th className="text-right py-2 px-3 font-medium">ค่าเฉลี่ย/ใบ</th>
                  <th className="text-right py-2 px-2 font-medium">ครั้ง</th>
                  <th className="text-right py-2 px-2 font-medium">วันล่าสุด</th>
                  <th className="text-center py-2 px-2 font-medium">R</th>
                  <th className="text-center py-2 px-2 font-medium">F</th>
                  <th className="text-center py-2 px-2 font-medium">M</th>
                  <th className="text-center py-2 pl-2 font-medium">RFM</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: DealerRfmRow) => (
                  <tr key={d.customerId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{d.customerId}</td>
                    <td className="py-2 pr-3 text-white">{d.customerName}</td>
                    <td className="py-2 px-2 text-center"><TierBadge tier={d.tier} /></td>
                    <td className="py-2 px-2 text-center"><SegmentBadge segment={d.segment} /></td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(d.totalMonetarySales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatCurrency(d.avgOrderValue)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-400">{d.invoiceFrequency}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-400 text-xs">
                      {formatDateThai(d.lastInvoiceDate)}
                      {d.daysSinceLastPurchase !== null && (
                        <div className="text-gray-600">{d.daysSinceLastPurchase} วัน</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center"><ScoreDot score={d.recencyScore} /></td>
                    <td className="py-2 px-2 text-center"><ScoreDot score={d.frequencyScore} /></td>
                    <td className="py-2 px-2 text-center"><ScoreDot score={d.monetaryScore} /></td>
                    <td className="py-2 pl-2 text-center">
                      <span className="font-bold text-[#F5C400] tabular-nums">{d.rfmScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center">ไม่มีข้อมูลตามตัวกรองที่เลือก</p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">คำอธิบาย RFM</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
            <div><span className="text-white font-medium">R (Recency)</span> — วันที่สั่งซื้อล่าสุด (5 = ล่าสุด)</div>
            <div><span className="text-white font-medium">F (Frequency)</span> — จำนวนครั้งที่สั่งซื้อ (5 = บ่อยที่สุด)</div>
            <div><span className="text-white font-medium">M (Monetary)</span> — ยอดซื้อรวม (5 = สูงที่สุด)</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DealerRfmPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <DealerRfmContent />
    </Suspense>
  );
}
