import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Giới hạn thời gian chờ 1 Promise: nếu quá `ms` mà chưa xong, trả về `fallback`
 * ngay (Promise gốc vẫn chạy nền, không hủy). Dùng cho các nguồn PHỤ (NguonC,
 * OPhim, ảnh TMDB...) để 1 nguồn chậm/die không kéo chậm cả trang — trang vẫn
 * hiện được bằng nguồn chính (KKPhim) đúng hạn, nguồn phụ có thì bổ sung sau.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? h : null,
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
}

export function getSiteSettings() {
  try {
    const s = localStorage.getItem('site_settings');
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    const settings = getSiteSettings();
    const suffix = 'DAOPHIM';
    const base = settings.siteName || 'Đảo Phim';
    if (pageTitle) {
      document.title = `${pageTitle} | ${suffix}`;
    } else {
      document.title = `${base} - Xem phim miễn phí | ${suffix}`;
    }
    return () => {
      document.title = `${base} - Xem phim miễn phí | ${suffix}`;
    };
  }, [pageTitle]);
}
