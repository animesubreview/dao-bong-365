import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, onSnapshot as snap, query, orderBy, limit } from './firestore-compat';
import { onSnapshot } from './firestoreGuard';
import { saveDoc } from './firebaseUtils';
import { db } from './firebase';

// Phòng cộng đồng: chat + mic (WebRTC) + yêu cầu phim. Admin bật/tắt từng phần tại config/community_chat.
export const COMMUNITY_VOICE_ROOM = 'community_voice';
const CONFIG_KEY = 'community_config';
const REQ_COL = 'movie_requests';

export interface CommunityConfig {
  chatEnabled: boolean;
  micEnabled: boolean;
  requestsEnabled: boolean;
  micMax: number;     // số người tối đa trong phòng thoại (mesh WebRTC nên giữ ≤ 8)
  notice: string;     // thông báo ghim đầu phòng chat
  updatedAt: number;
}

export const DEFAULT_COMMUNITY: CommunityConfig = {
  chatEnabled: true, micEnabled: true, requestsEnabled: true, micMax: 8, notice: '', updatedAt: 0,
};

export async function saveCommunityConfig(cfg: CommunityConfig): Promise<void> {
  const data = { ...cfg, micMax: Math.min(12, Math.max(2, Number(cfg.micMax) || 8)), updatedAt: Date.now() };
  await saveDoc(doc(db, 'config', 'community_chat'), data, { merge: true });
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(data)); } catch {}
}

export function subscribeCommunityConfig(cb: (c: CommunityConfig) => void): () => void {
  try { const v = localStorage.getItem(CONFIG_KEY); if (v) cb({ ...DEFAULT_COMMUNITY, ...JSON.parse(v) }); } catch {}
  return onSnapshot(
    doc(db, 'config', 'community_chat'),
    (s: any) => {
      if (!s.exists()) { cb(DEFAULT_COMMUNITY); return; }
      const data = { ...DEFAULT_COMMUNITY, ...s.data() } as CommunityConfig;
      try { localStorage.setItem(CONFIG_KEY, JSON.stringify(data)); } catch {}
      cb(data);
    },
    (e: any) => console.warn('[community] lỗi lắng nghe cấu hình:', e)
  );
}

// ── Yêu cầu phim ──────────────────────────────────────────────────────────────
export type RequestStatus = 'pending' | 'done' | 'rejected';
export interface MovieRequest {
  id: string; uid: string; username: string; avatar: string;
  title: string; note: string; status: RequestStatus; createdAt: number;
}

export async function addMovieRequest(r: Omit<MovieRequest, 'id'>): Promise<void> {
  await addDoc(collection(db, REQ_COL), r);
}
export function subscribeMovieRequests(cb: (list: MovieRequest[]) => void, max = 60): () => void {
  const q = query(collection(db, REQ_COL), orderBy('createdAt', 'desc'), limit(max));
  return snap(q, (s: any) => cb(s.docs.map((d: any) => ({ id: d.id, ...d.data() } as MovieRequest))));
}
export async function setMovieRequestStatus(id: string, status: RequestStatus): Promise<void> {
  await updateDoc(doc(db, REQ_COL, id), { status });
}
export async function deleteMovieRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, REQ_COL, id));
}

/** Đếm người đang ở phòng thoại (bỏ presence quá 70s không heartbeat). */
export async function countVoiceUsers(): Promise<number> {
  try {
    const s: any = await getDocs(collection(db, 'watchRooms', COMMUNITY_VOICE_ROOM, 'voice'));
    const now = Date.now();
    return s.docs.filter((d: any) => now - ((d.data().ts as number) || 0) < 70_000).length;
  } catch { return 0; }
}
