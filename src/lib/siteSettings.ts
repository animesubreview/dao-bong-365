import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface SocialLink {
  label: string;   // vd "Facebook", "Telegram", "Youtube"
  url: string;
}

export interface SiteSettings {
  // Banner thông báo trên trang chủ
  bannerEnabled: boolean;
  bannerText: string;
  bannerImageUrl: string;
  bannerLinkUrl: string;

  // Thông tin liên hệ (hiển thị ở footer)
  aboutText: string;
  phone: string;
  email: string;
  ceoName: string;
  workingHours: string;

  socialLinks: SocialLink[];
}

const DOC_PATH = ['site_config', 'settings'] as const;

export const DEFAULT_SETTINGS: SiteSettings = {
  bannerEnabled: false,
  bannerText: '',
  bannerImageUrl: '',
  bannerLinkUrl: '',
  aboutText: 'Đảo Bóng 365 - Trực tiếp bóng đá, lịch thi đấu và tỷ số cập nhật real-time, đồng hành cùng World Cup 2026.',
  phone: '',
  email: '',
  ceoName: '',
  workingHours: '24/7',
  socialLinks: [],
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const snap = await getDoc(doc(db, ...DOC_PATH));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...snap.data() } as SiteSettings;
}

export async function saveSiteSettings(settings: SiteSettings) {
  await setDoc(doc(db, ...DOC_PATH), settings, { merge: true });
}

export function subscribeSiteSettings(cb: (settings: SiteSettings) => void): () => void {
  return onSnapshot(doc(db, ...DOC_PATH), snap => {
    if (snap.exists()) cb({ ...DEFAULT_SETTINGS, ...snap.data() } as SiteSettings);
    else cb(DEFAULT_SETTINGS);
  });
}
