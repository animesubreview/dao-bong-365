import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Film, Calendar, User, Mail } from 'lucide-react';

function useSiteSettings() {
  const [s, setS] = useState(() => {
    try { const v = localStorage.getItem('site_settings'); return v ? JSON.parse(v) : {}; } catch { return {}; }
  });
  useEffect(() => {
    const cb = () => { try { const v = localStorage.getItem('site_settings'); if (v) setS(JSON.parse(v)); } catch {} };
    window.addEventListener('storage', cb);
    window.addEventListener('site_settings_updated', cb);
    return () => { window.removeEventListener('storage', cb); window.removeEventListener('site_settings_updated', cb); };
  }, []);
  return s;
}

const NAV = [
  { to: '/',          label: 'Trang chủ', icon: Home },
  { to: '/search',    label: 'Tìm kiếm',  icon: Search },
  { to: '/type/phim-chieu-rap', label: 'Reviews', icon: Film },
  { to: '/lich-chieu', label: 'Lịch chiếu', icon: Calendar },
  { to: '/profile',   label: 'Tài khoản', icon: User },
];

export default function Footer() {
  const location = useLocation();
  const settings = useSiteSettings();
  const siteName = settings.siteName || 'ĐẢO PHIM';
  const adsEmail = settings.adsEmail || 'adsdaophim@gmail.com';

  // Hide bottom nav on watch & admin pages
  const hideNav = location.pathname.startsWith('/watch') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/player-studio');

  return (
    <>
      {/* ── Full footer (mobile hidden, desktop shown) ── */}
      <footer className="hidden md:block border-t border-slate-800/60 bg-slate-950 mt-10">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center gap-5 text-center">
          <div className="flex items-center">
            <img src="https://sf-static.upanhlaylink.com/img/image_202606278a6e7d9058c777bdc68dcd15405544b5.jpg" alt={siteName} className="h-9 w-auto object-contain" />
          </div>
          <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
            Trang xem phim online chất lượng cao miễn phí. Vietsub – Thuyết minh – Lồng tiếng.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
            {[['/', 'Trang chủ'], ['/type/phim-bo', 'Phim bộ'], ['/type/phim-le', 'Phim lẻ'], ['/type/hoat-hinh', 'Hoạt hình'], ['/type/phim-chieu-rap', 'Chiếu rạp']].map(([to, label]) => (
              <Link key={to} to={to} className="hover:text-white transition-colors">{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span>📢 Quảng cáo:</span>
            <a href={`mailto:${adsEmail}`} className="flex items-center gap-1 text-green-400 hover:text-green-300 font-semibold transition-colors">
              <Mail size={11} />{adsEmail}
            </a>
          </div>
          <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            🇻🇳 Hoàng Sa &amp; Trường Sa là của Việt Nam!
          </div>
          <p className="text-slate-700 text-[10px]">© {new Date().getFullYear()} {siteName}. Không lưu trữ phim trên máy chủ.</p>
        </div>
      </footer>

      {/* ── BOTTOM NAV (mobile) ── */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          style={{ background: 'rgba(13,13,15,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
          <div className="flex items-center">
            {NAV.map(item => {
              const active = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
                  style={{ color: active ? '#22c55e' : '#64748b' }}>
                  {/* icon with active bg circle */}
                  <div className="relative">
                    <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                    {active && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                    )}
                  </div>
                  <span className="text-[9px] font-bold leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* spacer cho mobile */}
      {!hideNav && <div className="md:hidden h-16" />}
    </>
  );
}
