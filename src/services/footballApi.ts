import { FixtureItem } from '../types/football';

// ── Cấu hình ────────────────────────────────────────────────────────────
// Đặt khóa API thật vào file .env (VITE_API_FOOTBALL_KEY=xxxx) — KHÔNG commit khóa thật lên git công khai.
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY || '';
const BASE_URL = 'https://v3.football.api-sports.io';

// World Cup = league id 1 trên API-Football
export const LEAGUE_WORLD_CUP = 1;
export const SEASON_WORLD_CUP_2026 = 2026;

// Cache đơn giản trong bộ nhớ để tránh gọi API quá nhiều lần (free tier giới hạn request/ngày)
const cache = new Map<string, { data: any; expires: number }>();

async function apiGet<T = any>(path: string, params: Record<string, string | number> = {}, ttlMs = 60_000): Promise<T> {
  const qs = new URLSearchParams(params as any).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data;

  if (!API_KEY) {
    throw new Error('Thiếu VITE_API_FOOTBALL_KEY — vào file .env để cấu hình khóa API-Football.');
  }

  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  if (!res.ok) throw new Error(`API-Football lỗi: ${res.status}`);
  const json = await res.json();
  cache.set(url, { data: json, expires: Date.now() + ttlMs });
  return json;
}

export const footballApi = {
  /** Lịch thi đấu theo ngày (yyyy-mm-dd) */
  async getFixturesByDate(date: string): Promise<FixtureItem[]> {
    const json = await apiGet('/fixtures', { date }, 5 * 60_000);
    return json.response || [];
  },

  /** Các trận đang diễn ra (live) */
  async getLiveFixtures(): Promise<FixtureItem[]> {
    const json = await apiGet('/fixtures', { live: 'all' }, 15_000);
    return json.response || [];
  },

  /** Lịch thi đấu của 1 giải đấu / mùa giải, ví dụ World Cup 2026 */
  async getFixturesByLeague(league: number, season: number): Promise<FixtureItem[]> {
    const json = await apiGet('/fixtures', { league, season }, 5 * 60_000);
    return json.response || [];
  },

  /** Chi tiết 1 trận theo fixture id */
  async getFixtureById(id: number): Promise<FixtureItem | null> {
    const json = await apiGet('/fixtures', { id }, 30_000);
    return json.response?.[0] || null;
  },

  /** Bảng xếp hạng theo giải / mùa giải */
  async getStandings(league: number, season: number): Promise<any[]> {
    const json = await apiGet('/standings', { league, season }, 10 * 60_000);
    return json.response?.[0]?.league?.standings || [];
  },
};

export function hasApiKey() {
  return !!API_KEY;
}
