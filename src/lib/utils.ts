import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    const suffix = settings.siteUrl || 'DaoPhim.lol';
    const base = settings.siteName || 'Đảo Phim';
    if (pageTitle) {
      document.title = `${pageTitle} | ${suffix}`;
    } else {
      document.title = `${base} - Xem phim miễn phí`;
    }
    return () => {
      document.title = `${base} - Xem phim miễn phí`;
    };
  }, [pageTitle]);
}
