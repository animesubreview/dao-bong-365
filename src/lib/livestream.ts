// ─── Livestream Service ────────────────────────────────────────────────────────
// Quản lý cấu hình phát trực tiếp (bật/tắt, link nhúng) + chat realtime kèm theo.
import {
  collection, doc, addDoc, deleteDoc, getDoc, getDocs, setDoc,
  onSnapshot, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'livestream';
const DOC_ID = 'main';

export interface LiveConfig {
  enabled: boolean;
  title: string;
  description: string;
  embedUrl: string;
  posterUrl: string;
  updatedAt: number;
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  enabled: false,
  title: '',
  description: '',
  embedUrl: '',
  posterUrl: '',
  updatedAt: 0,
};

// ── Cấu hình livestream (realtime) ────────────────────────────────────────────
export function subscribeLiveConfig(cb: (cfg: LiveConfig) => void): () => void {
  return onSnapshot(
    doc(db, COL, DOC_ID),
    snap => cb(snap.exists() ? ({ ...DEFAULT_LIVE_CONFIG, ...snap.data() } as LiveConfig) : DEFAULT_LIVE_CONFIG),
    () => cb(DEFAULT_LIVE_CONFIG)
  );
}

export async function getLiveConfig(): Promise<LiveConfig> {
  try {
    const snap = await getDoc(doc(db, COL, DOC_ID));
    if (!snap.exists()) return DEFAULT_LIVE_CONFIG;
    return { ...DEFAULT_LIVE_CONFIG, ...snap.data() } as LiveConfig;
  } catch {
    return DEFAULT_LIVE_CONFIG;
  }
}

export async function updateLiveConfig(data: Partial<Omit<LiveConfig, 'updatedAt'>>): Promise<void> {
  await setDoc(doc(db, COL, DOC_ID), { ...data, updatedAt: Date.now() }, { merge: true });
}

// ── Chat realtime của phòng livestream ────────────────────────────────────────
export interface LiveChatMessage {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  text: string;
  isAdmin?: boolean;
  createdAt: number;
}

export function subscribeLiveChat(cb: (msgs: LiveChatMessage[]) => void): () => void {
  const q = query(collection(db, COL, DOC_ID, 'chat'), orderBy('createdAt', 'asc'), limit(200));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveChatMessage)));
  });
}

export async function sendLiveChatMessage(msg: Omit<LiveChatMessage, 'id'>): Promise<void> {
  await addDoc(collection(db, COL, DOC_ID, 'chat'), msg);
}

export async function deleteLiveChatMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, DOC_ID, 'chat', id));
}

export async function clearLiveChat(): Promise<void> {
  const snap = await getDocs(collection(db, COL, DOC_ID, 'chat'));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// ── Helper: dựng URL nhúng + phát hiện nền tảng để áp dụng chặn tua ───────────
export type LiveEmbedKind = 'youtube' | 'facebook' | 'generic';

export function buildLiveEmbed(raw: string): { url: string; kind: LiveEmbedKind } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { url: '', kind: 'generic' };

  // YouTube: watch?v=, youtu.be/, /live/
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (ytMatch) {
    const params = 'autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&playsinline=1&enablejsapi=1';
    return { url: `https://www.youtube.com/embed/${ytMatch[1]}?${params}`, kind: 'youtube' };
  }
  // Đã là link nhúng YouTube sẵn → chỉ cần bổ sung tham số chặn tua
  if (trimmed.includes('youtube.com/embed/')) {
    const extra = 'controls=0&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&enablejsapi=1&autoplay=1';
    return { url: `${trimmed}${trimmed.includes('?') ? '&' : '?'}${extra}`, kind: 'youtube' };
  }
  // Facebook video/live
  if (trimmed.includes('facebook.com')) {
    if (trimmed.includes('/plugins/video.php')) return { url: trimmed, kind: 'facebook' };
    return {
      url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false&autoplay=true`,
      kind: 'facebook',
    };
  }
  // Link nhúng khác (Twitch, player riêng...) — giữ nguyên
  return { url: trimmed, kind: 'generic' };
}

// Gửi lệnh điều khiển tới iframe YouTube qua postMessage (không cho tua, chỉ play/pause/mute)
export function postYouTubeCommand(iframe: HTMLIFrameElement | null, func: string, args: any[] = []) {
  try {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  } catch {}
}
