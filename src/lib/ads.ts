// ═══════════════════════════════════════════════════════════════════════════
// ADS — Toàn bộ logic Firebase cho quảng cáo, gom về 1 file duy nhất.
// Banner QC + Popup QC + Click QC đều nằm ở đây: types, đường dẫn Firestore,
// CRUD, và các hook realtime dùng chung.
//
// Component hiển thị (AdBanner.tsx, PopupAd.tsx, ClickAd.tsx) và trang quản
// trị (Admin.tsx) đều import từ file này — không tự viết lại query Firestore
// riêng để tránh trùng lặp / lệch dữ liệu giữa 2 nơi.
// ═══════════════════════════════════════════════════════════════════════════

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, onSnapshot, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
 * BANNER QC — banner ảnh/gif/mp4 chèn trên trang (top/bottom/middle/sticky)
 * ───────────────────────────────────────────────────────────────────────── */
export interface AdBannerData {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'gif' | 'mp4' | 'image';
  linkUrl: string;
  // 'sticky' = banner cố định (fixed) ở cuối màn hình, hiển thị trên mọi trang, cả PC lẫn Mobile
  position: 'top' | 'bottom' | 'middle' | 'sticky';
  active: boolean;
  createdAt: number;
}

const BANNER_COL = 'ptt_ad_banners';

export async function getAdBanners(): Promise<AdBannerData[]> {
  try {
    const snap = await getDocs(query(collection(db, BANNER_COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData));
  } catch (e) {
    console.error('[ads] getAdBanners error:', e);
    return [];
  }
}

export async function createAdBanner(data: Omit<AdBannerData, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, BANNER_COL), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateAdBanner(id: string, data: Partial<AdBannerData>) {
  await updateDoc(doc(db, BANNER_COL, id), data);
}

export async function deleteAdBanner(id: string) {
  await deleteDoc(doc(db, BANNER_COL, id));
}

/** Realtime listener dùng chung cho cả trang hiển thị lẫn Admin — tránh viết onSnapshot 2 nơi */
export function subscribeAdBanners(callback: (banners: AdBannerData[]) => void, onError?: (e: any) => void): () => void {
  try {
    const q = query(collection(db, BANNER_COL), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData))),
      err => { console.error('[ads] subscribeAdBanners error:', err); onError?.(err); }
    );
  } catch (e) {
    console.error('[ads] subscribeAdBanners setup error:', e);
    onError?.(e);
    return () => {};
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * POPUP QC — popup ảnh/gif/mp4 hiện giữa màn hình khi vào trang phim
 * ───────────────────────────────────────────────────────────────────────── */
export interface PopupAdData {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'gif' | 'mp4' | 'image';
  linkUrl: string;
  active: boolean;
  createdAt: number;
}

const POPUP_COL = 'ptt_popup_ads';

export async function getPopupAds(): Promise<PopupAdData[]> {
  try {
    const snap = await getDocs(query(collection(db, POPUP_COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PopupAdData));
  } catch (e) {
    console.error('[ads] getPopupAds error:', e);
    return [];
  }
}

export async function createPopupAd(data: Omit<PopupAdData, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, POPUP_COL), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updatePopupAd(id: string, data: Partial<PopupAdData>) {
  await updateDoc(doc(db, POPUP_COL, id), data);
}

export async function deletePopupAd(id: string) {
  await deleteDoc(doc(db, POPUP_COL, id));
}

/** Realtime listener dùng chung cho cả trang hiển thị lẫn Admin */
export function subscribePopupAds(callback: (popups: PopupAdData[]) => void, onError?: (e: any) => void): () => void {
  try {
    const q = query(collection(db, POPUP_COL), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as PopupAdData))),
      err => { console.error('[ads] subscribePopupAds error:', err); onError?.(err); }
    );
  } catch (e) {
    console.error('[ads] subscribePopupAds setup error:', e);
    onError?.(e);
    return () => {};
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * CLICK QC — mở link QC trong tab mới khi user click bất kỳ đâu trên trang.
 * Tài khoản admin + user đang có VIP còn hạn không bị ảnh hưởng.
 * ───────────────────────────────────────────────────────────────────────── */
export interface ClickAdConfig {
  enabled: boolean;
  link: string;         // URL mở khi click (Link QC 1)
  cooldown: number;     // Thời gian chờ giữa 2 lần hiện của Link QC 1 (giây)
  link2?: string;       // URL thứ 2 (tùy chọn) — chạy độc lập, KHÔNG random với link 1
  cooldown2?: number;   // Thời gian chờ riêng cho Link QC 2 (giây)
}

const CLICK_AD_COL = 'site_config';
const CLICK_AD_DOC = 'click_ad';

export const DEFAULT_CLICK_AD: ClickAdConfig = {
  enabled: false,
  link: '',
  cooldown: 60,
  link2: '',
  cooldown2: 60,
};

export async function getClickAdConfig(): Promise<ClickAdConfig> {
  try {
    const snap = await getDoc(doc(db, CLICK_AD_COL, CLICK_AD_DOC));
    if (snap.exists()) return { ...DEFAULT_CLICK_AD, ...snap.data() } as ClickAdConfig;
    return { ...DEFAULT_CLICK_AD };
  } catch { return { ...DEFAULT_CLICK_AD }; }
}

export async function saveClickAdConfig(cfg: ClickAdConfig): Promise<void> {
  await setDoc(doc(db, CLICK_AD_COL, CLICK_AD_DOC), cfg);
}

/** Realtime hook cho ClickAd.tsx (site) */
export function useClickAdConfig(): ClickAdConfig {
  const [cfg, setCfg] = useState<ClickAdConfig>({ ...DEFAULT_CLICK_AD });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, CLICK_AD_COL, CLICK_AD_DOC),
      snap => { if (snap.exists()) setCfg({ ...DEFAULT_CLICK_AD, ...snap.data() } as ClickAdConfig); },
      () => {}
    );
    return unsub;
  }, []);

  return cfg;
}
