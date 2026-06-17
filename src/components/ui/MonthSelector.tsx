'use client';

import { useState, useEffect } from 'react';
import { getCurrentMonthYYYYMM, formatMonthLabel, shiftMonths } from '@/lib/utils';

interface MonthSelectorProps {
  availableMonths: string[];
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export default function MonthSelector({ availableMonths, from, to, onChange }: MonthSelectorProps) {
  const latest = availableMonths[availableMonths.length - 1] || getCurrentMonthYYYYMM();
  const yr = latest.slice(0, 4);

  const presets = [
    { label: 'เดือนนี้', from: latest, to: latest },
    { label: '2 เดือน', from: shiftMonths(latest, -1), to: latest },
    { label: '3 เดือน', from: shiftMonths(latest, -2), to: latest },
    { label: 'Q1', from: `${yr}01`, to: `${yr}03` },
    { label: 'Q2', from: `${yr}04`, to: `${yr}06` },
    { label: 'Q3', from: `${yr}07`, to: `${yr}09` },
    { label: 'Q4', from: `${yr}10`, to: `${yr}12` },
  ].filter(p => availableMonths.some(m => m >= p.from && m <= p.to));

  const matchedPreset = presets.find(p => p.from === from && p.to === to);
  const [showCustom, setShowCustom] = useState(!matchedPreset);

  useEffect(() => {
    if (!presets.find(p => p.from === from && p.to === to)) setShowCustom(true);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-1.5 justify-end rounded-lg border border-[#2A2F36] bg-[#111316]/80 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        {presets.map(p => {
          const active = p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              onClick={() => { onChange(p.from, p.to); setShowCustom(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#F5C400] text-[#0A0B0D] shadow-[0_8px_18px_rgba(245,196,0,0.2)]'
                  : 'text-gray-400 hover:bg-[#202328] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom(v => !v)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
            showCustom && !matchedPreset
              ? 'bg-[#F5C400] text-[#0A0B0D] shadow-[0_8px_18px_rgba(245,196,0,0.2)]'
              : 'text-gray-400 hover:bg-[#202328] hover:text-white'
          }`}
        >
          เลือกเอง
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border border-[#2A2F36] bg-[#111316]/80 p-1.5">
          <select
            value={from}
            onChange={e => { const f = e.target.value; onChange(f, f > to ? f : to); }}
            className="appearance-none bg-[#17191C] border border-[#2A2F36] text-white text-xs rounded-md pl-2.5 pr-7 py-1.5 cursor-pointer hover:border-[#F5C400]/60 focus:outline-none focus:border-[#F5C400] transition-colors"
          >
            {[...availableMonths].reverse().map(m => (
              <option key={m} value={m}>{formatMonthLabel(m, true)}</option>
            ))}
          </select>
          <span className="text-gray-500 text-xs">–</span>
          <select
            value={to}
            onChange={e => { const t = e.target.value; onChange(t < from ? t : from, t); }}
            className="appearance-none bg-[#17191C] border border-[#2A2F36] text-white text-xs rounded-md pl-2.5 pr-7 py-1.5 cursor-pointer hover:border-[#F5C400]/60 focus:outline-none focus:border-[#F5C400] transition-colors"
          >
            {[...availableMonths].reverse().map(m => (
              <option key={m} value={m}>{formatMonthLabel(m, true)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
