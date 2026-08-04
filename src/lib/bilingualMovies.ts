/**
 * Bilingual Movies (Phim Song Ngữ) - Admin tự tìm phim theo slug (nguồn KKPhim/phimapi.com)
 * và thêm vào mục "Phim Song Ngữ" ở trang chủ. Khác với lọc tự động theo movie.lang,
 * đây là danh sách do admin chọn tay 100%.
 */

import {
  collection, doc, setDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Movie } from '../types';

export interface BilingualMovie {
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
  addedAt: number;
}

const COL = 'bilingual_movies';

/** Lưu (thêm/cập nhật) 1 phim song ngữ lên Firestore */
export async function saveBilingualMovie(movie: Omit<BilingualMovie, 'addedAt'>): Promise<void> {
  await setDoc(doc(db, COL, movie.slug), {
    ...movie,
    addedAt: Date.now(),
  });
}

/** Xoá phim khỏi danh sách song ngữ */
export async function deleteBilingualMovie(slug: string): Promise<void> {
  await deleteDoc(doc(db, COL, slug));
}

/** Lấy tất cả phim song ngữ, sắp theo order tăng dần (order nhỏ = lên đầu) */
export async function getAllBilingualMovies(): Promise<BilingualMovie[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('order', 'asc')));
  return snap.docs.map(d => d.data() as BilingualMovie);
}

/** Subscribe realtime - dùng trong Admin và trên trang chủ */
export function subscribeBilingualMovies(cb: (items: BilingualMovie[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('order', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as BilingualMovie));
  }, () => cb([]));
}

/** Chuyển 1 BilingualMovie thành Movie để dùng chung với MCard/HRow như phim thường */
export function bilingualToMovie(p: BilingualMovie): Movie {
  return {
    _id: `bilingual-${p.slug}`,
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
