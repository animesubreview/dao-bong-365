import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs, getDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface StreamSource {
  label: string;       // tên nguồn hiển thị, vd "HD1", "Bình luận tiếng Việt"
  url: string;         // link m3u8 hoặc embed
  isM3u8?: boolean;     // true = m3u8 trực tiếp, false/undefined = tự nhận diện theo đuôi link
}

export interface ManualMatchLink {
  id: string;
  fixtureId: number;       // ID trận từ API-Football
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  matchTime: string;       // hiển thị, vd "23:00 - 21/06/2026"
  sources: StreamSource[]; // danh sách các nguồn phát (HD1, HD2, ...)
  thumbnail?: string;      // ảnh đại diện trận đấu (tuỳ chọn)
  isFeatured?: boolean;    // hiển thị nổi bật trên trang chủ
  createdAt: number;
}

const COL = 'manual_matches';

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export async function createManualMatch(data: Omit<ManualMatchLink, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), stripUndefined({ ...data, createdAt: Date.now() }));
  return ref.id;
}

export async function updateManualMatch(id: string, data: Partial<Omit<ManualMatchLink, 'id'>>) {
  await updateDoc(doc(db, COL, id), stripUndefined(data));
}

export async function deleteManualMatch(id: string) {
  await deleteDoc(doc(db, COL, id));
}

export async function getManualMatch(id: string): Promise<ManualMatchLink | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ManualMatchLink;
}

/** Tìm link thủ công đã nhập cho 1 fixture (theo id từ API-Football) */
export async function getManualMatchByFixtureId(fixtureId: number): Promise<ManualMatchLink | null> {
  const q = query(collection(db, COL), where('fixtureId', '==', fixtureId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ManualMatchLink;
}

export async function getAllManualMatches(): Promise<ManualMatchLink[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMatchLink));
}

export function subscribeManualMatches(cb: (matches: ManualMatchLink[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualMatchLink)));
  });
}
