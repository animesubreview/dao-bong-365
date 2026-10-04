import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Facebook, Instagram, Youtube, MapPin, Phone } from 'lucide-react';
import { subscribeSiteSettings } from '../lib/siteSettings';

function useSiteSettings() {
  const [s, setS] = useState<Record<string, any>>({});
  useEffect(() => {
    const unsub = subscribeSiteSettings(setS);
    return unsub;
  }, []);
  return s;
}

/* ─── Danh sách thể loại / quốc gia — dùng chung slug với MovieList.tsx (?category=, ?country=) ── */
const FOOTER_CATEGORIES = [
  { label: 'Hành Động', value: 'hanh-dong' }, { label: 'Tình Cảm', value: 'tinh-cam' },
  { label: 'Hài Hước', value: 'hai-huoc' }, { label: 'Cổ Trang', value: 'co-trang' },
  { label: 'Tâm Lý', value: 'tam-ly' }, { label: 'Hình Sự', value: 'hinh-su' },
  { label: 'Kinh Dị', value: 'kinh-di' }, { label: 'Viễn Tưởng', value: 'vien-tuong' },
  { label: 'Phiêu Lưu', value: 'phieu-luu' }, { label: 'Hoạt Hình', value: 'hoat-hinh' },
  { label: 'Thần Thoại', value: 'than-thoai' }, { label: 'Chiến Tranh', value: 'chien-tranh' },
  { label: 'Thể Thao', value: 'the-thao' }, { label: 'Khoa Học', value: 'khoa-hoc' },
  { label: 'Âm Nhạc', value: 'am-nhac' }, { label: 'Kinh Điển', value: 'kinh-dien' },
  { label: 'Gia Đình', value: 'gia-dinh' }, { label: 'Bí Ẩn', value: 'bi-an' },
  { label: 'Học Đường', value: 'hoc-duong' }, { label: 'Tài Liệu', value: 'tai-lieu' },
];
const FOOTER_COUNTRIES = [
  { label: 'Hàn Quốc', value: 'han-quoc' }, { label: 'Trung Quốc', value: 'trung-quoc' },
  { label: 'Âu Mỹ', value: 'au-my' }, { label: 'Nhật Bản', value: 'nhat-ban' },
  { label: 'Thái Lan', value: 'thai-lan' }, { label: 'Việt Nam', value: 'viet-nam' },
  { label: 'Đài Loan', value: 'dai-loan' }, { label: 'Hồng Kông', value: 'hong-kong' },
  { label: 'Ấn Độ', value: 'an-do' }, { label: 'Anh', value: 'anh' },
  { label: 'Pháp', value: 'phap' }, { label: 'Đức', value: 'duc' },
  { label: 'Canada', value: 'canada' }, { label: 'Indonesia', value: 'indonesia' },
];

