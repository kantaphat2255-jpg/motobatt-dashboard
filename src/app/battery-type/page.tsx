'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import DateRangePicker from '@/components/ui/DateRangePicker';
import MetricCard from '@/components/ui/MetricCard';
import TrendBadge from '@/components/ui/TrendBadge';
import BatteryTypeStackedBar from '@/components/charts/BatteryTypeStackedBar';
import { formatCurrency, formatCurrencyShort, formatNumber } from '@/lib/utils';
import type { BatteryTypeRow, Tier } from '@/lib/types';
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

// Shares under 1% (e.g. a new product line) need a 2nd decimal or they read as "0.0%".
function fmtShare(pct: number): string {
  return pct >= 1 || pct === 0 ? `${pct.toFixed(1)}%` : `${pct.toFixed(2)}%`;
}

const TIER_COLS: { tier: Tier; label: string }[] = [
  { tier: 'A', label: 'เทียร์ A' },
  { tier: 'B', label: 'เทียร์ B' },
  { tier: 'C', label: 'เทียร์ C' },
  { tier: 'D', label: 'เทียร์ D' },
  { tier: 'Unknown', label: 'ไม่ระบุเทียร์' },
];

function TypeDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />;
}

function SkuCard({ type }: { type: BatteryTypeRow }) {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <TypeDot color={type.color} /> {type.label}
        <span className="text-xs font-normal text-gray-500">({type.skus.length} รุ่น)</span>
      </h3>
      {type.skus.length === 0 ? (
        <p className="text-gray-500 text-sm">ไม่มียอดขายในช่วงที่เลือก</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {type.skus.map(s => (
            <div key={s.itemId} className="flex items-center gap-3 text-sm" title={s.itemDesc}>
              <span className="flex-1 min-w-0 truncate text-white">{s.model}</span>
              <span className="text-xs text-gray-500 tabular-nums w-16 text-right">{formatNumber(s.units)} ชิ้น</span>
              <span className="tabular-nums font-medium w-24 text-right">{formatCurrency(s.sales)}</span>
              <span className="text-xs text-gray-400 tabular-nums w-12 text-right">{fmtShare(s.salesPct)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BatteryTypeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || searchParams.get('month') || undefined;
  const to = searchParams.get('to') || searchParams.get('month') || undefined;
  const { data, loading, error, refresh } = useDashboard(from, to);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /><span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span></div>;
  if (error || !data) return <div className="flex items-center gap-3 p-8 text-red-400"><AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span></div>;

  const { batteryTypes: bt, meta } = data;
  const cs = bt.channelSplit;
  const mainTypes = bt.types.filter(t => t.key !== 'other');
  const other = bt.types.find(t => t.key === 'other');
  const shownTiers = TIER_COLS.filter(c => c.tier !== 'Unknown' || bt.types.some(t => (t.tierSales.Unknown ?? 0) > 0));

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          {/* Keep the picker alone with the title, flush right and never wrapping: its
              popover opens leftwards from its right edge, so if a long description
              shares this row and pushes it to the left, the calendar spills off-screen. */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">ประเภทแบตเตอรี่</h1>
            <DateRangePicker minDate={meta.minDate} maxDate={meta.maxDate} from={meta.rangeFrom} to={meta.rangeTo} onChange={(f, t) => router.push(`/battery-type?from=${f}&to=${t}`)} />
          </div>
          <p className="text-xs text-gray-500">
            Motobatt MF · Quadflex · Pro LITHIUM — นับแบบ gross เหมือนหน้าอื่น (ไม่รวมคืน/เคลม, ไม่รวมโซน 40-70) ·
            การ์ด สัดส่วน ตาราง กราฟ และเทียร์ด้านล่างเป็นยอดดีลเลอร์เขตหลัก ตรงกับหน้าภาพรวมรายเดือน · ยอดออนไลน์ดูที่ส่วน &quot;ดีลเลอร์ vs ออนไลน์&quot;
          </p>
        </div>

        {other && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              มียอด {formatCurrency(other.sales)} จากสินค้าแบตเตอรี่ที่ชื่อไม่ตรงทั้ง 3 ประเภท (
              {other.skus.map(s => s.model).join(', ')}) — ตรวจชื่อสินค้าในชีต หรือเพิ่มประเภทใหม่ใน <code>classifyBatteryType</code>
            </p>
          </div>
        )}

        {/* Per-type cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mainTypes.map(t => (
            <MetricCard
              key={t.key}
              title={t.label}
              value={t.sales > 0 ? formatCurrency(t.sales) : '—'}
              subtitle={t.sales > 0 ? `${fmtShare(t.salesPct)} ของยอดแบตฯ · ${formatNumber(t.units)} ชิ้น` : 'ไม่มียอดขายในช่วงที่เลือก'}
              badge={<TrendBadge pct={t.momPct} />}
            />
          ))}
        </div>

        {/* Dealer vs online */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
            <h2 className="text-sm font-semibold text-gray-300">ยอดขายรวมทุกช่องทาง: ดีลเลอร์ vs ออนไลน์ (Net — หักคืนสินค้า/เคลมแล้ว)</h2>
            <p className="text-sm text-gray-400 tabular-nums">
              รวม <span className="text-[#F5C400] font-semibold">{formatCurrency(cs.totalSales)}</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            ดีลเลอร์ = เขตหลัก · ออนไลน์ = Lazada (80-01), Shopee (80-02), TikTok (80-03), Facebook (80-04) · ไม่รวมโซน 40-70 ·
            ส่วนนี้หักคืนสินค้า/เคลมทั้งดีลเลอร์และออนไลน์ (ยอดออนไลน์ต้องเป็น Net เสมอ) ตัวเลขดีลเลอร์จึงต่ำกว่าการ์ดและตารางส่วนอื่นของหน้านี้ที่เป็น Gross
          </p>

          <div className="flex h-4 rounded-md overflow-hidden bg-[#2A2A2A]">
            <div style={{ width: `${100 - cs.onlinePct}%`, background: '#F5C400' }} title={`ดีลเลอร์ ${fmtShare(100 - cs.onlinePct)}`} />
            <div style={{ width: `${cs.onlinePct}%`, background: '#38BDF8' }} title={`ออนไลน์ ${fmtShare(cs.onlinePct)}`} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 mb-5 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5"><TypeDot color="#F5C400" /> ดีลเลอร์ <span className="tabular-nums text-gray-300">{formatCurrency(cs.dealerSales)} ({fmtShare(100 - cs.onlinePct)})</span></span>
            <span className="inline-flex items-center gap-1.5"><TypeDot color="#38BDF8" /> ออนไลน์ <span className="tabular-nums text-gray-300">{formatCurrency(cs.onlineSales)} ({fmtShare(cs.onlinePct)})</span></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3 font-medium">ประเภท</th>
                  <th className="text-right py-2 px-3 font-medium">ดีลเลอร์</th>
                  {cs.channels.map(c => <th key={c} className="text-right py-2 px-3 font-medium">{c}</th>)}
                  <th className="text-right py-2 px-3 font-medium">ออนไลน์รวม</th>
                  <th className="text-right py-2 px-3 font-medium">รวมทุกช่องทาง</th>
                  <th className="text-right py-2 px-3 font-medium">สัดส่วนรวม</th>
                  <th className="text-right py-2 pl-3 font-medium">% ออนไลน์</th>
                </tr>
              </thead>
              <tbody>
                {cs.rows.map(r => (
                  <tr key={r.key} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-3 text-white font-medium"><span className="inline-flex items-center gap-2"><TypeDot color={r.color} />{r.label}</span></td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.dealerSales !== 0 ? formatCurrency(r.dealerSales) : <span className="text-gray-600">—</span>}</td>
                    {cs.channels.map(c => (
                      <td key={c} className="py-2 px-3 text-right tabular-nums text-gray-300">
                        {r.byChannel[c] !== 0 ? formatCurrency(r.byChannel[c]) : <span className="text-gray-600">—</span>}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{r.onlineSales !== 0 ? formatCurrency(r.onlineSales) : <span className="text-gray-600">—</span>}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#F5C400]">{formatCurrency(r.totalSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{fmtShare(r.totalPct)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-400">{r.totalSales > 0 ? fmtShare(r.onlinePct) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-gray-300 font-semibold">
                  <td className="py-2 pr-3">รวม</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(cs.dealerSales)}</td>
                  {cs.channels.map(c => (
                    <td key={c} className="py-2 px-3 text-right tabular-nums">{cs.byChannel[c] !== 0 ? formatCurrency(cs.byChannel[c]) : <span className="text-gray-600 font-normal">—</span>}</td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(cs.onlineSales)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#F5C400]">{formatCurrency(cs.totalSales)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">100%</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{fmtShare(cs.onlinePct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3 tabular-nums">
            หักคืนสินค้า/เคลมแล้ว: ดีลเลอร์ −{formatCurrency(cs.dealerReturns)} · ออนไลน์ −{formatCurrency(cs.onlineReturns)}
            {' '}(คืนหักออกจากเดือนที่ลงบิลคืน)
          </p>
          {cs.rows.some(r => r.key === 'other') && (
            <p className="text-xs text-gray-500 mt-1">
              แถว &quot;อื่นๆ (ไม่จัดประเภท)&quot; คือรายการคืนของสินค้าที่ไม่ใช่ 3 ประเภทนี้ (เช่น MOTOBATT GEL รุ่นที่เลิกขายแล้ว) จึงติดลบ — หักออกจากยอดรวมตามหลัก Net
            </p>
          )}
        </div>

        {/* Share bar */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">สัดส่วนยอดขายตามประเภท (ดีลเลอร์)</h2>
            <p className="text-sm text-gray-400 tabular-nums">
              รวม <span className="text-[#F5C400] font-semibold">{formatCurrency(bt.totalSales)}</span>
            </p>
          </div>
          <div className="flex h-5 rounded-md overflow-hidden bg-[#2A2A2A]">
            {bt.types.filter(t => t.sales > 0).map(t => (
              <div key={t.key} style={{ width: `${t.salesPct}%`, background: t.color }} title={`${t.label} ${fmtShare(t.salesPct)}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-400">
            {bt.types.map(t => (
              <span key={t.key} className="inline-flex items-center gap-1.5">
                <TypeDot color={t.color} /> {t.label} <span className="tabular-nums text-gray-300">{fmtShare(t.salesPct)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">สรุปตามประเภท</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3 font-medium">ประเภท</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดขาย (฿)</th>
                  <th className="text-right py-2 px-3 font-medium">สัดส่วน</th>
                  <th className="text-right py-2 px-3 font-medium">ชิ้น</th>
                  <th className="text-right py-2 px-3 font-medium">ลัง</th>
                  <th className="text-right py-2 px-3 font-medium">บิล</th>
                  <th className="text-right py-2 px-3 font-medium">เฉลี่ย/บิล</th>
                  <th className="text-right py-2 px-3 font-medium">ร้านที่ซื้อ</th>
                  <th className="text-right py-2 pl-3 font-medium">MoM</th>
                </tr>
              </thead>
              <tbody>
                {bt.types.map(t => (
                  <tr key={t.key} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-3 text-white font-medium"><span className="inline-flex items-center gap-2"><TypeDot color={t.color} />{t.label}</span></td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(t.sales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{fmtShare(t.salesPct)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(t.units)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(t.cases, 1)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{formatNumber(t.invoiceCount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{t.invoiceCount > 0 ? formatCurrency(t.avgPerInvoice) : '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {formatNumber(t.dealerCount)} <span className="text-xs text-gray-500">({fmtShare(t.dealerPct)})</span>
                    </td>
                    <td className="py-2 pl-3 text-right"><TrendBadge pct={t.momPct} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-gray-300 font-semibold">
                  <td className="py-2 pr-3">รวม</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#F5C400]">{formatCurrency(bt.totalSales)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">100%</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(bt.totalUnits)}</td>
                  <td colSpan={3} />
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(bt.activeDealers)} <span className="text-xs text-gray-500 font-normal">ร้าน</span></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ร้านที่ซื้อ = จำนวนร้านที่ซื้อประเภทนั้นในช่วงที่เลือก (% ของร้านที่ active ทั้งหมด) — ร้านเดียวซื้อได้หลายประเภท จึงรวมกันเกินจำนวนร้านรวมได้ · MoM เทียบช่วงวันที่เดียวกันของเดือนก่อน · ลัง = ชิ้น ÷ 10 ตามสูตรเดิมของแอป
          </p>
        </div>

        {/* Monthly charts */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ยอดขายรายเดือนแยกตามประเภท (6 เดือนล่าสุด)</h2>
          <BatteryTypeStackedBar months={bt.months} types={bt.types} />
        </div>
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">Quadflex และ Pro LITHIUM (ไม่รวม MF)</h2>
          <p className="text-xs text-gray-500 mb-4">แยกกราฟออกมาเพราะยอด MF สูงกว่ามาก ทำให้สองประเภทนี้ดูเล็กจนเทียบเดือนต่อเดือนไม่ได้ในกราฟบน</p>
          <BatteryTypeStackedBar months={bt.months} types={bt.types} include={['quadflex', 'lithium']} height={200} />
        </div>

        {/* Monthly mix table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">สัดส่วนยอดขายรายเดือน (%)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดรวม</th>
                  {bt.types.map(t => (
                    <th key={t.key} className="text-right py-2 px-3 font-medium" style={{ color: t.color }}>{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bt.months.map(m => (
                  <tr key={m.month} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-4 text-gray-300 font-medium">{m.label}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-[#F5C400] font-medium">{formatCurrency(m.total)}</td>
                    {bt.types.map(t => (
                      <td key={t.key} className="py-2 px-3 text-right tabular-nums">
                        {m.sales[t.key] > 0 ? (
                          <div>
                            <span className="font-medium text-gray-200">{fmtShare(m.salesPct[t.key])}</span>
                            <div className="text-xs text-gray-500">{formatCurrencyShort(m.sales[t.key])}</div>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tier × type */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">ยอดขายแต่ละประเภท แยกตามเทียร์ดีลเลอร์</h2>
          <p className="text-xs text-gray-500 mb-4">% ในวงเล็บ = สัดส่วนของประเภทนั้นเอง (แต่ละแถวรวม 100%)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-4 font-medium">ประเภท</th>
                  {shownTiers.map(c => <th key={c.tier} className="text-right py-2 px-3 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {bt.types.map(t => (
                  <tr key={t.key} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-4 text-white font-medium"><span className="inline-flex items-center gap-2"><TypeDot color={t.color} />{t.label}</span></td>
                    {shownTiers.map(c => {
                      const v = t.tierSales[c.tier] ?? 0;
                      return (
                        <td key={c.tier} className="py-2 px-3 text-right tabular-nums">
                          {v > 0 ? (
                            <>
                              <span className="font-medium">{formatCurrency(v)}</span>
                              <span className="text-xs text-gray-500 ml-1">({fmtShare((v / t.sales) * 100)})</span>
                            </>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SKUs per type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bt.types.map(t => <SkuCard key={t.key} type={t} />)}
        </div>
      </div>
    </>
  );
}

export default function BatteryTypePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <BatteryTypeContent />
    </Suspense>
  );
}
