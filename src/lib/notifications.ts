// ─── Notification System (Firebase) ──────────────────────────────────────────
// Admin tạo thông báo → lưu Firebase → tất cả người dùng đều thấy

import {
  collection, doc, onSnapshot, deleteDoc,
  updateDoc, addDoc, serverTimestamp, query, orderBy,
  getDocs, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

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
}

const NOTIFS_COL = 'siteNotifications';
const DISMISSED_KEY = 'kk_dismissed_notifs';

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

  const ref = await addDoc(collection(db, NOTIFS_COL), notif);
  return { id: ref.id, ...notif } as SiteNotification;
}

export async function updateNotification(id: string, data: Partial<SiteNotification>) {
  await updateDoc(doc(db, NOTIFS_COL, id), data as any);
}

export async function deleteNotification(id: string) {
  await deleteDoc(doc(db, NOTIFS_COL, id));
}

// ── Subscribe realtime (dùng trong NotificationDisplay) ───────────────────────

export function subscribeNotifications(cb: (notifs: SiteNotification[]) => void) {
  const q = query(collection(db, NOTIFS_COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteNotification)));
  });
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

// ── Helper filter ─────────────────────────────────────────────────────────────

export function filterActiveNotifications(notifs: SiteNotification[]): SiteNotification[] {
  const now = Date.now();
  return notifs.filter(n => n.active && (!n.expiresAt || n.expiresAt > now));
}
