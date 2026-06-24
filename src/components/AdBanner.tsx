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
  position: 'top' | 'bottom' | 'middle';
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
  position: 'top' | 'bottom' | 'middle';
  className?: string;
}

export default function AdBanner({ position, className = '' }: AdBannerProps) {
  const [banners, setBanners] = useState<AdBannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

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
            onClick={() => setDismissed(prev => new Set(prev).add(banner.id))}
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
