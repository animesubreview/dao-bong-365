import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

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

export default function Footer() {
  const settings = useSiteSettings();
  const siteName = settings.siteName || 'ĐẢO PHIM';
  const adsEmail  = settings.adsEmail  || 'adsdaophim@gmail.com';

  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 mt-10">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/assets/logo-daophim.png" alt={siteName} className="h-10 w-auto object-contain" />
        </div>
        <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
          Trang xem phim online chất lượng cao miễn phí Vietsub, thuyết minh, lồng tiếng full HD.
        </p>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
          <Link to="/type/phim-bo" className="hover:text-white transition-colors">Phim bộ</Link>
          <Link to="/type/phim-le" className="hover:text-white transition-colors">Phim lẻ</Link>
          <Link to="/type/hoat-hinh" className="hover:text-white transition-colors">Hoạt hình</Link>
          <Link to="/type/phim-chieu-rap" className="hover:text-white transition-colors">Chiếu rạp</Link>
        </div>

        {/* Liên hệ đặt quảng cáo */}
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <span>📢 Liên hệ đặt quảng cáo:</span>
          <a
            href={`mailto:${adsEmail}`}
            className="flex items-center gap-1 text-green-400 hover:text-green-300 font-semibold transition-colors"
          >
            <Mail size={12} />
            {adsEmail}
          </a>
        </div>

        {/* Sovereign note */}
        <div className="bg-red-600 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-2">
          🇻🇳 Hoàng Sa &amp; Trường Sa là của Việt Nam!
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} {siteName}</p>
      </div>
    </footer>
  );
}
