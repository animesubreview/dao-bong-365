import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3x3, Tv, Search } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: Home, match: (p: string) => p === '/' },
  { to: '/type/hoat-hinh', label: 'Phim', icon: Grid3x3, match: (p: string) => p.startsWith('/type') },
  { to: '/type/phim-bo', label: 'Phim bộ', icon: Tv, match: (p: string) => p === '/type/phim-bo' },
  { to: '/search', label: 'Tìm kiếm', icon: Search, match: (p: string) => p === '/search' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  // Ẩn trên các trang xem phim để không che màn hình player
  if (pathname.startsWith('/watch')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950 border-t border-slate-800">
      <div className="flex items-stretch justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="flex-1 flex items-center justify-center py-3.5 transition-colors"
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.4 : 2}
                className={active ? 'text-yellow-400' : 'text-slate-400'}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
