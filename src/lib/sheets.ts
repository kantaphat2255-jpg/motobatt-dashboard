import type { SheetRawData } from './types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchRange(spreadsheetId: string, range: string, apiKey: string): Promise<string[][]> {
  const url = `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Sheets API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { values?: string[][] };
  return json.values ?? [];
}

async function fetchSheetsRaw(): Promise<SheetRawData> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) {
    throw new Error('กรุณาตั้งค่า GOOGLE_SHEETS_API_KEY และ GOOGLE_SHEETS_SPREADSHEET_ID ใน .env.local');
  }

  const dataRange = process.env.GOOGLE_SHEETS_DATA_RANGE || 'DATA!A:S';
  const dealerRange = process.env.GOOGLE_SHEETS_DEALER_RANGE || 'รายชื่อลูกค้าทั้งหมด!A:C';

  const [dataRows, dealerRows] = await Promise.all([
    fetchRange(spreadsheetId, dataRange, apiKey),
    fetchRange(spreadsheetId, dealerRange, apiKey),
  ]);

  return { dataRows, dealerRows };
}

// Module-level cache — 24-hour TTL
let cache: { data: SheetRawData; timestamp: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchSheetsData(forceRefresh = false): Promise<SheetRawData> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }
  const data = await fetchSheetsRaw();
  cache = { data, timestamp: Date.now() };
  return data;
}

export function getCacheTimestamp(): number | null {
  return cache?.timestamp ?? null;
}
