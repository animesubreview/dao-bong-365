// src/lib/geoblock.ts — tương thích Samsung TV (không dùng AbortSignal.timeout)
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type GeoResult = 'vn' | 'foreign' | 'loading' | 'error';

// ── Config chặn IP nước ngoài ─────────────────────────────────────────────────
export interface GeoblockConfig {
  enabled: boolean;
  updatedAt: number;
}

export const DEFAULT_GEOBLOCK: GeoblockConfig = {
  enabled: true,
  updatedAt: 0,
};

export async function saveGeoblockConfig(config: GeoblockConfig): Promise<void> {
  const data = { ...config, updatedAt: Date.now() };
  await setDoc(doc(db, 'config', 'geoblock'), data, { merge: true });
  try { localStorage.setItem('geoblock_config', JSON.stringify(data)); } catch {}
}

export function subscribeGeoblockConfig(cb: (cfg: GeoblockConfig) => void): () => void {
  // Đọc localStorage trước để hiển thị ngay (không chờ Firestore)
  try {
    const v = localStorage.getItem('geoblock_config');
    if (v) cb({ ...DEFAULT_GEOBLOCK, ...JSON.parse(v) });
  } catch {}

  const unsub = onSnapshot(
    doc(db, 'config', 'geoblock'),
    snap => {
      if (!snap.exists()) { cb(DEFAULT_GEOBLOCK); return; }
      const data = { ...DEFAULT_GEOBLOCK, ...snap.data() } as GeoblockConfig;
      try { localStorage.setItem('geoblock_config', JSON.stringify(data)); } catch {}
      cb(data);
    },
    err => {
      console.warn('Firestore geoblock listen error:', err);
      try {
        const v = localStorage.getItem('geoblock_config');
        if (v) cb({ ...DEFAULT_GEOBLOCK, ...JSON.parse(v) });
        else cb(DEFAULT_GEOBLOCK);
      } catch { cb(DEFAULT_GEOBLOCK); }
    }
  );

  return unsub;
}

// ── Đọc 1 lần (dùng trong App.tsx) ───────────────────────────────────────────
export async function getGeoblockEnabled(): Promise<boolean> {
  // Kiểm tra localStorage cache trước
  try {
    const v = localStorage.getItem('geoblock_config');
    if (v) {
      const cfg = JSON.parse(v) as GeoblockConfig;
      // Cache dưới 5 phút thì dùng luôn
      if (cfg.updatedAt && Date.now() - cfg.updatedAt < 5 * 60 * 1000) {
        return cfg.enabled;
      }
    }
  } catch {}

  // Fetch Firestore
  try {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'config', 'geoblock'));
    if (snap.exists()) {
      const data = { ...DEFAULT_GEOBLOCK, ...snap.data() } as GeoblockConfig;
      try { localStorage.setItem('geoblock_config', JSON.stringify(data)); } catch {}
      return data.enabled;
    }
  } catch (err) {
    console.warn('getGeoblockEnabled error:', err);
  }

  return DEFAULT_GEOBLOCK.enabled;
}

// ── Các hàm detect IP (giữ nguyên) ───────────────────────────────────────────
function fetchTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(function() { ctrl.abort(); }, ms);
  return fetch(url, { signal: ctrl.signal }).then(
    function(r) { clearTimeout(timer); return r; },
    function(e) { clearTimeout(timer); throw e; }
  );
}

async function checkWithIpApi(): Promise<string> {
  const res = await fetchTimeout('https://ipapi.co/country/', 5000);
  if (!res.ok) throw new Error('fail');
  return (await res.text()).trim().toUpperCase();
}

async function checkWithIpApiFallback(): Promise<string> {
  const res = await fetchTimeout('https://ip-api.com/json/?fields=countryCode', 5000);
  if (!res.ok) throw new Error('fail');
  const j = await res.json();
  return String(j.countryCode || '').toUpperCase();
}

async function checkWithCountryIs(): Promise<string> {
  const res = await fetchTimeout('https://api.country.is/', 5000);
  if (!res.ok) throw new Error('fail');
  const j = await res.json();
  return String(j.country || '').toUpperCase();
}

export async function detectCountry(): Promise<'vn' | 'foreign' | 'error'> {
  const apis = [checkWithIpApi, checkWithIpApiFallback, checkWithCountryIs];
  for (let i = 0; i < apis.length; i++) {
    try {
      const code = await apis[i]();
      if (code) return code === 'VN' ? 'vn' : 'foreign';
    } catch (_) { /* thử API kế */ }
  }
  return 'error';
}

const CACHE_KEY = 'daophim_geo';

export async function getGeoResult(): Promise<GeoResult> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached === 'vn' || cached === 'foreign') return cached;
  } catch (_) { /* TV có thể block sessionStorage */ }

  // Timeout tổng 12 giây, sau đó cho vào luôn
  const result: 'vn' | 'foreign' | 'error' = await Promise.race([
    detectCountry(),
    new Promise<'error'>(function(resolve) {
      setTimeout(function() { resolve('error'); }, 12000);
    }),
  ]);

  try {
    if (result !== 'error') sessionStorage.setItem(CACHE_KEY, result);
  } catch (_) { /* ignore */ }

  return result;
}
