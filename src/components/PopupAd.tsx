import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { PopupAdData, subscribePopupAds } from '../lib/ads';

// ── Re-export types/CRUD từ lib/ads.ts để code cũ import từ đây vẫn chạy được ──
export type { PopupAdData };
export { createPopupAd, updatePopupAd, deletePopupAd } from '../lib/ads';

// ── Session tracking ──────────────────────────────────────────────────────────
const SESSION_KEY = 'popup_ad_shown_movies';

function getShownSet(): Set<string> {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? new Set(JSON.parse(v)) : new Set();
  } catch { return new Set(); }
}

function markShown(movieKey: string) {
  const s = getShownSet();
  s.add(movieKey);
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s])); } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePopupAd(movieKey: string) {
  const [show, setShow] = useState(false);
  const [ad, setAd] = useState<PopupAdData | null>(null);

  useEffect(() => {
    const unsub = subscribePopupAds(all => {
      const ads = all.filter(a => a.active);
      setAd(ads[0] ?? null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!movieKey || !ad) return;
    const shown = getShownSet();
    if (shown.has(movieKey)) return;
    const t = setTimeout(() => {
      setShow(true);
      markShown(movieKey);
    }, 800);
    return () => clearTimeout(t);
  }, [movieKey, ad]);

  return { show, ad, close: () => setShow(false) };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PopupAd({ movieKey }: { movieKey: string }) {
  const { show, ad, close } = usePopupAd(movieKey);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!show) return;
    setCountdown(5);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [show]);

  if (!show || !ad) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={countdown === 0 ? close : undefined}
      />
      <div className="relative z-10 w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-700/50">
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={close}>
          {ad.mediaType === 'mp4' ? (
            <video
              src={ad.mediaUrl} autoPlay loop muted playsInline
              className="w-full h-auto max-h-[340px] object-contain bg-black cursor-pointer"
            />
          ) : (
            <img
              src={ad.mediaUrl} alt={ad.title || 'Quảng cáo'}
              className="w-full h-auto max-h-[340px] object-contain bg-black cursor-pointer"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </a>
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between gap-3">
          <a
            href={ad.linkUrl} target="_blank" rel="noopener noreferrer" onClick={close}
            className="flex items-center gap-1.5 text-green-400 text-xs font-bold hover:text-green-300 transition-colors truncate"
          >
            <ExternalLink size={13} />
            <span className="truncate">{ad.title || 'Xem thêm'}</span>
          </a>
          {countdown > 0 ? (
            <span className="shrink-0 text-xs text-slate-500 font-bold bg-slate-800 px-3 py-1.5 rounded-lg">
              Đóng sau {countdown}s
            </span>
          ) : (
            <button
              onClick={close}
              className="shrink-0 flex items-center gap-1.5 text-xs text-white font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X size={13} /> Đóng
            </button>
          )}
        </div>
        <span className="absolute top-2 left-2 text-[9px] font-black bg-black/60 text-slate-400 px-1.5 py-0.5 rounded pointer-events-none">
          QC
        </span>
      </div>
    </div>
  );
}
