// Tiện ích dùng chung cho "Lịch sử xem" và mục "Tiếp tục xem" ở trang chủ.
// Phim thủ công (isManual) có trang xem riêng /watch-manual/:id/:tập — khác hẳn phim API (/watch/:slug/:tập).

export interface HistoryItem {
  id?: string;
  name: string;
  slug: string;
  thumb_url?: string;
  poster_url?: string;
  episodeName?: string;
  episodeSlug?: string;
  isManual?: boolean;
  updatedAt: number;
}

/** Link mở đúng tập đang xem dở */
export function historyWatchLink(item: HistoryItem): string {
  if (item.isManual) return `/watch-manual/${item.id}/${item.episodeSlug || '0'}`;
  return `/watch/${item.slug}/${item.episodeSlug}`;
}

/** Link tới trang chi tiết phim */
export function historyDetailLink(item: HistoryItem): string {
  return item.isManual ? `/manual/${item.id}` : `/phim/${item.slug}`;
}

/** Nhãn tập: "12" → "Tập 12", còn "Full"/"Tập 3" giữ nguyên */
export function episodeLabel(item: HistoryItem): string {
  const n = String(item.episodeName ?? '').trim();
  if (!n) return '';
  return /^\d+(\.\d+)?$/.test(n) ? `Tập ${n}` : n;
}

/** Khóa lưu tiến độ — trùng với khóa mà trình phát đang ghi */
export function progressKeyOf(item: HistoryItem): string {
  return item.isManual
    ? `manual:${item.id}:${item.episodeSlug || '0'}`
    : `${item.slug}:${item.episodeSlug}`;
}

export function readProgress(item: HistoryItem): { time: number; duration: number; pct: number } | null {
  try {
    const raw = localStorage.getItem(`watchProgress:${progressKeyOf(item)}`);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d?.time !== 'number' || d.time <= 0) return null;
    const duration = typeof d.duration === 'number' ? d.duration : 0;
    const pct = duration > 0 ? Math.min(100, Math.round((d.time / duration) * 100)) : 0;
    return { time: d.time, duration, pct };
  } catch { return null; }
}

export function formatClock(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
