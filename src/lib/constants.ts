// เริ่มนับข้อมูลจากเดือนนี้เป็นต้นไป — ถ้าขยาย range ให้เปลี่ยนที่นี่จุดเดียว
export const DATA_START_YYYYMM = 202501;

// เริ่มนับยอด cumulative target ปี 2026 จากเดือนนี้
export const CUMULATIVE_START_YYYYMM = '202604';

export const MONTHLY_TARGETS: Record<string, number> = {
  '202604': 1850000,
  '202605': 1850000,
  '202606': 1850000,
  '202607': 2156667,
  '202608': 2156667,
  '202609': 2156667,
  '202610': 4520000,
  '202611': 4520000,
  '202612': 4520000,
};

// 1850000*3 + 2156667*3 + 4520000*3 = 25,580,001
export const CUMULATIVE_APR_DEC_2026_TARGET = 25580001;

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const ORDER_SIZE_RANGES = [
  ...Array.from({ length: 50 }, (_, i) => ({ label: `${i + 1} ลัง`, min: i + 1, max: i + 1 })),
  { label: '51-60 ลัง', min: 51, max: 60 },
  { label: '61-70 ลัง', min: 61, max: 70 },
  { label: '71-80 ลัง', min: 71, max: 80 },
  { label: '81-100 ลัง', min: 81, max: 100 },
  { label: '101+ ลัง', min: 101, max: Infinity },
];

export const TIER_COLORS: Record<string, string> = {
  A: '#F5C400',
  B: '#60A5FA',
  C: '#34D399',
  D: '#A78BFA',
  Unknown: '#6B7280',
};

export const TIER_LABELS: Record<string, string> = {
  A: 'เทียร์ A',
  B: 'เทียร์ B',
  C: 'เทียร์ C',
  D: 'เทียร์ D',
  Unknown: 'ไม่ระบุเทียร์',
};
