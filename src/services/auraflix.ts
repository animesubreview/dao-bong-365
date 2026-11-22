import { API_BASE } from '../lib/apiBase';

export interface AuraflixMovie {
  id: string;
  title: string;
  slug: string;
  content_type: string; // 'single' | ...
  release_year?: number;
  country?: string;
  genres?: string[];
  poster_url?: string;
  episodes_count?: number;
}

export interface AuraflixList {
  data: AuraflixMovie[];
  page: number;
  totalPages: number;
  total: number;
}

const mem = new Map<string, { t: number; v: AuraflixList }>();

/** Lấy danh sách phim từ Auraflix qua proxy /api/auraflix-movies (cache 10 phút trong bộ nhớ). */
export async function fetchAuraflixMovies(page = 1, limit = 20, extra: Record<string, string> = {}): Promise<AuraflixList> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...extra });
  const url = `${API_BASE}/api/auraflix-movies?${qs}`;
  const hit = mem.get(url);
  if (hit && Date.now() - hit.t < 600000) return hit.v;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok || !j?.success) throw new Error(j?.error || 'Auraflix lỗi ' + r.status);
  const p = j.meta?.pagination || {};
  const v: AuraflixList = { data: j.data || [], page: p.page || page, totalPages: p.totalPages || 1, total: p.total || (j.data || []).length };
  mem.set(url, { t: Date.now(), v });
  return v;
}
