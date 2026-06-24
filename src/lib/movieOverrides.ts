/**
 * Movie Overrides - Chỉnh sửa thông tin phim từ API
 * Lưu override lên Firestore → web hiển thị thông tin đã chỉnh
 */

import {
  collection, doc, setDoc, getDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MovieOverride {
  slug: string;              // key - slug của phim
  name?: string;
  origin_name?: string;
  content?: string;          // mô tả/nội dung phim
  year?: string;
  quality?: string;
  lang?: string;
  time?: string;
  status?: string;
  thumb_url?: string;
  poster_url?: string;
  actor?: string[];
  director?: string[];
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
  updatedAt: number;
}

const COL = 'movie_overrides';

/** Lấy override của 1 phim theo slug */
export async function getMovieOverride(slug: string): Promise<MovieOverride | null> {
  try {
    const snap = await getDoc(doc(db, COL, slug));
    if (!snap.exists()) return null;
    return snap.data() as MovieOverride;
  } catch { return null; }
}

/** Lưu override lên Firestore */
export async function saveMovieOverride(override: MovieOverride): Promise<void> {
  await setDoc(doc(db, COL, override.slug), {
    ...override,
    updatedAt: Date.now(),
  });
}

/** Xóa override - phim về data gốc từ API */
export async function deleteMovieOverride(slug: string): Promise<void> {
  await deleteDoc(doc(db, COL, slug));
}

/** Lấy tất cả overrides */
export async function getAllOverrides(): Promise<MovieOverride[]> {
  const snap = await getDocs(query(collection(db, COL)));
  return snap.docs.map(d => d.data() as MovieOverride);
}

/** Subscribe realtime - dùng trong Admin */
export function subscribeOverrides(cb: (items: MovieOverride[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as MovieOverride));
  });
}

/**
 * Merge override vào movie data từ API
 * Override field nào thì thay field đó, giữ nguyên phần còn lại
 */
export function mergeOverride<T extends object>(movie: T, override: MovieOverride | null): T {
  if (!override) return movie;
  const merged = { ...movie };
  const fields: (keyof MovieOverride)[] = [
    'name', 'origin_name', 'content', 'year', 'quality', 'lang',
    'time', 'status', 'thumb_url', 'poster_url',
    'actor', 'director', 'category', 'country',
  ];
  for (const f of fields) {
    if (override[f] !== undefined && override[f] !== null && override[f] !== '') {
      (merged as any)[f] = override[f];
    }
  }
  return merged;
}
