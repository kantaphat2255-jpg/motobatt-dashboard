'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface WarningBannerProps {
  count: number;
  ids: string[];
}

export default function WarningBanner({ count, ids }: WarningBannerProps) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 w-full text-left cursor-pointer"
      >
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <span className="text-amber-400 text-sm font-medium">
          ไม่พบข้อมูลเทียร์: {count} รหัสลูกค้า
        </span>
        <span className="ml-auto text-gray-500">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <p className="text-xs text-gray-400 mb-2">
            รหัสลูกค้าเหล่านี้ถูกจัดเป็น "ไม่ระบุเทียร์" — กรุณาตรวจสอบชีท รายชื่อลูกค้าทั้งหมด
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {ids.map(id => (
              <span key={id} className="px-2 py-0.5 rounded bg-[#2A2A2A] text-amber-300 text-xs tabular-nums">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
