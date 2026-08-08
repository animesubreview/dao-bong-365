// ─── Movie Ratings Service (Firestore) ──────────────────────────────────────────
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MovieRating {
  movieSlug: string;
  uid: string;
  username: string;
  stars: number; // 1 - 5
  createdAt: number;
  updatedAt: number;
}

const COL = 'ratings';

function ratingId(movieSlug: string, uid: string) {
  return `${movieSlug}_${uid}`;
}

export async function getMovieRatings(movieSlug: string): Promise<MovieRating[]> {
  try {
    const q = query(collection(db, COL), where('movieSlug', '==', movieSlug));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MovieRating);
  } catch {
    return [];
  }
}

/** Đánh giá phim (tạo mới hoặc cập nhật nếu user đã đánh giá trước đó) */
export async function rateMovie(
  movieSlug: string,
  uid: string,
  username: string,
  stars: number
): Promise<boolean> {
  try {
    const ref = doc(db, COL, ratingId(movieSlug, uid));
    const existing = await getDoc(ref);
    const createdAt = existing.exists() ? (existing.data().createdAt as number) : Date.now();
    await setDoc(ref, {
      movieSlug,
      uid,
      username,
      stars: Math.min(5, Math.max(1, Math.round(stars))),
      createdAt,
      updatedAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteRating(movieSlug: string, uid: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COL, ratingId(movieSlug, uid)));
    return true;
  } catch {
    return false;
  }
}

export function calcAverage(ratings: MovieRating[]): { avg: number; count: number } {
  if (ratings.length === 0) return { avg: 0, count: 0 };
  const sum = ratings.reduce((s, r) => s + r.stars, 0);
  return { avg: sum / ratings.length, count: ratings.length };
}
