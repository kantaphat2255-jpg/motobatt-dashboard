'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { BatteryTypeMonth, BatteryTypeRow, BatteryTypeKey } from '@/lib/types';

interface Props {
  months: BatteryTypeMonth[];
  types: BatteryTypeRow[];
  // Which product lines to draw. Lets the page render a second chart without MF,
  // whose volume otherwise flattens Quadflex/Lithium into invisible slivers.
  include?: BatteryTypeKey[];
  height?: number;
}

function formatM(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

export default function BatteryTypeStackedBar({ months, types, include, height = 240 }: Props) {
  const shown = types.filter(t => !include || include.includes(t.key));
  const data = months.map(m => {
    const row: Record<string, string | number> = { label: m.label };
    for (const t of shown) row[t.label] = Math.round(m.sales[t.key] ?? 0);
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatM} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [new Intl.NumberFormat('th-TH').format(v) + ' ฿', '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {shown.map(t => (
          <Bar key={t.key} dataKey={t.label} stackId="type" fill={t.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
