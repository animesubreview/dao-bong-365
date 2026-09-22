/**
 * Player Config - Lưu cấu hình video player lên Firestore
 * Tất cả người dùng đều thấy cùng 1 config (real-time sync)
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface PlayerConfig {
  logoType: 'text' | 'image' | 'none';
  logoText: string;
  logoColor1: string;
  logoColor2: string;
  logoImageUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;
  logoOpacity: number;
  accentColor: string;
  defaultVolume: number;
  autoplay: boolean;
  showSkipIntro: boolean;
  skipIntroDuration: number;
  updatedAt: number;
}

export const DEFAULT_CONFIG: PlayerConfig = {
  logoType: 'text',
  logoText: 'ĐảoPhim',
  logoColor1: '#4ade80',
  logoColor2: '#ffffff',
  logoImageUrl: '',
  logoPosition: 'top-right',
  logoSize: 15,
  logoOpacity: 90,
  accentColor: '#22c55e',
  defaultVolume: 80,
  autoplay: true,
  showSkipIntro: false,
  skipIntroDuration: 90,
  updatedAt: Date.now(),
};

const STORAGE_KEY = 'daophim_player_config';
const FIRESTORE_DOC = 'settings/player_config';

// ── localStorage cache (fallback khi offline) ─────────────────
function getCached(): PlayerConfig {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_CONFIG;
}

function setCached(config: PlayerConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}

// ── Public API ────────────────────────────────────────────────

/** Lấy config từ localStorage (sync, instant) */
export function getPlayerConfig(): PlayerConfig {
  return getCached();
}

/**
 * Lưu config lên Firestore → tất cả user thấy ngay
 * Đồng thời cache localStorage để hoạt động offline
 */
export async function savePlayerConfig(config: Partial<PlayerConfig>): Promise<PlayerConfig> {
  const current = getCached();
  const updated: PlayerConfig = { ...current, ...config, updatedAt: Date.now() };

  // Save to localStorage immediately
  setCached(updated);
  window.dispatchEvent(new CustomEvent('playerConfigChanged', { detail: updated }));

  // Save to Firestore (all users will see)
  try {
    await setDoc(doc(db, 'settings', 'player_config'), updated);
    console.log('✅ Player config saved to Firestore');
  } catch (e) {
    console.warn('⚠️ Firestore save failed, using localStorage only:', e);
  }

  return updated;
}

/**
 * Subscribe to Firestore changes - cập nhật realtime cho tất cả users
 * Gọi 1 lần khi app khởi động
 */
export function subscribePlayerConfig(callback: (config: PlayerConfig) => void): () => void {
  // First, load from Firestore once
  getDoc(doc(db, 'settings', 'player_config'))
    .then(snap => {
      if (snap.exists()) {
        const config = { ...DEFAULT_CONFIG, ...snap.data() } as PlayerConfig;
        setCached(config);
        callback(config);
        window.dispatchEvent(new CustomEvent('playerConfigChanged', { detail: config }));
      }
    })
    .catch(() => {
      // Offline - use cached
      callback(getCached());
    });

  // Then subscribe to realtime updates
  const unsub = onSnapshot(
    doc(db, 'settings', 'player_config'),
    (snap) => {
      if (snap.exists()) {
        const config = { ...DEFAULT_CONFIG, ...snap.data() } as PlayerConfig;
        setCached(config);
        callback(config);
        window.dispatchEvent(new CustomEvent('playerConfigChanged', { detail: config }));
      }
    },
    (error) => {
      console.warn('Firestore player config subscription error:', error);
    }
  );

  return unsub;
}

/** Reset về mặc định và lưu lên Firestore */
export async function resetPlayerConfig(): Promise<PlayerConfig> {
  setCached(DEFAULT_CONFIG);
  window.dispatchEvent(new CustomEvent('playerConfigChanged', { detail: DEFAULT_CONFIG }));
  try {
    await setDoc(doc(db, 'settings', 'player_config'), DEFAULT_CONFIG);
  } catch {}
  return DEFAULT_CONFIG;
}
