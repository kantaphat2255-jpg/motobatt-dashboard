import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Motobatt Sales Dashboard',
  description: 'แดชบอร์ดวิเคราะห์ยอดขาย Motobatt — ใช้ภายในองค์กร',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="font-sans text-white">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
