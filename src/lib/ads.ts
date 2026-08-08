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

/**
 * Nhiều domain (phimtuoitho.co, daophim.online, ...) đang dùng CHUNG 1 Firebase
 * project. Nếu Banner QC / Popup QC / Click QC đều đọc/ghi chung 1
 * collection/document cố định thì tạo hay bật/tắt QC ở domain này sẽ hiện
 * luôn ở domain kia. Hàm này trả về hậu tố riêng cho từng domain (dựa theo
 * hostname hiện tại), dùng để tách collection/document theo từng site.
 * Chạy server-side (không có window) thì trả về 'default'.
 */
function getSiteSuffix(): string {
  if (typeof window === 'undefined' || !window.location?.hostname) return 'default';
  return window.location.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9]/g, '_');
}

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

// Tên collection gốc + hậu tố riêng theo domain, ví dụ:
//   phimtuoitho.co -> ptt_ad_banners__phimtuoitho_co
//   daophim.online  -> ptt_ad_banners__daophim_online
function bannerCol() { return `ptt_ad_banners__${getSiteSuffix()}`; }

export async function getAdBanners(): Promise<AdBannerData[]> {
  try {
    const snap = await getDocs(query(collection(db, bannerCol()), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData));
  } catch (e) {
    console.error('[ads] getAdBanners error:', e);
    return [];
  }
}

export async function createAdBanner(data: Omit<AdBannerData, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, bannerCol()), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateAdBanner(id: string, data: Partial<AdBannerData>) {
  await updateDoc(doc(db, bannerCol(), id), data);
}

export async function deleteAdBanner(id: string) {
  await deleteDoc(doc(db, bannerCol(), id));
}

/** Realtime listener dùng chung cho cả trang hiển thị lẫn Admin — tránh viết onSnapshot 2 nơi */
export function subscribeAdBanners(callback: (banners: AdBannerData[]) => void, onError?: (e: any) => void): () => void {
  try {
    const q = query(collection(db, bannerCol()), orderBy('createdAt', 'desc'));
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

// ptt_popup_ads__phimtuoitho_co / ptt_popup_ads__daophim_online — tách riêng theo domain
function popupCol() { return `ptt_popup_ads__${getSiteSuffix()}`; }

export async function getPopupAds(): Promise<PopupAdData[]> {
  try {
    const snap = await getDocs(query(collection(db, popupCol()), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PopupAdData));
  } catch (e) {
    console.error('[ads] getPopupAds error:', e);
    return [];
  }
}

export async function createPopupAd(data: Omit<PopupAdData, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, popupCol()), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updatePopupAd(id: string, data: Partial<PopupAdData>) {
  await updateDoc(doc(db, popupCol(), id), data);
}

export async function deletePopupAd(id: string) {
  await deleteDoc(doc(db, popupCol(), id));
}

/** Realtime listener dùng chung cho cả trang hiển thị lẫn Admin */
export function subscribePopupAds(callback: (popups: PopupAdData[]) => void, onError?: (e: any) => void): () => void {
  try {
    const q = query(collection(db, popupCol()), orderBy('createdAt', 'desc'));
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

// click_ad__phimtuoitho_co / click_ad__daophim_online — tách document riêng theo domain
// (xem giải thích chung ở getSiteSuffix() phía trên đầu file)
function getClickAdDocId(): string {
  return `click_ad__${getSiteSuffix()}`;
}

export const DEFAULT_CLICK_AD: ClickAdConfig = {
  enabled: false,
  link: '',
  cooldown: 60,
  link2: '',
  cooldown2: 60,
};

export async function getClickAdConfig(): Promise<ClickAdConfig> {
  try {
    const snap = await getDoc(doc(db, CLICK_AD_COL, getClickAdDocId()));
    if (snap.exists()) return { ...DEFAULT_CLICK_AD, ...snap.data() } as ClickAdConfig;
    return { ...DEFAULT_CLICK_AD };
  } catch { return { ...DEFAULT_CLICK_AD }; }
}

export async function saveClickAdConfig(cfg: ClickAdConfig): Promise<void> {
  await setDoc(doc(db, CLICK_AD_COL, getClickAdDocId()), cfg);
}

/** Realtime hook cho ClickAd.tsx (site) */
export function useClickAdConfig(): ClickAdConfig {
  const [cfg, setCfg] = useState<ClickAdConfig>({ ...DEFAULT_CLICK_AD });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, CLICK_AD_COL, getClickAdDocId()),
      snap => { if (snap.exists()) setCfg({ ...DEFAULT_CLICK_AD, ...snap.data() } as ClickAdConfig); },
      () => {}
    );
    return unsub;
  }, []);

  return cfg;
}
