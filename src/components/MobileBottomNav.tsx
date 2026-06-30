import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, CalendarDays, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: Home, match: (p: string) => p === '/' },
  { to: '/search', label: 'Tìm kiếm', icon: Search, match: (p: string) => p === '/search' },
  { to: '/cinema', label: 'Lịch chiếu', icon: CalendarDays, match: (p: string) => p === '/cinema' || p === '/lich-chieu' },
  { to: '/profile', label: 'Tài khoản', icon: User, match: (p: string) => p === '/profile' || p === '/auth' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  // Ẩn trên các trang xem phim để không che màn hình player
  if (pathname.startsWith('/watch')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="mx-3 mb-3 rounded-[28px] bg-slate-900/95 backdrop-blur-xl border border-slate-800/70 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-stretch justify-between px-2 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-colors"
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                  className={active ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]' : 'text-slate-500'}
                />
                <span className={`text-[11px] font-semibold ${active ? 'text-green-400' : 'text-slate-500'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
