'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart2, Layers, Package, Users, TrendingUp, GitCompare, Star, RefreshCw, RotateCcw } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/overview', icon: BarChart2, label: 'ภาพรวมรายเดือน' },
  { href: '/tier', icon: Layers, label: 'วิเคราะห์ระดับชั้น' },
  { href: '/sku', icon: Package, label: 'สินค้า / SKU' },
  { href: '/dealer-health', icon: Users, label: 'สุขภาพดีลเลอร์' },
  { href: '/trend', icon: TrendingUp, label: 'แนวโน้ม 6 เดือน' },
];

const ANALYTICS_ITEMS = [
  { href: '/month-compare', icon: GitCompare, label: 'เปรียบเทียบรายเดือน' },
  { href: '/dealer-rfm', icon: Star, label: 'RFM ดีลเลอร์' },
  { href: '/purchase-cycle', icon: RefreshCw, label: 'รอบการสั่งซื้อ' },
  { href: '/returns', icon: RotateCcw, label: 'คืนสินค้า / เคลม' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-[#0A0B0D]/95 border-r border-[#252A31] flex flex-col min-h-screen sticky top-0 shadow-[16px_0_40px_rgba(0,0,0,0.24)] backdrop-blur">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#252A31]">
        <Image
          src="/logo-motobatt.png"
          alt="Motobatt"
          width={140}
          height={48}
          className="object-contain"
          priority
        />
        <p className="text-gray-500 text-xs mt-3 tracking-wide uppercase">Sales Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '?');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#F5C400] text-[#0A0B0D] font-semibold shadow-[0_10px_26px_rgba(245,196,0,0.18)]'
                      : 'text-gray-400 hover:bg-[#17191C] hover:text-white'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-[#0A0B0D]' : 'text-gray-500 group-hover:text-[#F5C400]'} />
                  <span className="leading-snug">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-gray-600 text-xs font-semibold uppercase tracking-[0.18em] px-3 mt-6 mb-2">Analytics</p>
        <ul className="space-y-1">
          {ANALYTICS_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '?');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#F5C400] text-[#0A0B0D] font-semibold shadow-[0_10px_26px_rgba(245,196,0,0.18)]'
                      : 'text-gray-400 hover:bg-[#17191C] hover:text-white'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-[#0A0B0D]' : 'text-gray-500 group-hover:text-[#F5C400]'} />
                  <span className="leading-snug">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#252A31]">
        <p className="text-gray-600 text-xs">ใช้ภายในองค์กร</p>
      </div>
    </aside>
  );
}
