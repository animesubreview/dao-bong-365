import { doc } from './firestore-compat';
import { saveDoc } from './firebaseUtils';
import { db } from './firebase';
import { onSnapshot } from './firestoreGuard';

// Thông báo "Đang phát trực tiếp" — Admin bật/tắt, người dùng bấm vào sẽ chuyển tới link live
// (TikTok / YouTube / Facebook / nền tảng khác). Lưu tại config/live_notice, cập nhật realtime.
export type LivePlatform = 'tiktok' | 'youtube' | 'facebook' | 'other';

export interface LiveNoticeConfig {
  enabled: boolean;
  url: string;
  platform: LivePlatform;
  title: string;
  message: string;
  buttonText: string;
  posterUrl: string;
  updatedAt: number;
}

export const DEFAULT_LIVE_NOTICE: LiveNoticeConfig = {
  enabled: false,
  url: '',
  platform: 'other',
  title: 'Đang phát trực tiếp!',
  message: 'Vào xem live cùng Đảo Phim ngay nào.',
  buttonText: 'Xem live ngay',
  posterUrl: '',
  updatedAt: 0,
};

const LS_KEY = 'live_notice_config';

/** Đoán nền tảng từ link để hiển thị nhãn đúng. */
export function detectLivePlatform(url: string): LivePlatform {
  const u = (url || '').toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  return 'other';
}

export const PLATFORM_LABEL: Record<LivePlatform, string> = {
  tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', other: 'Trực tiếp',
};

/** Chỉ cho phép link http(s) — chặn javascript: và các scheme nguy hiểm. */
export function safeLiveUrl(url: string): string {
  try {
    const u = new URL((url || '').trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch { return ''; }
}

export async function saveLiveNotice(cfg: LiveNoticeConfig): Promise<void> {
  const data = { ...cfg, url: cfg.url.trim(), updatedAt: Date.now() };
  await saveDoc(doc(db, 'config', 'live_notice'), data, { merge: true });
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function subscribeLiveNotice(cb: (cfg: LiveNoticeConfig) => void): () => void {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) cb({ ...DEFAULT_LIVE_NOTICE, ...JSON.parse(v) });
  } catch {}
  return onSnapshot(
    doc(db, 'config', 'live_notice'),
    (snap: any) => {
      if (!snap.exists()) { cb(DEFAULT_LIVE_NOTICE); return; }
      const data = { ...DEFAULT_LIVE_NOTICE, ...snap.data() } as LiveNoticeConfig;
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
      cb(data);
    },
    (err: any) => console.warn('[liveNotice] lỗi lắng nghe:', err)
  );
}
