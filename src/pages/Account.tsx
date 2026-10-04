import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Bell, Crown, LayoutGrid, MonitorPlay, History, Bookmark, Heart,
  ChevronRight, ChevronDown, LogOut, Home, Tv2, Film, Smile, Clapperboard,
  BookOpen, Globe, Users, Wallet,
} from 'lucide-react';
import { onAuthChange, getUserProfile, UserProfile, logout } from '../lib/auth';
import { GENRES, COUNTRIES } from '../components/Header';

function Row({
  icon: Icon, label, to, onClick, badge, chevron = true, iconColor = 'text-slate-400',
}: {
  icon: React.ElementType; label: string; to?: string; onClick?: () => void;
  badge?: string; chevron?: boolean; iconColor?: string;
}) {
  const content = (
    <div className="flex items-center gap-3.5 px-4 py-4">
      <Icon size={19} className={`${iconColor} shrink-0`} />
      <span className="flex-1 text-[15px] font-medium text-slate-200">{label}</span>
      {badge && (
        <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-green-600 shrink-0">{badge}</span>
      )}
      {chevron && <ChevronRight size={18} className="text-slate-600 shrink-0" />}
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block hover:bg-slate-900/60 transition-colors border-b border-slate-800/60 last:border-0">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="w-full text-left hover:bg-slate-900/60 transition-colors border-b border-slate-800/60 last:border-0">
      {content}
    </button>
  );
}

function MenuPanel({ onClose }: { onClose: () => void }) {
  const [genreOpen, setGenreOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const browseLinks = [
    { to: '/', label: 'Trang Chủ', icon: Home },
    { to: '/type/phim-bo', label: 'Phim Hàn Quốc', icon: Tv2 },
    { to: '/type/phim-bo', label: 'Phim Trung Quốc', icon: Film },
    { to: '/type/phim-le', label: 'Phim Lẻ', icon: MonitorPlay },
    { to: '/type/tv-shows', label: 'TV Shows', icon: Tv2 },
    { to: '/type/hoat-hinh', label: 'Hoạt Hình', icon: Smile },
    { to: '/type/phim-chieu-rap', label: 'Chiếu Rạp', icon: Clapperboard },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-800/60 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 -ml-1.5 rounded-lg hover:bg-slate-800 transition-all rotate-180">
          <ChevronRight size={20} />
        </button>
        <h2 className="text-base font-black text-white">Menu</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 px-2">Duyệt phim</p>
        <nav className="flex flex-col gap-0.5 mb-2">
          {browseLinks.map((item) => (
            <Link key={item.to + item.label} to={item.to} onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
              <item.icon size={17} className="text-slate-500 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <Link to="/truyen-tranh" onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
            <BookOpen size={17} className="text-orange-400 shrink-0" />
            <span className="flex-1">Truyện Tranh</span>
            <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-orange-500">NEW</span>
          </Link>

          <button onClick={() => setGenreOpen(v => !v)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all w-full text-left">
            <Globe size={17} className="text-slate-500 shrink-0" />
            <span className="flex-1">Thể Loại</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
          </button>
          {genreOpen && (
            <div className="ml-8 flex flex-col gap-0.5">
              {GENRES.map((g) => (
                <span key={g} className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
                  {g}
                </span>
              ))}
            </div>
          )}

          <button onClick={() => setCountryOpen(v => !v)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all w-full text-left">
            <Globe size={17} className="text-slate-500 shrink-0" />
            <span className="flex-1">Quốc Gia</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
          </button>
          {countryOpen && (
            <div className="ml-8 flex flex-col gap-0.5">
              {COUNTRIES.map((c) => (
                <span key={c.slug} className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}

export default function Account() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useSEO({ title: 'Tài khoản', description: 'Quản lý tài khoản Đảo Phim của bạn.', url: '/profile', noIndex: true });

  useEffect(() => {
    const u = onAuthChange(async (user) => {
      if (user) { const p = await getUserProfile(user.uid); setProfile(p); } else setProfile(null);
      setAuthChecked(true);
    });
    return () => u();
  }, []);

  const openWatchRoom = () => {
    window.dispatchEvent(new Event('open-watch-room-modal'));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-10">
      <div className="flex items-center gap-2 mb-5">
        <User className="text-green-400" size={22} />
        <h1 className="text-xl font-black text-white">Tài khoản</h1>
      </div>

      {/* ── User card / Auth buttons ── */}
      {authChecked && !profile && (
        <div className="flex gap-3 mb-6">
          <Link to="/auth" className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black text-sm py-3.5 rounded-2xl transition-colors">
            <User size={16} /> Đăng nhập
          </Link>
          <Link to="/auth" className="flex-1 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-950 font-black text-sm py-3.5 rounded-2xl transition-colors">
            Đăng ký
          </Link>
        </div>
      )}

      {profile && (
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <img src={profile.avatar} alt={profile.username} className="w-14 h-14 rounded-full bg-slate-700 object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white truncate">{profile.username}</p>
              <p className="text-sm text-slate-500 truncate">{profile.email}</p>
            </div>
          </div>

          {/* ── Số dư ví ── */}
          <Link
            to="/nap-tien"
            className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-3.5 py-2.5 mb-3 hover:bg-green-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-green-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">Số dư ví</span>
            </div>
            <span className="text-sm font-black text-green-400">
              {(profile.balance || 0).toLocaleString('vi-VN')}đ
            </span>
          </Link>

          <div className="flex gap-2.5">
            <Link to="/profile/edit" className="flex-1 text-center bg-transparent border border-green-500/50 text-green-400 font-bold text-sm py-2.5 rounded-xl hover:bg-green-500/10 transition-colors">
              Hồ sơ
            </Link>
            <button onClick={() => logout()} className="flex-1 bg-transparent border border-slate-700 text-slate-300 font-bold text-sm py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* ── Danh sách mục ── */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden mb-4">
        <Row icon={Bell} label="Thông báo" to="/profile/edit" />
        <Row icon={Crown} label="Nâng cấp VIP · Chặn QC" to="/mua-vip" iconColor="text-amber-400" />
        <Row icon={Wallet} label="Nạp thẻ" to="/nap-tien" iconColor="text-green-400" />
        <Row icon={LayoutGrid} label="Menu" onClick={() => setShowMenu(true)} />
        <Row icon={Users} label="Xem chung" onClick={openWatchRoom} badge="NEW" iconColor="text-green-400" />
        <Row icon={History} label="Đang xem" to="/history" />
        <Row icon={Bookmark} label="Danh sách phim của tôi" to="/favorites" />
        <Row icon={Heart} label="Yêu thích" to="/favorites" />
      </div>

      {showMenu && <MenuPanel onClose={() => setShowMenu(false)} />}
    </div>
  );
}
