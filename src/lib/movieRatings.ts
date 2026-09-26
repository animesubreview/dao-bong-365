/**
 * Đánh giá cảm xúc theo phim (Tệ/Tạm/Hay/Thích/Tuyệt), lưu trung bình + số lượt trên Firestore.
 * Mỗi trình duyệt chỉ vote được 1 lần cho mỗi phim (ghi nhớ qua localStorage — chặn tương đối,
 * không phải cơ chế chống gian lận tuyệt đối).
 */
import { doc, getDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { setDoc, updateDoc } from './firestoreGuard';

const COL = 'movie_ratings';
export const RATING_LABELS = ['Tệ', 'Tạm', 'Hay', 'Thích', 'Tuyệt'] as const;
export const RATING_EMOJIS = ['🤮', '😕', '😊', '😍', '🥰'] as const;

export interface MovieRating { sum: number; count: number }

export async function getMovieRating(slug: string): Promise<MovieRating> {
  try {
    const snap = await getDoc(doc(db, COL, slug));
    if (!snap.exists()) return { sum: 0, count: 0 };
    const d = snap.data() as any;
    return { sum: d.sum || 0, count: d.count || 0 };
  } catch {
    return { sum: 0, count: 0 };
  }
}

function votedKey(slug: string) { return `rated:${slug}`; }

export function hasVoted(slug: string): boolean {
  try { return !!localStorage.getItem(votedKey(slug)); } catch { return false; }
}

/** star: 1..5 (tương ứng Tệ..Tuyệt) */
export async function voteMovieRating(slug: string, star: 1 | 2 | 3 | 4 | 5): Promise<void> {
  if (hasVoted(slug)) return;
  const ref = doc(db, COL, slug);
  try {
    await updateDoc(ref, { sum: increment(star), count: increment(1) });
  } catch {
    // Tài liệu chưa tồn tại lần đầu → tạo mới
    await setDoc(ref, { sum: star, count: 1 });
  }
  try { localStorage.setItem(votedKey(slug), String(star)); } catch {}
}
