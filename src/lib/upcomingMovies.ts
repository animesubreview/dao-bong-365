import { collection, doc, query, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { addDoc, updateDoc, deleteDoc, onSnapshot } from './firestoreGuard';
import { fetchCollectionCached, invalidateCache } from './publicCache';

export interface UpcomingMovie {
  id: string;
  name: string;
  originName: string;
  year: string;
  posterUrl: string;
  description: string;
  releaseDate: string;       // VD: "22/5/2026"
  upcomingType: 'movie' | 'anime' | 'series'; // loại sắp chiếu
  trailerUrl?: string;
  genres?: string[];
  createdAt: number;
}

const COL = 'upcoming_movies';

export async function createUpcomingMovie(data: Omit<UpcomingMovie, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: Date.now() });
  invalidateCache(COL);
  return ref.id;
}

export async function updateUpcomingMovie(id: string, data: Partial<Omit<UpcomingMovie, 'id'>>) {
  await updateDoc(doc(db, COL, id), data);
  invalidateCache(COL);
}

export async function deleteUpcomingMovie(id: string) {
  await deleteDoc(doc(db, COL, id));
  invalidateCache(COL);
}

export async function getUpcomingMovie(id: string): Promise<UpcomingMovie | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UpcomingMovie;
}

export async function getAllUpcomingMovies(): Promise<UpcomingMovie[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UpcomingMovie));
}

/** Đọc có cache (3 phút) — dùng ở trang chủ, đỡ tốn lượt đọc Firestore */
export async function getUpcomingMoviesCached(): Promise<UpcomingMovie[]> {
  return fetchCollectionCached<UpcomingMovie>(COL, COL, [orderBy('createdAt', 'desc')], 3 * 60_000);
}

/** Subscribe realtime - CHỈ dùng trong Admin */
export function subscribeUpcomingMovies(cb: (movies: UpcomingMovie[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as UpcomingMovie)));
  });
}
