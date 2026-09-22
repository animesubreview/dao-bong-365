// ─── Notification System (Firebase) ──────────────────────────────────────────
// Admin tạo thông báo → lưu Firebase → tất cả người dùng đều thấy

import { collection, doc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { deleteDoc, updateDoc, addDoc, setDoc } from './firestoreGuard';
import { fetchCollectionCached, invalidateCache, onCacheInvalidated } from './publicCache';

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: number;
  expiresAt?: number;
  active: boolean;
  showAsPopup: boolean;
  targetUrl?: string;
  imageUrl?: string;
  displayStyle?: 'default' | 'image_link';
  /** Danh mục hiển thị trong trang Thông báo: 'phim' (mặc định) hoặc 'cong_dong' */
  category?: 'phim' | 'cong_dong';
}

const NOTIFS_COL = 'siteNotifications';
const DISMISSED_KEY = 'kk_dismissed_notifs';
const READ_KEY = 'kk_read_notifs';

// ── Firebase CRUD ──────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<SiteNotification[]> {
  try {
    const q = query(collection(db, NOTIFS_COL), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteNotification));
  } catch { return []; }
}

export async function createNotification(
  data: Omit<SiteNotification, 'id' | 'createdAt'>
): Promise<SiteNotification> {
  // Firestore không chấp nhận giá trị undefined → lọc bỏ trước khi ghi
  const notif: Record<string, any> = {
    title: data.title,
    message: data.message,
    type: data.type,
    active: data.active,
    showAsPopup: data.showAsPopup,
    createdAt: Date.now(),
  };
  if (data.targetUrl)     notif.targetUrl     = data.targetUrl;
  if (data.expiresAt)     notif.expiresAt     = data.expiresAt;
  if (data.imageUrl)      notif.imageUrl      = data.imageUrl;
  if (data.displayStyle)  notif.displayStyle  = data.displayStyle;
  notif.category = data.category || 'phim';

  const ref = await addDoc(collection(db, NOTIFS_COL), notif);
  invalidateCache(NOTIFS_COL);
  return { id: ref.id, ...notif } as SiteNotification;
}

export async function updateNotification(id: string, data: Partial<SiteNotification>) {
  // Firestore không chấp nhận giá trị undefined trong updateDoc → lọc bỏ trước khi ghi
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(doc(db, NOTIFS_COL, id), clean);
  invalidateCache(NOTIFS_COL);
}

export async function deleteNotification(id: string) {
  await deleteDoc(doc(db, NOTIFS_COL, id));
  invalidateCache(NOTIFS_COL);
}

// ── Subscribe realtime (dùng trong NotificationDisplay) ───────────────────────

// Trước đây dùng onSnapshot (lắng nghe realtime) — Header.tsx VÀ NotificationDisplay.tsx
// đều gọi hàm này, tức MỖI TRANG đều mở 2 kết nối realtime riêng tới cùng 1 collection.
// Giờ đọc có cache (fetchCollectionCached tự gộp 2 lệnh gọi trùng lúc thành 1 request) +
// polling nhẹ mỗi 60s để thông báo mới vẫn hiện ra mà không tốn 1 kết nối/khách/trang.
export function subscribeNotifications(cb: (notifs: SiteNotification[]) => void): () => void {
  let stopped = false;
  const POLL_MS = 60_000;

  const tick = () => {
    fetchCollectionCached<SiteNotification>(NOTIFS_COL, NOTIFS_COL, [orderBy('createdAt', 'desc')], POLL_MS)
      .then(list => { if (!stopped) cb(list); })
      .catch(() => { if (!stopped) cb([]); });
  };

  tick();
  const timer = setInterval(tick, POLL_MS);
  // Tự đọc lại ngay khi có nơi khác (VD Admin vừa tạo/sửa/xóa thông báo) làm mất hiệu lực cache,
  // để không phải đợi tới lượt poll kế tiếp mới thấy.
  const unsubInvalidate = onCacheInvalidated(NOTIFS_COL, tick);
  return () => { stopped = true; clearInterval(timer); unsubInvalidate(); };
}

// ── Dismissed (lưu local — chỉ để không show lại trong session) ───────────────

export function getDismissedIds(): string[] {
  try {
    const v = sessionStorage.getItem(DISMISSED_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export function dismissNotification(id: string) {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]));
  }
}

// ── Đã đọc (lưu local, dùng cho trang Thông báo + chấm đỏ trên chuông) ────────
// Khác với "dismissed": dismissed chỉ ẩn popup trong phiên hiện tại,
// còn "read" đánh dấu lâu dài (localStorage) để không hiện chấm đỏ nữa.

export function getReadIds(): string[] {
  try {
    const v = localStorage.getItem(READ_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export function markAsRead(id: string) {
  const read = getReadIds();
  if (!read.includes(id)) {
    localStorage.setItem(READ_KEY, JSON.stringify([...read, id]));
  }
}

export function markAllAsRead(ids: string[]) {
  const read = new Set(getReadIds());
  ids.forEach(id => read.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

export function countUnread(notifs: SiteNotification[]): number {
  const read = new Set(getReadIds());
  return filterActiveNotifications(notifs).filter(n => !read.has(n.id)).length;
}

// ── Helper filter ─────────────────────────────────────────────────────────────

export function filterActiveNotifications(notifs: SiteNotification[]): SiteNotification[] {
  const now = Date.now();
  return notifs.filter(n => n.active && (!n.expiresAt || n.expiresAt > now));
}
