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


// Trang áp dụng hiệu ứng "vuốt": Trang chủ, Chi tiết phim, Xem phim
const isScrollAware = (p: string) =>
  p === '/' || p.startsWith('/phim/') || p.startsWith('/manual/') ||
  p.startsWith('/watch/') || p.startsWith('/watch-manual/');
// Trang xem phim: mặc định ẩn ở đầu trang để không che trình phát, vuốt lên thì hiện
const isPlayer = (p: string) => p.startsWith('/watch/') || p.startsWith('/watch-manual/');

/**
 * Vuốt xuống → ẩn thanh, vuốt lên (hoặc chạm đáy trang) → hiện lại.
 * Ở trang xem phim, thanh ẩn sẵn khi ở đầu trang. Ẩn luôn khi trình phát vào toàn màn hình.
 */
function useScrollReveal(pathname: string) {
  const aware = isScrollAware(pathname);
  const player = isPlayer(pathname);
  const [show, setShow] = useState(!player);

  useEffect(() => {
    setShow(!player);
    if (!aware) return;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      const atBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 40;
      if (Math.abs(dy) >= 8) {
        if (dy < 0 || atBottom) setShow(true);          // vuốt lên / chạm đáy
        else if (y > 60) setShow(false);                  // vuốt xuống
        lastY = y;
      }
      if (y <= 10 && !player) setShow(true);              // về đầu trang (trừ trang xem phim)
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, aware, player]);

  // Trình phát toàn màn hình → ẩn thanh
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

  return aware ? show && !fs : !fs;
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tone, setTone] = useState<'light' | 'dark'>(() => getTheme());
  const lastActive = useRef(HOME_INDEX);
  const visible = useScrollReveal(pathname);

  // Đồng bộ màu nước với chế độ ngày/đêm của site
  useEffect(() => {
    const sync = () => setTone(getTheme());
    window.addEventListener('dp-theme', sync);
    return () => window.removeEventListener('dp-theme', sync);
  }, []);

  // Phòng xem chung có giao diện riêng → luôn ẩn
  if (pathname.startsWith('/watch-room')) return null;

  // Trang không thuộc 5 mục (vd. chi tiết phim) → giữ giọt nước ở mục gần nhất
  const found = ROUTES.findIndex((r) => r.match(pathname));
  if (found >= 0) lastActive.current = found;
  const active = lastActive.current;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none md:hidden"
      aria-hidden={!visible}
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: visible
          ? 'transform .35s cubic-bezier(.2,.9,.3,1.1), opacity .25s ease, visibility 0s'
          : 'transform .3s ease-in, opacity .2s ease, visibility 0s linear .3s',
      }}
    >
      <LiquidNavbar
        className={visible ? 'pointer-events-auto' : 'pointer-events-none'}
        items={ITEMS}
        active={active}
        tone={tone}
        compact
        onChange={(i) => navigate(ROUTES[i].to)}
      />
    </div>
  );
}
