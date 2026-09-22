// ─── Livestream Service ────────────────────────────────────────────────────────
// Quản lý cấu hình phát trực tiếp (bật/tắt, link nhúng) + chat realtime kèm theo.
import {
  collection, doc, addDoc, deleteDoc, getDoc, getDocs, setDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp, Timestamp,
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
  requireApproval: boolean; // true = phải đăng ký & được admin duyệt mới xem được
  scheduledAt: number;      // 0 = phát ngay; > 0 = thời điểm (ms) admin hẹn giờ chiếu
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  enabled: false,
  title: '',
  description: '',
  embedUrl: '',
  posterUrl: '',
  updatedAt: 0,
  requireApproval: false,
  scheduledAt: 0,
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
export type LiveEmbedKind = 'youtube' | 'facebook' | 'mux' | 'generic';

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
  // Mux Live: đã là link stream.mux.com sẵn (có thể thiếu .m3u8 ở cuối) → chuẩn hóa lại
  if (trimmed.includes('stream.mux.com')) {
    const clean = trimmed.split('?')[0].replace(/\/$/, '');
    const withExt = clean.endsWith('.m3u8') ? clean : `${clean}.m3u8`;
    return { url: withExt, kind: 'mux' };
  }
  // Mux Live: dán thẳng Playback ID (chuỗi chữ+số, không có domain/dấu chấm)
  // VD: KTdOXrie8H1tHMEjEhsOpILRF0000stnBwDhDGM7lcly4
  if (/^[a-zA-Z0-9]{20,80}$/.test(trimmed)) {
    return { url: `https://stream.mux.com/${trimmed}.m3u8`, kind: 'mux' };
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

// ── Đăng ký vào phòng chiếu — chờ admin duyệt ─────────────────────────────────
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface RoomRegistration {
  uid: string;
  username: string;
  avatar: string;
  status: RegistrationStatus;
  requestedAt: number;
  decidedAt?: number;
}

const regDoc = (uid: string) => doc(db, COL, DOC_ID, 'registrations', uid);

/** Gửi yêu cầu đăng ký xem phòng chiếu (hoặc gửi lại nếu trước đó bị từ chối) */
export async function requestRoomAccess(uid: string, username: string, avatar: string): Promise<void> {
  await setDoc(regDoc(uid), {
    uid, username, avatar,
    status: 'pending',
    requestedAt: Date.now(),
  }, { merge: true });
}

/** Theo dõi realtime trạng thái đăng ký của chính user hiện tại */
export function subscribeMyRegistration(uid: string, cb: (reg: RoomRegistration | null) => void): () => void {
  return onSnapshot(regDoc(uid), snap => {
    cb(snap.exists() ? (snap.data() as RoomRegistration) : null);
  }, () => cb(null));
}

/** [Admin] Theo dõi realtime toàn bộ danh sách đăng ký, mới nhất trước */
export function subscribeRegistrations(cb: (regs: RoomRegistration[]) => void): () => void {
  const q = query(collection(db, COL, DOC_ID, 'registrations'), orderBy('requestedAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as RoomRegistration));
  }, () => cb([]));
}

/** [Admin] Duyệt / từ chối / thu hồi quyền xem của một user */
export async function decideRegistration(uid: string, status: RegistrationStatus): Promise<void> {
  await setDoc(regDoc(uid), { status, decidedAt: Date.now() }, { merge: true });
}

/** [Admin] Xoá hẳn đăng ký (user phải đăng ký lại từ đầu) */
export async function removeRegistration(uid: string): Promise<void> {
  await deleteDoc(regDoc(uid));
}

// ── Số người đang xem phòng chiếu (presence realtime, TTL 2 phút) ────────────
const VIEWER_PING_INTERVAL = 30_000;
const VIEWER_OFFLINE_TTL = 120_000;
let _viewerTimer: ReturnType<typeof setInterval> | null = null;

/** Gọi khi vào trang xem — bắt đầu báo hiệu "đang xem", trả về hàm dọn dẹp khi rời trang */
export function startRoomPresence(uid: string): () => void {
  const ref = doc(db, COL, DOC_ID, 'viewers', uid || `guest_${Math.random().toString(36).slice(2)}`);

  const ping = () => {
    setDoc(ref, { lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  };
  ping();
  _viewerTimer = setInterval(ping, VIEWER_PING_INTERVAL);

  const stop = () => {
    if (_viewerTimer) clearInterval(_viewerTimer);
    deleteDoc(ref).catch(() => {});
  };
  window.addEventListener('beforeunload', stop);

  return () => {
    window.removeEventListener('beforeunload', stop);
    stop();
  };
}

/** Theo dõi realtime tổng số người đang xem phòng chiếu */
export function subscribeRoomViewerCount(cb: (count: number) => void): () => void {
  return onSnapshot(collection(db, COL, DOC_ID, 'viewers'), snap => {
    const now = Date.now();
    let count = 0;
    snap.forEach(d => {
      const lastSeen: Timestamp | undefined = d.data().lastSeen;
      if (lastSeen && now - lastSeen.toMillis() <= VIEWER_OFFLINE_TTL) count++;
    });
    cb(count);
  }, () => cb(0));
}
