'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ZoneTrendPoint } from '@/lib/types';

interface Props {
  points: ZoneTrendPoint[];
}

function formatM(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

export default function ZoneTrendChart({ points }: Props) {
  const data = points.map(p => ({
    label: p.label,
    ยอดขาย: Math.round(p.sales),
    ดีลเลอร์: p.dealerCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="sales" tickFormatter={formatM}
          tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
        />
        <YAxis
          yAxisId="dealers" orientation="right"
          tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={28}
        />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#E5E7EB' }}
          formatter={(v: number, name: string) =>
            name === 'ยอดขาย' ? [new Intl.NumberFormat('th-TH').format(v) + ' ฿', name] : [`${v} ราย`, name]
          }
        />
        <Bar yAxisId="sales" dataKey="ยอดขาย" fill="#F5C400" radius={[3, 3, 0, 0]} barSize={16} />
        <Line
          yAxisId="dealers" type="monotone" dataKey="ดีลเลอร์"
          stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