export default function Footer() {
  const settings = useSiteSettings();
  const siteName = settings.siteName || 'ĐẢO PHIM';
  const adsEmail  = settings.adsEmail  || 'adsdaophim@gmail.com';
  const adsTelegram = settings.adsTelegram || '';
  const hotline = settings.phone || '';
  const contactEmail = settings.email || adsEmail;
  const facebookUrl = settings.facebookUrl || '';
  const instagramUrl = settings.instagramUrl || '';
  const youtubeUrl = settings.youtubeUrl || '';

  const socials = [
    { url: facebookUrl, icon: Facebook, label: 'Facebook' },
    { url: instagramUrl, icon: Instagram, label: 'Instagram' },
    { url: youtubeUrl, icon: Youtube, label: 'Youtube' },
    { url: adsTelegram ? `https://t.me/${adsTelegram}` : '', icon: Send, label: 'Telegram' },
  ].filter(s => s.url);

  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 mt-10">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/assets/logo-daophim.png" alt={siteName} className="h-10 w-auto object-contain" />
        </div>
        <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
          Trang xem phim online chất lượng cao miễn phí Vietsub, thuyết minh, lồng tiếng full HD.
        </p>

        {/* Mạng xã hội — chỉ hiện những kênh đã cấu hình trong Admin */}
        {socials.length > 0 && (
          <div className="flex items-center gap-3">
            {socials.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="w-9 h-9 rounded-full bg-slate-900/70 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-[var(--primary-light)] hover:border-[var(--primary)]/50 transition-colors">
                <s.icon size={16} />
              </a>
            ))}
          </div>
        )}

        {/* Thể loại phim */}
        <div className="w-full text-left">
          <h3 className="text-slate-300 text-xs font-black tracking-wide mb-2.5">THỂ LOẠI PHIM</h3>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {FOOTER_CATEGORIES.map(c => (
              <Link key={c.value} to={`/type/phim-bo?category=${c.value}`}
                className="text-[11px] font-semibold text-slate-400 hover:text-green-400 hover:border-green-500/50 bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-full transition-colors">
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Quốc gia */}
        <div className="w-full text-left">
          <h3 className="text-slate-300 text-xs font-black tracking-wide mb-2.5">QUỐC GIA</h3>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {FOOTER_COUNTRIES.map(c => (
              <Link key={c.value} to={`/type/phim-bo?country=${c.value}`}
                className="text-[11px] font-semibold text-slate-400 hover:text-green-400 hover:border-green-500/50 bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-full transition-colors">
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Điều hướng nhanh */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
          <Link to="/type/phim-bo" className="hover:text-white transition-colors">Phim bộ</Link>
          <Link to="/type/phim-le" className="hover:text-white transition-colors">Phim lẻ</Link>
          <Link to="/type/hoat-hinh" className="hover:text-white transition-colors">Hoạt hình</Link>
          <Link to="/type/phim-chieu-rap" className="hover:text-white transition-colors">Chiếu rạp</Link>
        </div>

        {/* Hỗ trợ */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md text-left">
          <div>
            <h3 className="text-slate-300 text-xs font-black tracking-wide mb-2.5">HỖ TRỢ</h3>
            <div className="flex flex-col gap-1.5 text-xs text-slate-500">
              <Link to="/info/faq" className="hover:text-green-400 transition-colors">Câu hỏi thường gặp</Link>
              <Link to="/info/privacy" className="hover:text-green-400 transition-colors">Chính sách bảo mật</Link>
              <Link to="/info/terms" className="hover:text-green-400 transition-colors">Điều khoản sử dụng</Link>
              <a href={`mailto:${adsEmail}`} className="hover:text-green-400 transition-colors">Liên hệ quảng cáo</a>
            </div>
          </div>

          {/* Liên hệ */}
          <div>
            <h3 className="text-slate-300 text-xs font-black tracking-wide mb-2.5">LIÊN HỆ</h3>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><MapPin size={13} className="text-green-500 shrink-0" /> Việt Nam</span>
              {hotline && (
                <a href={`tel:${hotline}`} className="flex items-center gap-2 hover:text-green-400 transition-colors">
                  <Phone size={13} className="text-green-500 shrink-0" /> {hotline}
                </a>
              )}
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-green-400 transition-colors break-all">
                <Mail size={13} className="text-green-500 shrink-0" /> {contactEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Liên hệ đặt quảng cáo */}
        {adsTelegram && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-500 text-xs">
            <span>📢 Liên hệ đặt quảng cáo:</span>
            <a
              href={`https://t.me/${adsTelegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold transition-colors"
            >
              <Send size={12} />
              @{adsTelegram}
            </a>
          </div>
        )}

        {/* Sovereign note */}
        <div className="bg-red-600 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-2">
          🇻🇳 Hoàng Sa &amp; Trường Sa là của Việt Nam!
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} {siteName}. All rights reserved.</p>

        {/* Dòng link pháp lý cuối trang */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
          <Link to="/info/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          <Link to="/info/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
          <Link to="/site-map" className="hover:text-slate-300 transition-colors">Sitemap</Link>
        </div>
      </div>
    </footer>
  );
}
