// ─── Watch History Service (Firestore, theo từng tài khoản) ────────────────────
import {
  collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, limit as fbLimit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { HistoryItem } from '../types';

function historyCol(uid: string) {
  return collection(db, 'users', uid, 'history');
}

export async function getHistory(uid: string, max: number = 20): Promise<HistoryItem[]> {
  try {
    const q = query(historyCol(uid), orderBy('updatedAt', 'desc'), fbLimit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as HistoryItem);
  } catch {
    return [];
  }
}

/** Lưu / cập nhật 1 phim vào lịch sử xem (dùng slug làm id để ghi đè lần xem cũ) */
export async function saveHistoryItem(
  uid: string,
  item: Omit<HistoryItem, 'updatedAt'>
): Promise<boolean> {
  try {
    await setDoc(doc(historyCol(uid), item.slug), { ...item, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function removeHistoryItem(uid: string, slug: string): Promise<boolean> {
  try {
    await deleteDoc(doc(historyCol(uid), slug));
    return true;
  } catch {
    return false;
  }
}

export async function clearHistory(uid: string): Promise<void> {
  try {
    const snap = await getDocs(historyCol(uid));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch {
    // ignore
  }
}
