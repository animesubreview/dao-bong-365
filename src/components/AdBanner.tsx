import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AdBannerData {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'gif' | 'mp4' | 'image';
  linkUrl: string;
  // 'sticky' = banner cố định (fixed) ở cuối màn hình, hiển thị trên mọi trang, cả PC lẫn Mobile
  // 'header' = banner mỏng dính ngay trên cùng, phía trên thanh header, hiển thị trên MỌI trang
  position: 'top' | 'bottom' | 'middle' | 'sticky' | 'header';
  active: boolean;
  createdAt: number;
}

const COL = 'ad_banners';

// ── Firestore CRUD ────────────────────────────────────────────────────────────
export async function getAdBanners(): Promise<AdBannerData[]> {
  try {
    const { getDocs } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData));
  } catch (e) {
    console.error('[AdBanner] getAdBanners error:', e);
    return [];
  }
}

export async function createAdBanner(data: Omit<AdBannerData, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateAdBanner(id: string, data: Partial<AdBannerData>) {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteAdBanner(id: string) {
  await deleteDoc(doc(db, COL, id));
}

// ── Component ─────────────────────────────────────────────────────────────────
interface AdBannerProps {
  position: 'top' | 'bottom' | 'middle' | 'sticky' | 'header';
  className?: string;
}

export default function AdBanner({ position, className = '' }: AdBannerProps) {
  const [banners, setBanners] = useState<AdBannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const [allClosed, setAllClosed] = useState(false); // dùng cho position="sticky": đóng toàn bộ khối banner

  useEffect(() => {
    setError(false);
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(
        q,
        snap => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData));
          setBanners(all.filter(b => b.active && b.position === position));
          setError(false);
        },
        err => {
          console.error('[AdBanner] onSnapshot error:', err);
          setError(true);
        }
      );
    } catch (e) {
      console.error('[AdBanner] setup error:', e);
      setError(true);
    }
    return () => unsub?.();
  }, [position]);

  const visible = banners.filter(b => !dismissed.has(b.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  // ── Banner cố định (sticky) ở cuối màn hình — hiển thị trên mọi trang,
  // cả PC lẫn Mobile. Hiện TẤT CẢ banner đang active, xếp chồng theo chiều dọc
  // (giống nhiều site quảng cáo: nhiều banner nhỏ xếp lên nhau ở đáy màn hình).
  // ── Banner mỏng dính TRÊN CÙNG, phía trên thanh header — hiển thị trên MỌI trang.
  // Được nhúng bên trong wrapper `fixed` của Header (xem Header.tsx), nên ở đây
  // KHÔNG tự set `fixed` — chỉ là 1 thanh ngang chiều cao cố định để Header đo
  // và chừa khoảng trống tương ứng cho nội dung trang bên dưới.
  if (position === 'header') {
    const banner = visible[0]; // chỉ hiện 1 banner đầu ở vị trí này cho gọn
    if (!banner) return null;
    return (
      <div
        className={`relative w-full bg-black ${className}`}
        style={{ height: 40, minHeight: 40, maxHeight: 40, overflow: 'hidden', lineHeight: 0 }}
      >
        <a
          href={banner.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={banner.title}
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          {banner.mediaType === 'mp4' ? (
            <video
              src={banner.mediaUrl}
              autoPlay loop muted playsInline
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
            />
          ) : (
            <img
              src={banner.mediaUrl}
              alt={banner.title || 'Quảng cáo'}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </a>
        <button
          onClick={() => dismiss(banner.id)}
          className="absolute top-1/2 -translate-y-1/2 right-1.5 w-5 h-5 bg-black/70 hover:bg-black rounded-full flex items-center justify-center"
          title="Đóng quảng cáo"
        >
          <X size={11} className="text-white" />
        </button>
      </div>
    );
  }

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
