import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Toàn bộ cấu hình website (tên site, email/telegram quảng cáo, cảnh báo copy...)
// được lưu tại 1 document duy nhất trên Firestore: config/site_settings
// -> Admin sửa 1 lần, TẤT CẢ người dùng đều thấy (khác với localStorage chỉ lưu theo từng máy).
const SETTINGS_DOC = () => doc(db, 'config', 'site_settings');
const LOCAL_KEY = 'site_settings';

export type SiteSettings = Record<string, any>;

// Đọc cache cục bộ ngay lập tức (hiển thị tạm trong lúc chờ Firestore trả về, tránh giật/nhấp nháy)
function readLocalCache(): SiteSettings {
  try {
    const v = localStorage.getItem(LOCAL_KEY);
    return v ? JSON.parse(v) : {};
  } catch { return {}; }
}

function writeLocalCache(settings: SiteSettings) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(settings)); } catch {}
}

// ─── Lấy 1 lần (dùng khi mount Admin) ─────────────────────────────────────────
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(SETTINGS_DOC());
    if (snap.exists()) {
      const data = snap.data();
      writeLocalCache(data);
      return data;
    }
  } catch (e) {
    console.warn('[siteSettings] Không lấy được từ Firestore, dùng cache cục bộ:', e);
  }
  return readLocalCache();
}

// ─── Lưu (Admin bấm nút Lưu) ──────────────────────────────────────────────────
export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  writeLocalCache(settings);
  window.dispatchEvent(new Event('site_settings_updated'));
  await setDoc(SETTINGS_DOC(), settings, { merge: true });
}

// ─── Lắng nghe real-time (Footer, WatchManual, mọi trang hiển thị công khai) ──
// Mọi người dùng đang mở web sẽ tự cập nhật ngay khi Admin lưu, không cần tải lại trang.
export function subscribeSiteSettings(callback: (settings: SiteSettings) => void): () => void {
  // Trả cache cục bộ ngay lập tức để không bị trắng/giật khi mới vào trang
  callback(readLocalCache());

  const unsub = onSnapshot(
    SETTINGS_DOC(),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        writeLocalCache(data);
        callback(data);
      }
    },
    (err) => console.warn('[siteSettings] Lỗi lắng nghe Firestore:', err)
  );

  return unsub;
}
