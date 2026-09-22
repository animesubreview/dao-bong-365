import { db } from './firebase';
import {
  doc, setDoc, deleteDoc, onSnapshot,
  collection, serverTimestamp, Timestamp,
} from 'firebase/firestore';

// TTL: nếu user không ping trong 2 phút → coi là offline
const PING_INTERVAL = 30_000; // 30s
const OFFLINE_TTL = 120_000;  // 2 phút

let _sessionId: string | null = null;
let _pingTimer: ReturnType<typeof setInterval> | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  let id = sessionStorage.getItem('presence_session');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('presence_session', id);
  }
  _sessionId = id;
  return id;
}

/** Gọi khi app mount — bắt đầu tracking presence */
export function startPresence() {
  const sessionId = getSessionId();
  const ref = doc(db, 'presence', sessionId);

  const ping = () => {
    setDoc(ref, { lastSeen: serverTimestamp(), ua: navigator.userAgent.slice(0, 80) }, { merge: true })
      .catch(() => {/* ignore network errors */});
  };

  ping();
  _pingTimer = setInterval(ping, PING_INTERVAL);

  const cleanup = () => {
    if (_pingTimer) clearInterval(_pingTimer);
    deleteDoc(ref).catch(() => {});
  };

  window.addEventListener('beforeunload', cleanup);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      deleteDoc(ref).catch(() => {});
    } else {
      ping();
    }
  });

  return cleanup;
}

export interface PresenceStats {
  total: number;
  byDevice: { mobile: number; desktop: number; tablet: number; other: number };
}

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' | 'other' {
  if (!ua) return 'other';
  const u = ua.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(u)) return 'tablet';
  if (/(mobi|android|iphone|ipod|blackberry|opera mini|windows phone)/i.test(u)) return 'mobile';
  if (/mozilla|chrome|safari|firefox|msie|trident/i.test(u)) return 'desktop';
  return 'other';
}

/** Subscribe số người online realtime — trả về unsubscribe fn */
export function subscribeOnlineUsers(callback: (stats: PresenceStats) => void): () => void {
  const col = collection(db, 'presence');
  return onSnapshot(col, snapshot => {
    const now = Date.now();
    let total = 0;
    const byDevice = { mobile: 0, desktop: 0, tablet: 0, other: 0 };

    snapshot.forEach(d => {
      const data = d.data();
      const lastSeen: Timestamp | undefined = data.lastSeen;
      if (!lastSeen) return;
      const ms = lastSeen.toMillis();
      if (now - ms > OFFLINE_TTL) return; // quá cũ → skip
      total++;
      const device = detectDevice(data.ua || '');
      byDevice[device]++;
    });

    callback({ total, byDevice });
  }, () => {
    // lỗi quyền → trả về 0 thay vì crash
    callback({ total: 0, byDevice: { mobile: 0, desktop: 0, tablet: 0, other: 0 } });
  });
}
