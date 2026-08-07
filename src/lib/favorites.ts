// ─── Favorites Service (Firestore, theo từng tài khoản) ────────────────────────
import {
  collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export type FavoriteType = 'api' | 'manual';

export interface FavoriteItem {
  id: string; // `${type}_${slug}`
  slug: string;
  type: FavoriteType;
  name: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  quality?: string;
  lang?: string;
  addedAt: number;
}

function favId(type: FavoriteType, slug: string) {
  return `${type}_${slug}`;
}

function favCol(uid: string) {
  return collection(db, 'users', uid, 'favorites');
}

export async function getFavorites(uid: string): Promise<FavoriteItem[]> {
  try {
    const q = query(favCol(uid), orderBy('addedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FavoriteItem);
  } catch {
    return [];
  }
}

export async function addFavorite(
  uid: string,
  item: Omit<FavoriteItem, 'id' | 'addedAt'>
): Promise<boolean> {
  try {
    const id = favId(item.type, item.slug);
    await setDoc(doc(favCol(uid), id), { ...item, id, addedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function removeFavorite(
  uid: string,
  type: FavoriteType,
  slug: string
): Promise<boolean> {
  try {
    await deleteDoc(doc(favCol(uid), favId(type, slug)));
    return true;
  } catch {
    return false;
  }
}

export async function isFavorited(
  uid: string,
  type: FavoriteType,
  slug: string
): Promise<boolean> {
  try {
    const snap = await getDoc(doc(favCol(uid), favId(type, slug)));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function clearFavorites(uid: string): Promise<void> {
  try {
    const snap = await getDocs(favCol(uid));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch {
    // ignore
  }
}
