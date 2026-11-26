// ─── Đánh giá phim (1–5 sao) ─────────────────────────────────────────────────
// Lưu trong collection `movie_ratings`, mỗi người 1 đánh giá / phim: id = `${slug}__${uid}`
import { collection, doc, getDocs, query, where, limit, setDoc, deleteDoc } from './firestore-compat';
import { db } from './firebase';

const COL = 'movie_ratings';

export interface RatingSummary {
  total: number;
  avg: number;
  dist: [number, number, number, number, number]; // dist[0] = số lượt 5 sao ... dist[4] = 1 sao
  mine: number; // 0 nếu chưa đánh giá
}

export async function getRatingSummary(slug: string, uid?: string | null): Promise<RatingSummary> {
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0, total = 0, mine = 0;
  try {
    const snap = await getDocs(query(collection(db, COL), where('slug', '==', slug), limit(5000)));
    snap.docs.forEach(d => {
      const r = d.data() as any;
      const s = Math.round(Number(r.stars));
      if (s < 1 || s > 5) return;
      dist[5 - s]++; sum += s; total++;
      if (uid && r.uid === uid) mine = s;
    });
  } catch { /* trả về rỗng */ }
  return { total, avg: total ? sum / total : 0, dist, mine };
}

export async function setMovieRating(slug: string, uid: string, stars: number) {
  await setDoc(doc(db, COL, `${slug}__${uid}`), { slug, uid, stars, updatedAt: Date.now() });
}

export async function removeMovieRating(slug: string, uid: string) {
  await deleteDoc(doc(db, COL, `${slug}__${uid}`));
}
