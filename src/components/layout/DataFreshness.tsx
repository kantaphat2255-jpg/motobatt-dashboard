import type { DataMeta } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  meta: DataMeta;
  onRefresh?: () => void;
  loading?: boolean;
}

function fmt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function DataFreshness({ meta, onRefresh, loading }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 bg-[#111316]/86 border-b border-[#252A31] text-xs text-gray-400 backdrop-blur">
      <span>
        อัปเดต: <span className="text-gray-300">{fmt(meta.fetchedAt)}</span>
      </span>
      <span>
        แถวทั้งหมด: <span className="text-gray-300 tabular-nums">{formatNumber(meta.totalRawRows)}</span>
      </span>
      <span>
        ผ่านตัวกรอง: <span className="text-green-400 tabular-nums">{formatNumber(meta.validRows)}</span>
      </span>
      <span>
        ตัดออก: <span className="text-gray-500 tabular-nums">{formatNumber(meta.invalidRows)}</span>
      </span>
      <span>
        เดือนล่าสุด: <span className="text-gray-300">{meta.latestMonth}</span>
      </span>
      {meta.tierJoinFailCount > 0 && (
        <span className="flex items-center gap-1 text-amber-400">
          <AlertTriangle size={12} />
          ไม่พบเทียร์: {meta.tierJoinFailCount} ราย
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-[#2A2F36] bg-[#17191C] px-2.5 py-1.5 text-gray-400 hover:border-[#F5C400]/50 hover:text-[#F5C400] transition-colors cursor-pointer disabled:opacity-40"
          title="โหลดข้อมูลใหม่"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>รีเฟรช</span>
        </button>
      )}
    </div>
  );
}
