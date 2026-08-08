// ─── ClickAd ──────────────────────────────────────────────────────────────────
// Bỏ qua: admin + user đang có VIP còn hạn
import { useEffect, useRef, useState } from 'react';
import { useClickAdConfig } from '../lib/ads';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';
import { isVipActive } from '../lib/vip';

const LAST_CLICK_KEY = 'click_ad_last_ts';       // mốc thời gian mở gần nhất của Link QC 1
const LAST_CLICK_KEY_2 = 'click_ad_last_ts_2';   // mốc thời gian mở gần nhất của Link QC 2

export default function ClickAd() {
  const cfg = useClickAdConfig();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) { const p = await getUserProfile(user.uid); setProfile(p); }
      else setProfile(null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!cfg.enabled || (!cfg.link && !cfg.link2)) return;
    const handleClick = () => {
      if (profile?.role === 'admin') return;
      if (isVipActive(profile?.vipExpiry)) return; // VIP: miễn QC
      const now = Date.now();

      // Khe 1: Link QC chính, cooldown riêng
      if (cfg.link?.trim()) {
        const last1 = parseInt(localStorage.getItem(LAST_CLICK_KEY) || '0', 10);
        if (now - last1 >= (cfg.cooldown ?? 60) * 1000) {
          localStorage.setItem(LAST_CLICK_KEY, String(now));
          try { window.open(cfg.link, '_blank', 'noopener,noreferrer'); } catch {}
        }
      }

      // Khe 2: Link QC phụ, cooldown riêng — chạy độc lập với khe 1
      if (cfg.link2?.trim()) {
        const last2 = parseInt(localStorage.getItem(LAST_CLICK_KEY_2) || '0', 10);
        if (now - last2 >= (cfg.cooldown2 ?? 60) * 1000) {
          localStorage.setItem(LAST_CLICK_KEY_2, String(now));
          try { window.open(cfg.link2, '_blank', 'noopener,noreferrer'); } catch {}
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [cfg, profile]);

  return null;
}
