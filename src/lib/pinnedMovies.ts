/**
 * Pinned Movies - Ghim phim từ nguồn KKPhim lên đầu trang chủ
 * Admin tìm phim theo slug (data gốc từ KKPhim/phimapi.com) → ghim lên đầu
 * mục "Phim Mới Cập Nhật" để mọi người dễ thấy, không cần chỉnh sửa nội dung phim.
 */

import {
  collection, doc, setDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Movie } from '../types';

export interface PinnedMovie {
  slug: string;         // key - slug của phim trên KKPhim
  name: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  quality?: string;
  lang?: string;
  type?: string;
  status?: string;
  episode_current?: string;
  order: number;        // thứ tự hiển thị - số nhỏ hơn lên trước
  pinnedAt: number;
}

const COL = 'pinned_movies';

/** Lưu (thêm/cập nhật) 1 phim ghim lên Firestore */
export async function savePinnedMovie(movie: Omit<PinnedMovie, 'pinnedAt'>): Promise<void> {
  await setDoc(doc(db, COL, movie.slug), {
    ...movie,
    pinnedAt: Date.now(),
  });
}

/** Bỏ ghim phim - phim quay lại xếp theo thứ tự mặc định từ KKPhim */
export async function deletePinnedMovie(slug: string): Promise<void> {
  await deleteDoc(doc(db, COL, slug));
}

/** Lấy tất cả phim đang ghim, sắp theo order tăng dần (order nhỏ = lên đầu) */
export async function getAllPinnedMovies(): Promise<PinnedMovie[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('order', 'asc')));
  return snap.docs.map(d => d.data() as PinnedMovie);
}

/** Subscribe realtime - dùng trong Admin và trên trang chủ */
export function subscribePinnedMovies(cb: (items: PinnedMovie[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('order', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as PinnedMovie));
  }, () => cb([]));
}

/**
 * Chèn danh sách phim ghim lên đầu 1 mảng phim (VD: newUpdates từ KKPhim),
 * loại bỏ trùng lặp nếu phim đó vốn đã có sẵn trong danh sách gốc.
 */
export function withPinnedFirst<T extends { slug: string }>(pinned: T[], source: T[]): T[] {
  if (!pinned.length) return source;
  const pinnedSlugs = new Set(pinned.map(p => p.slug));
  const rest = source.filter(m => !pinnedSlugs.has(m.slug));
  return [...pinned, ...rest];
}

/** Chuyển 1 PinnedMovie thành Movie để dùng chung với MCard/HRow như phim thường */
export function pinnedToMovie(p: PinnedMovie): Movie {
  return {
    _id: `pinned-${p.slug}`,
    name: p.name,
    origin_name: p.origin_name || '',
    slug: p.slug,
    thumb_url: p.thumb_url || '',
    poster_url: p.poster_url || p.thumb_url || '',
    year: p.year || 0,
    time: '',
    quality: p.quality || '',
    lang: p.lang || '',
    type: p.type || '',
    status: p.status || '',
    episode_current: p.episode_current || '',
  };
}
