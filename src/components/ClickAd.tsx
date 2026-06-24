// ─── ClickAd ──────────────────────────────────────────────────────────────────
// Bỏ qua: admin + user đang có VIP còn hạn
import { useEffect, useRef, useState } from 'react';
import { useClickAdConfig } from '../lib/clickAd';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';
import { isVipActive } from '../lib/vip';

const LAST_CLICK_KEY = 'click_ad_last_ts';

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
    if (!cfg.enabled || !cfg.link) return;
    const handleClick = () => {
      if (profile?.role === 'admin') return;
      if (isVipActive(profile?.vipExpiry)) return; // VIP: miễn QC
      const now = Date.now();
      const lastTs = parseInt(localStorage.getItem(LAST_CLICK_KEY) || '0', 10);
      if (now - lastTs < (cfg.cooldown ?? 60) * 1000) return;
      localStorage.setItem(LAST_CLICK_KEY, String(now));
      try { window.open(cfg.link, '_blank', 'noopener,noreferrer'); } catch {}
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [cfg, profile]);

  return null;
}
