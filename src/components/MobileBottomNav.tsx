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

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tone, setTone] = useState<'light' | 'dark'>(() => getTheme());
  const lastActive = useRef(HOME_INDEX);

  // Đồng bộ màu nước với chế độ ngày/đêm của site
  useEffect(() => {
    const sync = () => setTone(getTheme());
    window.addEventListener('dp-theme', sync);
    return () => window.removeEventListener('dp-theme', sync);
  }, []);

  // Ẩn trên các trang xem phim để không che màn hình player
  if (pathname.startsWith('/watch')) return null;

  // Trang không thuộc 5 mục (vd. chi tiết phim) → giữ giọt nước ở mục gần nhất
  const found = ROUTES.findIndex((r) => r.match(pathname));
  if (found >= 0) lastActive.current = found;
  const active = lastActive.current;

  return (
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
  );
}
