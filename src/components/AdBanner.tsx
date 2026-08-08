import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { AdBannerData, subscribeAdBanners } from '../lib/ads';

// ── Re-export types/CRUD từ lib/ads.ts để code cũ import từ đây vẫn chạy được ──
export type { AdBannerData };
export { getAdBanners, createAdBanner, updateAdBanner, deleteAdBanner } from '../lib/ads';

// ── Component ─────────────────────────────────────────────────────────────────
interface AdBannerProps {
  position: 'top' | 'bottom' | 'middle' | 'sticky';
  className?: string;
}

export default function AdBanner({ position, className = '' }: AdBannerProps) {
  const [banners, setBanners] = useState<AdBannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const [allClosed, setAllClosed] = useState(false); // dùng cho position="sticky": đóng toàn bộ khối banner

  useEffect(() => {
    setError(false);
    const unsub = subscribeAdBanners(
      all => { setBanners(all.filter(b => b.active && b.position === position)); setError(false); },
      () => setError(true)
    );
    return unsub;
  }, [position]);

  const visible = banners.filter(b => !dismissed.has(b.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  // ── Banner cố định (sticky) ở cuối màn hình — hiển thị trên mọi trang,
  // cả PC lẫn Mobile. Hiện TẤT CẢ banner đang active, xếp chồng theo chiều dọc
  // (giống nhiều site quảng cáo: nhiều banner nhỏ xếp lên nhau ở đáy màn hình).
  if (position === 'sticky') {
    if (allClosed) return null;

    return (
      <div
        className={`fixed inset-x-0 bottom-[64px] md:bottom-0 z-[45] flex justify-center px-2.5 pb-1 md:px-4 md:pb-3 pointer-events-none ${className}`}
      >
        <div className="relative w-full md:w-[94%] md:max-w-[1600px] pointer-events-auto">
          {/* Nút đóng toàn bộ khối banner sticky */}
          <button
            onClick={() => setAllClosed(true)}
            className="absolute -top-3 right-1 md:-top-3.5 md:right-0 z-10 w-6 h-6 md:w-7 md:h-7 bg-black/80 hover:bg-black rounded-full flex items-center justify-center border border-slate-600/60 shadow-md"
            title="Đóng tất cả quảng cáo"
          >
            <X size={13} className="text-white md:hidden" />
            <X size={15} className="text-white hidden md:block" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center w-full divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-700/60 md:border rounded-2xl md:rounded-2xl overflow-hidden shadow-[0_-6px_24px_rgba(0,0,0,0.55)]">
            {visible.map(banner => (
              <div
                key={banner.id}
                className="relative w-full md:flex-1 bg-black/95 md:bg-black overflow-hidden"
              >
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={banner.title}
                  className="flex items-center justify-center w-full"
                >
                  {banner.mediaType === 'mp4' ? (
                    <video
                      src={banner.mediaUrl}
                      autoPlay loop muted playsInline
                      className="w-full h-auto max-h-16 sm:max-h-20 md:max-h-28 lg:max-h-32 object-contain cursor-pointer"
                    />
                  ) : (
                    <img
                      src={banner.mediaUrl}
                      alt={banner.title || 'Quảng cáo'}
                      className="w-full h-auto max-h-16 sm:max-h-20 md:max-h-28 lg:max-h-32 object-contain cursor-pointer"
                      onError={e => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = 'none';
                        console.error('[AdBanner] Image failed to load:', banner.mediaUrl);
                      }}
                    />
                  )}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {visible.map(banner => (
        <div key={banner.id} className="relative w-full group overflow-hidden rounded-xl">
          <a
            href={banner.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
            title={banner.title}
          >
            {banner.mediaType === 'mp4' ? (
              <video
                src={banner.mediaUrl}
                autoPlay loop muted playsInline
                className="w-full h-auto max-h-[220px] object-cover rounded-xl cursor-pointer"
              />
            ) : (
              <img
                src={banner.mediaUrl}
                alt={banner.title || 'Quảng cáo'}
                className="w-full h-auto max-h-[220px] object-cover rounded-xl cursor-pointer"
                onError={e => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = 'none';
                  console.error('[AdBanner] Image failed to load:', banner.mediaUrl);
                }}
              />
            )}
          </a>
          <span className="absolute top-2 left-2 text-[9px] font-black bg-black/60 text-slate-400 px-1.5 py-0.5 rounded pointer-events-none">
            QC
          </span>
          <button
            onClick={() => dismiss(banner.id)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Đóng quảng cáo"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}
