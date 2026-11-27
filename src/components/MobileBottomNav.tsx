import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, History, Home, Users, User } from 'lucide-react';
import { LiquidNavbar, type LiquidNavItem } from './ui/liquid-glass-navbar';
import { getTheme } from '../lib/theme';

// 5 mục — Trang chủ nằm giữa như giao diện cũ, nhưng nay là thanh "giọt nước" Liquid Glass
type Route = { to: string; label: string; icon: React.ReactNode; fx: LiquidNavItem['fx']; match: (p: string) => boolean };

const ROUTES: Route[] = [
  { to: '/search', label: 'Tìm kiếm', icon: <Search size={18} strokeWidth={1.8} />, fx: 'pop', match: (p) => p === '/search' },
  { to: '/history', label: 'Lịch sử', icon: <History size={18} strokeWidth={1.8} />, fx: 'spin', match: (p) => p === '/history' },
  { to: '/', label: 'Trang chủ', icon: <Home size={18} strokeWidth={1.8} />, fx: 'glow', match: (p) => p === '/' },
  { to: '/xem-chung', label: 'Xem chung', icon: <Users size={18} strokeWidth={1.8} />, fx: 'wave', match: (p) => p.startsWith('/xem-chung') || p.startsWith('/watch-room') },
  { to: '/profile', label: 'Tài khoản', icon: <User size={18} strokeWidth={1.8} />, fx: 'pop', match: (p) => p === '/profile' || p === '/auth' },
];

const ITEMS: LiquidNavItem[] = ROUTES.map(({ label, icon, fx }) => ({ label, icon, fx }));
const HOME_INDEX = 2;

// Trình phát vào toàn màn hình → ẩn thanh + lớp kính mờ
function useFullscreen() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      document.removeEventListener('webkitfullscreenchange', on);
    };
  }, []);
  return fs;
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tone, setTone] = useState<'light' | 'dark'>(() => getTheme());
  const lastActive = useRef(HOME_INDEX);
  const fullscreen = useFullscreen();

  // Đồng bộ màu nước với chế độ ngày/đêm của site
  useEffect(() => {
    const sync = () => setTone(getTheme());
    window.addEventListener('dp-theme', sync);
    return () => window.removeEventListener('dp-theme', sync);
  }, []);

  // Phòng xem chung có giao diện riêng → ẩn
  if (pathname.startsWith('/watch-room') || fullscreen) return null;

  // Trang không thuộc 5 mục (vd. chi tiết phim) → giữ giọt nước ở mục gần nhất
  const found = ROUTES.findIndex((r) => r.match(pathname));
  if (found >= 0) lastActive.current = found;
  const active = lastActive.current;

  const dark = tone === 'dark';
  const mask = 'linear-gradient(to top, #000 35%, rgba(0,0,0,.6) 65%, transparent)';

  return (
    <>
      {/* Lớp kính mờ phía sau: nội dung web trượt xuống dưới thanh sẽ bị làm mờ dần */}
      <div
        aria-hidden
        className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none md:hidden"
        style={{
          height: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
          backdropFilter: 'blur(16px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.35)',
          background: dark
            ? 'linear-gradient(to top, rgba(8,10,20,.6), rgba(8,10,20,0))'
            : 'linear-gradient(to top, rgba(255,255,255,.6), rgba(255,255,255,0))',
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <LiquidNavbar
          className="pointer-events-auto"
          items={ITEMS}
          active={active}
          tone={tone}
          compact
          onChange={(i) => navigate(ROUTES[i].to)}
        />
      </div>
    </>
  );
}
