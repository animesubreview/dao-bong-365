import React, { useEffect, useState } from 'react';
import { X, Radio, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_LIVE_NOTICE, LiveNoticeConfig, PLATFORM_LABEL, detectLivePlatform, safeLiveUrl, subscribeLiveNotice } from '../lib/liveNotice';

/**
 * Thông báo phát trực tiếp nổi ở góc trái dưới. Bấm "Xem live ngay" → mở link live ở tab mới.
 * Người dùng có thể thu gọn (X) — khi đó chỉ còn nút nhỏ "LIVE" bấm vẫn đi tới live.
 */
export default function LiveNotice() {
  const [cfg, setCfg] = useState<LiveNoticeConfig>(DEFAULT_LIVE_NOTICE);
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => subscribeLiveNotice(setCfg), []);

  // Mỗi lần admin bật/đổi nội dung live (updatedAt đổi) thì hiện lại bản đầy đủ; nếu người dùng đã thu gọn
  // trong phiên này thì giữ thu gọn tới khi có bản mới.
  useEffect(() => {
    try { setCollapsed(sessionStorage.getItem('live_notice_collapsed') === String(cfg.updatedAt)); } catch { setCollapsed(false); }
  }, [cfg.updatedAt]);

  const url = safeLiveUrl(cfg.url);
  if (!cfg.enabled || !url) return null;
  // Đừng che trình phát khi đang xem phim / phòng xem chung
  if (pathname.startsWith('/watch') || pathname.startsWith('/daophim')) return null;

  const platform = cfg.platform !== 'other' ? cfg.platform : detectLivePlatform(url);
  const go = () => window.open(url, '_blank', 'noopener');
  const collapse = () => {
    setCollapsed(true);
    try { sessionStorage.setItem('live_notice_collapsed', String(cfg.updatedAt)); } catch {}
  };

  if (collapsed) {
    return (
      <button onClick={go} aria-label="Xem live ngay"
        className="fixed left-3 bottom-20 md:bottom-6 z-40 flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-red-600 text-white text-xs font-black shadow-lg shadow-red-900/50 hover:bg-red-500 transition-colors">
        <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" /><span className="relative w-2.5 h-2.5 rounded-full bg-white" /></span>
        LIVE · {PLATFORM_LABEL[platform]}
      </button>
    );
  }

  return (
    <div className="fixed left-3 bottom-20 md:bottom-6 z-40 w-[min(300px,calc(100vw-1.5rem))] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/70 shadow-2xl shadow-black/60">
      <div className="relative aspect-video bg-gradient-to-br from-red-700 to-slate-900">
        {cfg.posterUrl
          ? <img src={cfg.posterUrl} alt={cfg.title} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><Radio size={44} className="text-white/80" /></div>}
        <span className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black px-2 py-1 rounded-md">
          <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" /><span className="relative w-2 h-2 rounded-full bg-white" /></span>
          LIVE · {PLATFORM_LABEL[platform]}
        </span>
        <button onClick={collapse} aria-label="Thu gọn"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center">
          <X size={15} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-black text-white leading-snug line-clamp-2">{cfg.title}</p>
        {cfg.message && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cfg.message}</p>}
        <button onClick={go}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-black py-2.5 rounded-xl transition-colors">
          <ExternalLink size={15} /> {cfg.buttonText || 'Xem live ngay'}
        </button>
      </div>
    </div>
  );
}
