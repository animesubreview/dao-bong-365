import React from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs, getDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';

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
  return ref.id;
}

export async function updateManualMovie(id: string, data: Partial<Omit<ManualMovie, 'id'>>) {
  await updateDoc(doc(db, COL, id), stripUndefined(data));
}

export async function deleteManualMovie(id: string) {
  await deleteDoc(doc(db, COL, id));
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

// ── Realtime listener (dùng trong React hook) ─────────────────────────────────
export function subscribeManualMovies(cb: (movies: ManualMovie[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMovie)));
  });
}

// ── Upcoming movies subscription ──────────────────────────────────────────────

export function subscribeUpcomingMovies(cb: (movies: ManualMovie[]) => void): () => void {
  const q = query(
    collection(db, COL),
    where('isUpcoming', '==', true),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMovie)));
  });
}

export function useUpcomingMovies() {
  const [movies, setMovies] = React.useState<ManualMovie[]>([]);
  React.useEffect(() => {
    const unsub = subscribeUpcomingMovies(setMovies);
    return unsub;
  }, []);
  return movies;
}
