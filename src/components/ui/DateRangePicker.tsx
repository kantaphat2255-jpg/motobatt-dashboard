'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { THAI_MONTHS_FULL } from '@/lib/constants';
import {
  type Granularity, type Preset, type CompareMode,
  todayISO, buildPresets, matchPresetKey, snapRange, compareRangeFor,
  formatDateRangeThai, startOfMonthISO, addMonthsISO,
} from '@/lib/dateRange';

interface CompareRange { from: string; to: string; }

interface DateRangePickerProps {
  minDate: string;
  maxDate: string;
  from: string;
  to: string;
  compareFrom?: string | null;
  compareTo?: string | null;
  onChange: (from: string, to: string, compare: CompareRange | null) => void;
}

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'day', label: 'วัน' },
  { key: 'month', label: 'เดือน' },
  { key: 'quarter', label: 'ไตรมาส' },
];

function monthCells(monthISO: string): (string | null)[] {
  const [y, m] = monthISO.split('-').map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysIn; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

function MonthGrid({
  monthISO, from, to, minDate, maxDate, onPick, onHover, hover,
}: {
  monthISO: string; from: string; to: string; minDate: string; maxDate: string;
  onPick: (iso: string) => void; onHover: (iso: string | null) => void; hover: string | null;
}) {
  const [y, m] = monthISO.split('-').map(Number);
  const cells = monthCells(monthISO);
  // Preview range while hovering the second endpoint.
  const previewTo = hover && from === to ? hover : to;
  const lo = from <= previewTo ? from : previewTo;
  const hi = from <= previewTo ? previewTo : from;

  return (
    <div className="w-[15rem]">
      <p className="text-center text-sm font-semibold text-white mb-2">
        {THAI_MONTHS_FULL[m - 1]} {y}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map(w => (
          <span key={w} className="text-[11px] text-gray-500 font-medium py-1">{w}</span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} />;
          const disabled = iso < minDate || iso > maxDate;
          const inRange = iso >= lo && iso <= hi;
          const isStart = iso === from;
          const isEnd = iso === to;
          const edge = isStart || isEnd;
          const day = Number(iso.slice(8, 10));
          return (
            <button
              key={iso}
              disabled={disabled}
              onClick={() => onPick(iso)}
              onMouseEnter={() => onHover(iso)}
              onMouseLeave={() => onHover(null)}
              className={[
                'h-8 text-xs tabular-nums transition-colors',
                disabled ? 'text-gray-700 cursor-not-allowed' : 'cursor-pointer',
                inRange && !edge ? 'bg-[#F5C400]/15 text-white' : '',
                edge ? 'bg-[#F5C400] text-[#0A0B0D] font-bold rounded-md' : '',
                !inRange && !edge && !disabled ? 'text-gray-300 hover:bg-[#202328] rounded-md' : '',
                inRange && !edge ? (iso === lo ? 'rounded-l-md' : iso === hi ? 'rounded-r-md' : '') : '',
              ].join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  minDate, maxDate, from, to, compareFrom, compareTo, onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [compareOn, setCompareOn] = useState(!!(compareFrom && compareTo));
  const [compareMode, setCompareMode] = useState<CompareMode>('prevMonth');
  const [viewMonth, setViewMonth] = useState(() => startOfMonthISO(addMonthsISO(to, -1)));
  const rootRef = useRef<HTMLDivElement>(null);

  const today = todayISO();
  const presets = useMemo(() => buildPresets(today, minDate, maxDate), [today, minDate, maxDate]);

  // Sync draft with props whenever the popover opens.
  useEffect(() => {
    if (open) {
      setDraftFrom(from);
      setDraftTo(to);
      setCompareOn(!!(compareFrom && compareTo));
      setPendingStart(null);
      setViewMonth(startOfMonthISO(addMonthsISO(to, -1)));
    }
  }, [open, from, to, compareFrom, compareTo]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activePreset = matchPresetKey(presets, draftFrom, draftTo);
  const compareRange = compareOn ? compareRangeFor(draftFrom, draftTo, compareMode) : null;

  const clamp = (iso: string) => (iso < minDate ? minDate : iso > maxDate ? maxDate : iso);

  function pickDay(iso: string) {
    if (iso < minDate || iso > maxDate) return;
    if (!pendingStart) {
      const snapped = snapRange(iso, iso, granularity);
      setDraftFrom(clamp(snapped.from));
      setDraftTo(clamp(snapped.to));
      setPendingStart(iso);
    } else {
      const a = pendingStart <= iso ? pendingStart : iso;
      const b = pendingStart <= iso ? iso : pendingStart;
      const snapped = snapRange(a, b, granularity);
      setDraftFrom(clamp(snapped.from));
      setDraftTo(clamp(snapped.to));
      setPendingStart(null);
    }
  }

  function applyPreset(p: Preset) {
    setGranularity(p.granularity);
    setDraftFrom(p.from);
    setDraftTo(p.to);
    setPendingStart(null);
    setViewMonth(startOfMonthISO(addMonthsISO(p.to, -1)));
  }

  function changeGranularity(g: Granularity) {
    setGranularity(g);
    setPendingStart(null);
    const snapped = snapRange(draftFrom, draftTo, g);
    setDraftFrom(clamp(snapped.from));
    setDraftTo(clamp(snapped.to));
  }

  function apply() {
    onChange(draftFrom, draftTo, compareOn ? compareRangeFor(draftFrom, draftTo, compareMode) : null);
    setOpen(false);
  }

  const rightMonth = addMonthsISO(viewMonth, 1);
  const minMonth = startOfMonthISO(minDate);
  const maxMonth = startOfMonthISO(maxDate);
  const canPrev = viewMonth > minMonth;
  const canNext = rightMonth < maxMonth;

  const triggerLabel = formatDateRangeThai(from, to);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-lg border border-[#2A2F36] bg-[#111316]/80 px-3.5 py-2 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-colors hover:border-[#F5C400]/60 cursor-pointer"
      >
        <Calendar size={15} className="text-[#F5C400]" />
        <span className="font-semibold tabular-nums">{triggerLabel}</span>
        {compareFrom && compareTo && (
          <span className="text-xs text-gray-500">· เทียบช่วงก่อน</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 flex rounded-xl border border-[#2A2F36] bg-[#0A0B0D] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          {/* Presets */}
          <div className="w-44 border-r border-[#252A31] py-3">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p)}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                  activePreset === p.key ? 'text-[#F5C400] font-semibold' : 'text-gray-300 hover:bg-[#17191C]'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full border ${
                  activePreset === p.key ? 'border-[#F5C400] bg-[#F5C400]' : 'border-gray-600'
                }`} />
                {p.label}
              </button>
            ))}
            <div className="mt-1 flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-500">
              <span className={`h-2.5 w-2.5 rounded-full border ${
                activePreset === null ? 'border-[#F5C400] bg-[#F5C400]' : 'border-gray-600'
              }`} />
              กำหนดเอง
            </div>
          </div>

          {/* Calendar + controls */}
          <div className="p-4">
            {/* Granularity toggle */}
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex rounded-lg border border-[#2A2F36] bg-[#111316] p-0.5">
                {GRANULARITIES.map(g => (
                  <button
                    key={g.key}
                    onClick={() => changeGranularity(g.key)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      granularity === g.key ? 'bg-[#F5C400] text-[#0A0B0D]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={!canPrev}
                  onClick={() => setViewMonth(addMonthsISO(viewMonth, -1))}
                  className="rounded-md p-1.5 text-gray-400 enabled:hover:bg-[#202328] enabled:hover:text-white disabled:text-gray-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={!canNext}
                  onClick={() => setViewMonth(addMonthsISO(viewMonth, 1))}
                  className="rounded-md p-1.5 text-gray-400 enabled:hover:bg-[#202328] enabled:hover:text-white disabled:text-gray-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Dual calendar */}
            <div className="flex gap-5">
              <MonthGrid monthISO={viewMonth} from={draftFrom} to={draftTo} minDate={minDate} maxDate={maxDate} onPick={pickDay} onHover={setHover} hover={hover} />
              <MonthGrid monthISO={rightMonth} from={draftFrom} to={draftTo} minDate={minDate} maxDate={maxDate} onPick={pickDay} onHover={setHover} hover={hover} />
            </div>

            {/* Compare + range display */}
            <div className="mt-4 flex items-center justify-between border-t border-[#252A31] pt-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={compareOn}
                    onChange={e => setCompareOn(e.target.checked)}
                    className="h-4 w-4 accent-[#F5C400] cursor-pointer"
                  />
                  เปรียบเทียบ
                </label>
                {compareOn && (
                  <div className="inline-flex rounded-md border border-[#2A2F36] bg-[#111316] p-0.5 text-[11px]">
                    {([['prevMonth', 'เดือนก่อน'], ['prevPeriod', 'ช่วงก่อน']] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => setCompareMode(mode)}
                        className={`rounded px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                          compareMode === mode ? 'bg-[#F5C400] text-[#0A0B0D]' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right text-xs tabular-nums">
                <p className="text-white font-semibold">{formatDateRangeThai(draftFrom, draftTo)}</p>
                {compareRange && (
                  <p className="text-gray-500">เทียบ: {formatDateRangeThai(compareRange.from, compareRange.to)}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#2A2F36] px-4 py-1.5 text-xs font-semibold text-gray-300 hover:bg-[#17191C] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={apply}
                className="rounded-md bg-[#F5C400] px-5 py-1.5 text-xs font-bold text-[#0A0B0D] shadow-[0_8px_18px_rgba(245,196,0,0.25)] hover:brightness-105 cursor-pointer"
              >
                อัพเดต
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
