// ─── Click-Ad (QC ẩn khi click) ───────────────────────────────────────────────
// Mỗi khi user click vào bất kỳ đâu trên trang sẽ mở link QC trong tab mới.
// Sau mỗi lần hiện, phải chờ `cooldown` giây mới hiện tiếp.
// Tài khoản admin (role === 'admin') KHÔNG bị ảnh hưởng.

import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useEffect, useState } from 'react';

export interface ClickAdConfig {
  enabled: boolean;
  link: string;         // URL mở khi click
  cooldown: number;     // Thời gian chờ giữa 2 lần hiện (giây)
}

const DOC_PATH = 'site_config/click_ad';

export const DEFAULT_CLICK_AD: ClickAdConfig = {
  enabled: false,
  link: '',
  cooldown: 60,
};

// ── Firestore CRUD ────────────────────────────────────────────────────────────
export async function getClickAdConfig(): Promise<ClickAdConfig> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'click_ad'));
    if (snap.exists()) return snap.data() as ClickAdConfig;
    return { ...DEFAULT_CLICK_AD };
  } catch { return { ...DEFAULT_CLICK_AD }; }
}

export async function saveClickAdConfig(cfg: ClickAdConfig): Promise<void> {
  await setDoc(doc(db, 'site_config', 'click_ad'), cfg);
}

// ── Realtime hook ─────────────────────────────────────────────────────────────
export function useClickAdConfig(): ClickAdConfig {
  const [cfg, setCfg] = useState<ClickAdConfig>({ ...DEFAULT_CLICK_AD });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'site_config', 'click_ad'),
      snap => {
        if (snap.exists()) setCfg(snap.data() as ClickAdConfig);
      },
      () => {}
    );
    return unsub;
  }, []);

  return cfg;
}
