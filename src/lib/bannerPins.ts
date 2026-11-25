import React from 'react';
import { collection, doc, getDocs, query, orderBy } from './firestore-compat';
import { db } from './firebase';
import { setDoc, deleteDoc } from './firestoreGuard';
import { fetchCollectionCached, invalidateCache } from './publicCache';

// Phim API được ghim lên banner trang chủ (phim thủ công thì ghim bằng công tắc trong form phim)
const COL = 'banner_pins';

export interface BannerPin {
  id: string;            // = slug phim
  slug: string;
  name: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  createdAt: number;
}

export async function pinApiMovie(m: { slug: string; name: string; origin_name?: string; poster_url?: string; thumb_url?: string }) {
  await setDoc(doc(db, COL, m.slug), {
    slug: m.slug,
    name: m.name || '',
    origin_name: m.origin_name || '',
    poster_url: m.poster_url || '',
    thumb_url: m.thumb_url || '',
    createdAt: Date.now(),
  });
  invalidateCache(COL);
}

export async function unpinApiMovie(slug: string) {
  await deleteDoc(doc(db, COL, slug));
  invalidateCache(COL);
}

/** Đọc mới nhất (dùng trong Admin) */
export async function getBannerPins(): Promise<BannerPin[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as BannerPin));
}

/** Đọc có cache 3 phút (trang chủ) */
export function useBannerPins(): BannerPin[] {
  const [pins, setPins] = React.useState<BannerPin[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    fetchCollectionCached<BannerPin>(COL, COL, [orderBy('createdAt', 'desc')], 3 * 60_000)
      .then(list => { if (!cancelled) setPins(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return pins;
}
