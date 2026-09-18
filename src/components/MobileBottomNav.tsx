import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tv, Library, Home, MessageCircle, User } from 'lucide-react';
import { cn } from '../lib/utils';

// 5 mục — Trang chủ nằm giữa, nổi bật hơn các icon còn lại (giống app streaming)
const SIDE_ITEMS = [
  { to: '/tv-truc-tuyen', label: 'TV Flix', icon: Tv, match: (p: string) => p === '/tv-truc-tuyen' || p === '/truc-tiep' },
  { to: '/favorites', label: 'Thư viện', icon: Library, match: (p: string) => p === '/favorites' || p === '/history' },
];
const SIDE_ITEMS_RIGHT = [
  { to: '/chat', label: 'Chat', icon: MessageCircle, match: (p: string) => p === '/chat' },
  { to: '/profile', label: 'Tài khoản', icon: User, match: (p: string) => p === '/profile' || p === '/auth' },
];

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors"
    >
      <Icon
        size={20}
        strokeWidth={2}
        className={cn('transition-colors', active ? 'text-[var(--primary-light)]' : 'text-slate-500')}
      />
      <span className={cn('text-[10px] font-semibold transition-colors', active ? 'text-[var(--primary-light)]' : 'text-slate-500')}>
        {label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  // Ẩn trên các trang xem phim để không che màn hình player
  if (pathname.startsWith('/watch')) return null;

  const homeActive = pathname === '/';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="relative mx-3 mb-2">
        {/* Bar với phần lõm ở giữa cho nút Home nổi — mask co giãn theo mọi kích thước màn hình */}
        <div
          className="flex items-stretch justify-between px-1 bg-slate-900/95 backdrop-blur-xl border border-slate-800/70 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-[22px]"
          style={{
            WebkitMaskImage: 'radial-gradient(circle 30px at 50% 0%, transparent 29px, black 30px)',
            maskImage: 'radial-gradient(circle 30px at 50% 0%, transparent 29px, black 30px)',
          }}
        >
          {SIDE_ITEMS.map((it) => (
            <NavItem key={it.to} to={it.to} label={it.label} icon={it.icon} active={it.match(pathname)} />
          ))}
          {/* khoảng trống cho nút Home nổi */}
          <div className="w-[72px] shrink-0" />
          {SIDE_ITEMS_RIGHT.map((it) => (
            <NavItem key={it.to} to={it.to} label={it.label} icon={it.icon} active={it.match(pathname)} />
          ))}
        </div>

        {/* Nút Home tròn, nổi giữa, có glow */}
        <Link
          to="/"
          aria-label="Trang chủ"
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--primary-light), var(--primary))',
            boxShadow: homeActive
              ? '0 0 0 5px rgba(124,140,255,0.18), 0 8px 24px rgba(124,140,255,0.55)'
              : '0 0 0 5px rgba(124,140,255,0.10), 0 6px 18px rgba(124,140,255,0.35)',
          }}
        >
          <Home size={24} strokeWidth={2.5} className="text-slate-950" />
        </Link>
      </div>
    </nav>
  );
}
