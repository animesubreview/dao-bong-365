// src/lib/geoblock.ts — tương thích Samsung TV (không dùng AbortSignal.timeout)
import { doc } from './firestore-compat';
import { saveDoc } from './firebaseUtils';
import { db } from './firebase';
import { onSnapshot } from './firestoreGuard';

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
  await saveDoc(doc(db, 'config', 'geoblock'), data, { merge: true });
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
// Giới hạn thời gian chờ: nếu Supabase phản hồi chậm/treo thì dùng giá trị dự phòng
// thay vì để cả web quay vòng mãi ở màn hình chờ.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>(function (resolve) {
    var done = false;
    var t = setTimeout(function () { if (!done) { done = true; resolve(fallback); } }, ms);
    p.then(
      function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
      function () { if (!done) { done = true; clearTimeout(t); resolve(fallback); } }
    );
  });
}

function readCachedEnabled(): { enabled: boolean; fresh: boolean } | null {
  try {
    const v = localStorage.getItem('geoblock_config');
    if (v) {
      const cfg = JSON.parse(v) as GeoblockConfig;
      // Cache dưới 5 phút thì coi là còn mới
      const fresh = !!cfg.updatedAt && Date.now() - cfg.updatedAt < 5 * 60 * 1000;
      return { enabled: cfg.enabled, fresh };
    }
  } catch {}
  return null;
}

async function fetchGeoblockEnabled(): Promise<boolean> {
  try {
    const { getDoc } = await import('./firestore-compat');
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

export async function getGeoblockEnabled(): Promise<boolean> {
  const cached = readCachedEnabled();
  if (cached && cached.fresh) return cached.enabled;
  // Tối đa 4 giây; quá hạn thì dùng cache cũ (nếu có) hoặc mặc định
  const fallback = cached ? cached.enabled : DEFAULT_GEOBLOCK.enabled;
  return withTimeout(fetchGeoblockEnabled(), 4000, fallback);
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
