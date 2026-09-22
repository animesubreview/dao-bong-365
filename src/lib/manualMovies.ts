import React from 'react';
import { collection, doc, query, orderBy, getDocs, getDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { addDoc, updateDoc, deleteDoc, onSnapshot } from './firestoreGuard';

export interface ManualEpisode {
  label: string;   // VD: "Tập 1", "Tập 2", "Full"
  embedUrl: string;
}

export interface ManualMovie {
  id: string;
  name: string;
  originName: string;
  year: string;
  quality: string;
  lang: string;
  type: string;
  status: string;
  posterUrl: string;
  embedUrl: string;          // backward-compat: single-episode fallback
  episodes?: ManualEpisode[]; // multi-episode support
  description: string;
  createdAt: number;
  // Anime / phim sắp chiếu
  isUpcoming?: boolean;        // true = sắp chiếu (hiện vào section riêng)
  releaseDate?: string;        // VD: "15/06/2025" hoặc "Quý 3 2025"
  upcomingType?: 'anime' | 'movie' | 'series'; // phân loại sắp chiếu
  // Lịch chiếu
  airingDay?: string;          // VD: "Thứ 7", "Chủ nhật", "Hàng ngày"
  airingTime?: string;         // VD: "9:30 Tối", "20:00"
  // Bảo vệ phim
  watermarkEnabled?: boolean;  // true = hiện watermark trên player
  watermarkType?: 'marquee' | 'logo' | 'both'; // dòng chữ chạy | logo cố định | cả hai
  watermarkText?: string;      // Nội dung dòng chữ chạy
  watermarkLogoUrl?: string;   // URL logo bảo vệ riêng (nếu không điền dùng logo site)
  watermarkPosition?: 'top' | 'bottom' | 'random'; // vị trí dòng chữ chạy
}

const COL = 'manual_movies';

// Helper: Firestore rejects undefined values — strip them before writing
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createManualMovie(data: Omit<ManualMovie, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), stripUndefined({ ...data, createdAt: Date.now() }));
  invalidateCache(COL);
  invalidateCache(COL + ':upcoming');
  return ref.id;
}

export async function updateManualMovie(id: string, data: Partial<Omit<ManualMovie, 'id'>>) {
  await updateDoc(doc(db, COL, id), stripUndefined(data));
  invalidateCache(COL);
  invalidateCache(COL + ':upcoming');
}

export async function deleteManualMovie(id: string) {
  await deleteDoc(doc(db, COL, id));
  invalidateCache(COL);
  invalidateCache(COL + ':upcoming');
}

export async function getManualMovie(id: string): Promise<ManualMovie | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ManualMovie;
}

export async function getAllManualMovies(): Promise<ManualMovie[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMovie));
}

/** Đọc có cache (3 phút) — dùng ở trang chủ (component công khai), đỡ tốn lượt đọc Firestore */
export async function getManualMoviesCached(): Promise<ManualMovie[]> {
  return fetchCollectionCached<ManualMovie>(COL, COL, [orderBy('createdAt', 'desc')], 3 * 60_000);
}

/** Subscribe realtime - CHỈ dùng trong Admin (nơi cần thấy thay đổi ngay khi đang chỉnh sửa) */
export function subscribeManualMovies(cb: (movies: ManualMovie[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMovie)));
  });
}

// ── Upcoming movies (cũ - giữ tương thích) ──────────────────────────────────────

/** Đọc có cache (3 phút) — dùng ở trang chủ, đỡ tốn lượt đọc Firestore */
export async function getUpcomingMoviesOldCached(): Promise<ManualMovie[]> {
  const list = await fetchCollectionCached<ManualMovie>(
    COL + ':upcoming', COL, [where('isUpcoming', '==', true)], 3 * 60_000
  );
  return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Subscribe realtime - CHỈ dùng trong Admin */
export function subscribeUpcomingMovies(cb: (movies: ManualMovie[]) => void): () => void {
  // where + orderBy khác field cần composite index (nếu thiếu, listener lỗi im lặng) → sắp xếp phía client
  const q = query(collection(db, COL), where('isUpcoming', '==', true));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMovie));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  });
}

/** Hook công khai (trang chủ) — đọc có cache, KHÔNG mở kết nối realtime */
export function useUpcomingMovies() {
  const [movies, setMovies] = React.useState<ManualMovie[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    getUpcomingMoviesOldCached().then(list => { if (!cancelled) setMovies(list); });
    return () => { cancelled = true; };
  }, []);
  return movies;
}
