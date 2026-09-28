import type { BatteryTypeKey } from '../types';

// Classify a battery line by its ITEM_DESC, e.g.
//   "แบตเตอรี่ MOTOBATT  MF  - YTZ5S  YGS"          -> mf
//   "แบตเตอรี่ MOTOBATT Quadflex - MBTX7U"          -> quadflex
//   "แบตเตอรี่ MOTOBATT  PRO LITHIUM-  MLX7U-HP"    -> lithium
//
// Deliberately NOT keyed off ITEM_ID: the MOTOBATT GEL items share the 130501
// prefix with Quadflex, so an ID-prefix rule would misfile them. Anything that
// matches none of the three (e.g. GEL) lands in 'other' so it stays visible
// instead of silently dropping out of the totals.
export function classifyBatteryType(itemDesc: string): BatteryTypeKey {
  if (/lithium|ลิเธียม/i.test(itemDesc)) return 'lithium';
  if (/quadflex/i.test(itemDesc)) return 'quadflex';
  if (/\bMF\b/i.test(itemDesc)) return 'mf';
  return 'other';
}

// "แบตเตอรี่ MOTOBATT  MF - 12N5-3B-BS  YGS" -> "12N5-3B-BS" (model code only).
export function batteryModelName(itemDesc: string): string {
  const cleaned = itemDesc
    .replace(/แบตเตอรี่/g, ' ')
    .replace(/motobatt/gi, ' ')
    .replace(/pro\s*lithium|quadflex|\bMF\b|\bGEL\b/gi, ' ')
    .replace(/\bYGS\b/g, ' ')
    .replace(/^[\s-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || itemDesc;
}
