import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, History, Home, Users, User } from 'lucide-react';
import { cn } from '../lib/utils';

// 5 mục — Trang chủ nằm giữa, nổi bật hơn các icon còn lại (giống app streaming)
type Item = { to?: string; onClick?: () => void; label: string; icon: any; match: (p: string) => boolean };

const SIDE_ITEMS: Item[] = [
  { to: '/search', label: 'Tìm kiếm', icon: Search, match: (p) => p === '/search' },
  { to: '/history', label: 'Lịch sử', icon: History, match: (p) => p === '/history' },
];
const SIDE_ITEMS_RIGHT: Item[] = [
  // Xem chung: mở khung tạo phòng (Header đang lắng nghe sự kiện này)
  { onClick: () => window.dispatchEvent(new Event('open-watch-room-modal')), label: 'Xem chung', icon: Users, match: (p) => p.startsWith('/watch-room') },
  { to: '/profile', label: 'Tài khoản', icon: User, match: (p) => p === '/profile' || p === '/auth' },
];

function NavItem({ to, onClick, label, icon: Icon, active }: Item & { active: boolean }) {
  const cls = 'relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-colors active:scale-95';
  const inner = (
    <>
      {active && <span className="absolute top-1 h-[3px] w-5 rounded-full bg-[var(--primary-light)]" aria-hidden />}
      <Icon
        size={20}
        strokeWidth={2}
        className={cn('transition-colors', active ? 'text-[var(--primary-light)]' : 'text-slate-500')}
      />
      <span className={cn('text-[10px] font-semibold transition-colors', active ? 'text-[var(--primary-light)]' : 'text-slate-500')}>
        {label}
      </span>
    </>
  );
  return to ? (
    <Link to={to} aria-current={active ? 'page' : undefined} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  // Ẩn trên các trang xem phim để không che màn hình player
  if (pathname.startsWith('/watch')) return null;

  const homeActive = pathname === '/';

  return (
    <nav aria-label="Điều hướng chính" className="fixed bottom-0 left-0 right-0 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
            <NavItem key={it.label} {...it} active={it.match(pathname)} />
          ))}
          {/* khoảng trống cho nút Home nổi */}
          <div className="w-[72px] shrink-0" />
          {SIDE_ITEMS_RIGHT.map((it) => (
            <NavItem key={it.label} {...it} active={it.match(pathname)} />
          ))}
        </div>

        {/* Nút Home tròn, nổi giữa, có glow */}
        <Link
          to="/"
          aria-label="Trang chủ"
          aria-current={homeActive ? 'page' : undefined}
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--primary-light), var(--primary))',
            boxShadow: homeActive
              ? '0 0 0 5px rgba(34,197,94,0.18), 0 8px 24px rgba(34,197,94,0.55)'
              : '0 0 0 5px rgba(34,197,94,0.10), 0 6px 18px rgba(34,197,94,0.35)',
          }}
        >
          <Home size={24} strokeWidth={2.5} className="text-slate-950" />
        </Link>
      </div>
    </nav>
  );
}
