import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface MaintenanceConfig {
  enabled: boolean;
  title: string;
  message: string;
  endTime: string;
  mediaType: 'none' | 'image' | 'video';
  mediaUrl: string;
  updatedAt: number;
}

export const DEFAULT_MAINTENANCE: MaintenanceConfig = {
  enabled: false,
  title: 'Website Đang Bảo Trì',
  message: 'Chúng tôi đang nâng cấp hệ thống để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.',
  endTime: '',
  mediaType: 'none',
  mediaUrl: '',
  updatedAt: 0,
};

// ── Lưu lên Firestore — mọi người đều thấy ngay ──────────────────────────────
export async function saveMaintenanceConfig(config: MaintenanceConfig): Promise<void> {
  const data = { ...config, updatedAt: Date.now() };
  // Lưu Firestore (realtime — mọi user thấy ngay)
  await setDoc(doc(db, 'config', 'maintenance'), data, { merge: true });
  // Cũng lưu localStorage để load nhanh lần sau
  try { localStorage.setItem('maintenance_config', JSON.stringify(data)); } catch {}
}

// ── Subscribe realtime — khi admin bật/tắt thì mọi người thấy ngay ───────────
export function subscribeMaintenanceConfig(cb: (cfg: MaintenanceConfig) => void): () => void {
  // Đọc localStorage trước để hiển thị ngay (không chờ Firestore)
  try {
    const v = localStorage.getItem('maintenance_config');
    if (v) cb({ ...DEFAULT_MAINTENANCE, ...JSON.parse(v) });
  } catch {}

  // Lắng nghe Firestore realtime
  const unsub = onSnapshot(
    doc(db, 'config', 'maintenance'),
    snap => {
      if (!snap.exists()) { cb(DEFAULT_MAINTENANCE); return; }
      const data = { ...DEFAULT_MAINTENANCE, ...snap.data() } as MaintenanceConfig;
      // Cập nhật localStorage
      try { localStorage.setItem('maintenance_config', JSON.stringify(data)); } catch {}
      cb(data);
    },
    err => {
      console.warn('Firestore maintenance listen error:', err);
      // Fallback localStorage nếu Firestore lỗi
      try {
        const v = localStorage.getItem('maintenance_config');
        if (v) cb({ ...DEFAULT_MAINTENANCE, ...JSON.parse(v) });
        else cb(DEFAULT_MAINTENANCE);
      } catch { cb(DEFAULT_MAINTENANCE); }
    }
  );

  return unsub;
}
