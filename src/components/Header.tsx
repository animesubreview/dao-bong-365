import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, History, Heart, X, Loader2, Clapperboard, LogIn, LogOut,
  ChevronDown, UserCog, Home, SlidersHorizontal, Tv2, Film, MonitorPlay,
  Globe, ChevronRight, Download, Smile, Bell, Users, Check, Copy, BookOpen,
  CreditCard, Crown, Zap, Wallet,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import { logout, onAuthChange, getUserProfile, UserProfile } from '../lib/auth';
import { createWatchRoom } from '../lib/watchRoom';

function useSiteSettings() {
  const [settings, setSettings] = useState(() => {
    try { const s = localStorage.getItem('site_settings'); return s ? JSON.parse(s) : { logoType: 'text', siteName: 'ĐẢO PHIM' }; }
    catch { return { logoType: 'text', siteName: 'ĐẢO PHIM' }; }
  });
  useEffect(() => {
    const fn = () => { try { const s = localStorage.getItem('site_settings'); if (s) setSettings(JSON.parse(s)); } catch {} };
    window.addEventListener('storage', fn);
    window.addEventListener('site_settings_updated', fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener('site_settings_updated', fn); };
  }, []);
  return settings;
}

// ── Logo Đảo Phim — dùng nguyên ảnh logo đầy đủ (icon + chữ + tagline) ──
const SITE_LOGO_URL = 'https://sf-static.upanhlaylink.com/img/image_20260628dc3b9dcf646041872c1eb00964222c05.jpg';

function Logo({ settings }: { settings: any }) {
  const name: string = settings.siteName || 'ĐẢO PHIM';

  return (
    <div className="flex items-center">
      <img
        src={SITE_LOGO_URL}
        alt={name}
        className="h-12 sm:h-14 w-auto object-contain shrink-0"
      />
    </div>
  );
}

function SuggestionList({ suggestions, onSelect }: { suggestions: Movie[]; onSelect: (m: Movie) => void }) {
  if (!suggestions.length) return null;
  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl z-50">
      {suggestions.map(movie => (
        <button key={movie._id} onClick={() => onSelect(movie)}
          className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800/60 last:border-0">
          <div className="shrink-0 w-10 rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio: '2/3' }}>
            <img src={movieApi.getImageUrl(movie.thumb_url)} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{movie.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{movie.origin_name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

const GENRES = ['Hành Động','Lịch Sử','Viễn Tưởng','Bí Ẩn','Thể Thao','Gia Đình','Hình Sự','Thần Thoại','Cổ Trang','Kinh Dị','Tình Cảm','Phiêu Lưu','Học Đường','Võ Thuật','Chính Kịch','Chiến Tranh','Tâm Lý','Âm Nhạc','Hài Hước'];
const COUNTRIES = [
  { name: 'Hàn Quốc', slug: 'han-quoc' },
  { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Thái Lan', slug: 'thai-lan' },
  { name: 'Việt Nam', slug: 'viet-nam' },
  { name: 'Đài Loan', slug: 'dai-loan' },
  { name: 'Hồng Kông', slug: 'hong-kong' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  // Watch Room quick-create modal
  const [showWatchRoomModal, setShowWatchRoomModal] = useState(false);
  const [watchRoomMax, setWatchRoomMax] = useState<number>(2);
  const [watchRoomMaxInput, setWatchRoomMaxInput] = useState('2');
  const [creatingRoom, setCreatingRoom] = useState(false);
  // ── Nạp thẻ menu ──
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);
  // Movie search inside modal
  const [modalSearch, setModalSearch] = useState('');
  const [modalMovies, setModalMovies] = useState<Movie[]>([]);
  const [modalSearching, setModalSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [modalStep, setModalStep] = useState<'search' | 'confirm' | 'done'>('search');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSiteSettings();

  useEffect(() => {
    const u = onAuthChange(async user => {
      if (user) { const p = await getUserProfile(user.uid); setSession(p); } else setSession(null);
    });
    return () => u();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false); setShowSearch(false); setSearchQuery(''); setShowSuggestions(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Header luôn nền đen đặc — không còn hiệu ứng trong suốt khi ở đầu trang

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
      setIsSearching(true);
      try { const r = await movieApi.searchMovies(searchQuery, 1); setSuggestions(r.items.slice(0, 5)); setShowSuggestions(true); }
      catch {} finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Modal movie search debounce
  useEffect(() => {
    if (!showWatchRoomModal) return;
    if (modalSearch.trim().length < 2) { setModalMovies([]); return; }
    const t = setTimeout(async () => {
      setModalSearching(true);
      try {
        const r = await movieApi.searchMovies(modalSearch, 1, 12);
        setModalMovies(r.items);
      } catch {} finally { setModalSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [modalSearch, showWatchRoomModal]);

  const handleNapThe = async () => {
    if (!session) { setNapMsg({ text: 'Bạn cần đăng nhập!', ok: false }); return; }
    if (!napSerial.trim() || !napCode.trim()) { setNapMsg({ text: 'Nhập đầy đủ serial và mã thẻ!', ok: false }); return; }
    setNapLoading(true); setNapMsg(null);
    const result = await submitManualTopup(session.uid, session.username, napTelco, napSerial, napCode, napAmount);
    setNapLoading(false);
    if (result.ok) {
      setNapMsg({ text: '✅ Gửi thành công! Admin sẽ duyệt sớm.', ok: true });
      setNapSerial(''); setNapCode('');
    } else {
      setNapMsg({ text: result.error || 'Gửi thất bại!', ok: false });
    }
  };

  const handleBuyVip = async (tier: VipTier) => {
    if (!session) return;
    setVipLoading(true); setVipMsg(null);
    const result = await purchaseVip(session.uid, tier);
    setVipLoading(false);
    if (result.ok) {
      setVipMsg({ text: '🎉 Mua VIP thành công!', ok: true });
      const fresh = await getUserProfile(session.uid);
      if (fresh) setSession(fresh);
    } else {
      setVipMsg({ text: result.error || 'Mua thất bại!', ok: false });
    }
  };

  const openWatchRoomModal = () => {
    setShowWatchRoomModal(true);
    setIsMenuOpen(false);
    setCreatedRoomId(null);
    setRoomLinkCopied(false);
    setModalSearch('');
    setModalMovies([]);
    setSelectedMovie(null);
    setModalStep('search');
    setWatchRoomMax(2);
    setWatchRoomMaxInput('2');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowSuggestions(false); }
  };

  const handleSelectSugg = (m: Movie) => {
    navigate(`/phim/${m.slug}`); setShowSuggestions(false); setSearchQuery(''); setShowSearch(false);
  };

  return (
    <>
      {/* ── HEADER BAR — nền đen đặc, giống CôBePhim ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-white/5 transition-all duration-300" id="main-header">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 flex items-center gap-2 md:gap-3">

          {/* Hamburger — 3 gạch, KHÔNG icon clapperboard */}
          <button
            onClick={() => setIsMenuOpen(v => !v)}
            className="shrink-0 flex flex-col gap-[5px] p-2 -ml-1 group"
            aria-label="Menu"
          >
            <span className={cn('block h-[2px] bg-slate-300 group-hover:bg-white rounded-full transition-all', isMenuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5')} />
            <span className={cn('block h-[2px] bg-slate-300 group-hover:bg-white rounded-full transition-all', isMenuOpen ? 'opacity-0 w-0' : 'w-5')} />
            <span className={cn('block h-[2px] bg-slate-300 group-hover:bg-white rounded-full transition-all', isMenuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5')} />
          </button>

          {/* Logo — 1 lần duy nhất */}
          <Link to="/" className="shrink-0"><Logo settings={settings} /></Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-2 shrink-0">
            {[
              { to: '/', label: 'Trang chủ' },
              { to: '/type/phim-bo', label: 'Phim Bộ' },
              { to: '/type/phim-le', label: 'Phim Lẻ' },
              { to: '/type/hoat-hinh', label: 'Hoạt Hình' },
              { to: '/type/phim-chieu-rap', label: 'Chiếu Rạp' },
            ].map(l => (
              <Link key={l.to} to={l.to}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                  location.pathname === l.to ? 'text-green-400' : 'text-slate-400 hover:text-white')}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Desktop search */}
          <div ref={desktopSearchRef} className="hidden lg:flex relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input type="text" placeholder="Tìm kiếm phim..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                  className="w-48 bg-slate-800/70 border border-slate-700/60 rounded-full py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-green-500/50 text-white placeholder:text-slate-500 focus:w-64 transition-all" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  {isSearching ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                </div>
              </div>
            </form>
            {showSuggestions && <SuggestionList suggestions={suggestions} onSelect={handleSelectSugg} />}
          </div>

          {/* Mobile search */}
          <div className="relative lg:hidden">
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <div className="relative">
                  <input ref={mobileInputRef} type="text" placeholder="Tìm phim..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    className="w-40 bg-slate-800 border border-slate-700 rounded-full py-1.5 pl-8 pr-7 text-sm focus:outline-none focus:border-green-500/60 text-white placeholder:text-slate-500" />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(''); setShowSuggestions(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={12} /></button>
                </div>
              </form>
            ) : (
              <button onClick={() => { setShowSearch(true); setTimeout(() => mobileInputRef.current?.focus(), 50); }}
                className="text-slate-300 hover:text-white p-1.5"><Search size={20} /></button>
            )}
            {showSuggestions && <SuggestionList suggestions={suggestions} onSelect={handleSelectSugg} />}
          </div>

          {/* Bell */}
          <button className="p-1.5 text-slate-400 hover:text-white transition-colors shrink-0 hidden sm:block">
            <Bell size={19} />
          </button>

          {/* User / Login */}
          {session ? (
            <div ref={userMenuRef} className="relative shrink-0">
              <button onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 hover:border-green-500/40 transition-all">
                <img src={session.avatar} alt={session.username} className="w-7 h-7 rounded-full bg-slate-700" />
                <ChevronDown size={12} className="text-slate-500" />
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl z-50">
                  <div className="px-3 py-2.5 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{session.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{session.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors">
                    <UserCog size={13} /> Hồ sơ
                  </Link>
                  <Link to="/history" onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors">
                    <History size={13} /> Lịch sử
                  </Link>
                  <Link to="/favorites" onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors">
                    <Heart size={13} /> Yêu thích
                  </Link>
                  <button onClick={async () => { await logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-slate-800">
                    <LogOut size={13} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth"
              className="shrink-0 flex items-center gap-1.5 border border-white/60 hover:bg-white hover:text-slate-950 text-white text-xs font-bold px-3 py-2 rounded-full transition-all">
              <LogIn size={13} /> <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          )}
        </div>
      </header>

      {/* ── DRAWER OVERLAY ── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200]" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute top-0 left-0 h-full w-[300px] max-w-[85vw] bg-slate-950 flex flex-col overflow-y-auto border-r border-slate-800/60"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/60 shrink-0">
              <Logo settings={settings} />
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Login prompt or user info */}
            {!session ? (
              <div className="mx-4 mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">Đăng nhập để đồng bộ lịch sử xem & phim yêu thích của bạn.</p>
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-white text-slate-950 font-black text-sm py-2.5 rounded-xl hover:bg-slate-100 transition-all">
                  <LogIn size={14} /> Đăng nhập ngay
                </Link>
              </div>
            ) : (
              <div className="mx-4 mt-4 p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3">
                <img src={session.avatar} alt={session.username} className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{session.username}</p>
                  <p className="text-xs text-slate-500 truncate">{session.email}</p>
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="px-3 mt-4 flex-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 px-2">DUYỆT PHIM</p>
              <nav className="flex flex-col gap-0.5">
                {[
                  { to: '/', label: 'Trang Chủ', icon: Home },
                  { to: '/type/phim-bo', label: 'Phim Hàn Quốc', icon: Tv2 },
                  { to: '/type/phim-bo', label: 'Phim Trung Quốc', icon: Film },
                  { to: '/type/phim-le', label: 'Phim Lẻ', icon: MonitorPlay },
                  { to: '/type/tv-shows', label: 'TV Shows', icon: Tv2 },
                  { to: '/type/hoat-hinh', label: 'Hoạt Hình', icon: Smile },
                  { to: '/type/phim-chieu-rap', label: 'Chiếu Rạp', icon: Clapperboard, badge: 'HOT', badgeRed: true },
                ].map(item => (
                  <Link key={item.to + item.label} to={item.to} onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
                    <item.icon size={17} className="text-slate-500 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={cn('text-[9px] font-black text-white px-1.5 py-0.5 rounded', item.badgeRed ? 'bg-red-500' : 'bg-green-600')}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Truyện Tranh */}
                <Link
                  to="/truyen-tranh"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                  <BookOpen size={17} className="text-orange-400 shrink-0" />
                  <span className="flex-1">Truyện Tranh</span>
                  <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-orange-500">NEW</span>
                </Link>

                {/* Xem Chung button */}
                <button
                  onClick={openWatchRoomModal}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all w-full text-left"
                >
                  <Users size={17} className="text-green-400 shrink-0" />
                  <span className="flex-1">Xem Chung</span>
                  <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-green-600">NEW</span>
                </button>

                {/* ── Nạp Thẻ & VIP ── */}
                <div className="border-t border-slate-800/60 mt-2 pt-2">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 px-2">TÀI KHOẢN</p>

                  {/* Nạp thẻ → /nap-tien */}
                  <Link to="/nap-tien" onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
                    <CreditCard size={17} className="text-green-400 shrink-0" />
                    <span className="flex-1">Nạp thẻ cào</span>
                    <ChevronRight size={14} className="text-slate-600" />
                  </Link>

                  {/* VIP → /mua-vip */}
                  <Link to="/mua-vip" onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-yellow-300 hover:text-white hover:bg-green-500/10 transition-all">
                    <Crown size={17} className="text-green-400 shrink-0" />
                    <span className="flex-1">Mua VIP · Chặn QC</span>
                    <ChevronRight size={14} className="text-yellow-500" />
                  </Link>
                </div>

                {/* Thể Loại */}
                <button onClick={() => setGenreOpen(v => !v)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all w-full text-left">
                  <Globe size={17} className="text-slate-500 shrink-0" />
                  <span className="flex-1">Thể Loại</span>
                  <ChevronDown size={14} className={cn('text-slate-500 transition-transform', genreOpen && 'rotate-180')} />
                </button>
                {genreOpen && (
                  <div className="ml-8 flex flex-col gap-0.5">
                    {GENRES.map(g => (
                      <span key={g} className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quốc Gia */}
                <button onClick={() => setCountryOpen(v => !v)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all w-full text-left">
                  <Globe size={17} className="text-slate-500 shrink-0" />
                  <span className="flex-1">Quốc Gia</span>
                  <ChevronDown size={14} className={cn('text-slate-500 transition-transform', countryOpen && 'rotate-180')} />
                </button>
                {countryOpen && (
                  <div className="ml-8 flex flex-col gap-0.5">
                    {COUNTRIES.map(c => (
                      <span key={c.slug} className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-800/60 mt-2 pt-2 flex flex-col gap-0.5">
                  <Link to="/history" onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
                    <History size={17} className="text-slate-500 shrink-0" /> Lịch sử xem
                  </Link>
                  <Link to="/favorites" onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-all">
                    <Heart size={17} className="text-slate-500 shrink-0" /> Phim yêu thích
                  </Link>
                  {session && (
                    <button onClick={async () => { await logout(); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all w-full text-left">
                      <LogOut size={17} className="shrink-0" /> Đăng xuất
                    </button>
                  )}
                </div>
              </nav>
            </div>

            {/* App download */}
            <div className="mx-3 mb-5 mt-4 shrink-0">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
                    <Clapperboard className="text-slate-950" size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{settings.siteName || 'ĐẢO PHIM'}</p>
                    <p className="text-[10px] text-slate-500">Xem phim mọi lúc, mọi nơi</p>
                  </div>
                </div>
                <button className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-slate-700">
                  <Download size={13} /> Tải APK Android
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── WATCH ROOM MODAL ── */}
      {showWatchRoomModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" onClick={() => setShowWatchRoomModal(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0f0f0f] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-800/60 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                <Users size={18} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-base leading-tight">Tạo phòng Xem Chung</h3>
                <p className="text-slate-500 text-xs">
                  {modalStep === 'search' && 'Tìm phim muốn xem cùng bạn bè'}
                  {modalStep === 'confirm' && `Đã chọn: ${selectedMovie?.name}`}
                  {modalStep === 'done' && 'Phòng đã được tạo thành công!'}
                </p>
              </div>
              <button onClick={() => setShowWatchRoomModal(false)} className="text-slate-500 hover:text-white transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Step: SEARCH MOVIE */}
            {modalStep === 'search' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search input */}
                <div className="px-5 py-3 shrink-0">
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nhập tên phim muốn xem chung..."
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/60"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      {modalSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  {modalSearch.trim().length < 2 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">🎬</div>
                      <p className="text-slate-500 text-sm">Gõ tên phim để tìm kiếm</p>
                    </div>
                  ) : modalMovies.length === 0 && !modalSearching ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 text-sm">Không tìm thấy phim nào</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {modalMovies.map(movie => (
                        <button
                          key={movie._id}
                          onClick={() => { setSelectedMovie(movie); setModalStep('confirm'); }}
                          className="group flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-green-500/50 transition-all text-left"
                        >
                          <div className="relative w-full bg-slate-800" style={{ aspectRatio: '2/3' }}>
                            <img
                              src={movieApi.getImageUrl(movie.thumb_url)}
                              alt={movie.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                              <span className="text-[10px] font-bold text-green-400">Chọn</span>
                            </div>
                          </div>
                          <div className="p-1.5">
                            <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight">{movie.name}</p>
                            <p className="text-slate-500 text-[9px] mt-0.5">{movie.year}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step: CONFIRM (movie selected + set max members) */}
            {modalStep === 'confirm' && selectedMovie && (
              <div className="flex flex-col overflow-y-auto px-5 py-4 gap-4">
                {/* Selected movie preview */}
                <div className="flex gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="w-14 rounded-lg overflow-hidden shrink-0 bg-slate-800" style={{ aspectRatio: '2/3' }}>
                    <img
                      src={movieApi.getImageUrl(selectedMovie.thumb_url)}
                      alt={selectedMovie.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-white text-sm font-bold line-clamp-2 leading-snug">{selectedMovie.name}</p>
                    <p className="text-slate-500 text-xs mt-1">{selectedMovie.origin_name} · {selectedMovie.year}</p>
                    <button
                      onClick={() => { setModalStep('search'); setSelectedMovie(null); }}
                      className="mt-2 text-[10px] text-green-400 hover:text-green-300 font-semibold text-left"
                    >
                      ← Đổi phim khác
                    </button>
                  </div>
                </div>

                {/* Custom member count */}
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Số người tối đa</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { const v = Math.max(2, watchRoomMax - 1); setWatchRoomMax(v); setWatchRoomMaxInput(String(v)); }}
                      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors shrink-0"
                    >−</button>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={watchRoomMaxInput}
                      onChange={e => {
                        setWatchRoomMaxInput(e.target.value);
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 2 && v <= 20) setWatchRoomMax(v);
                      }}
                      onBlur={() => {
                        const v = parseInt(watchRoomMaxInput);
                        const clamped = isNaN(v) ? 2 : Math.min(20, Math.max(2, v));
                        setWatchRoomMax(clamped);
                        setWatchRoomMaxInput(String(clamped));
                      }}
                      className="flex-1 text-center bg-slate-900 border border-slate-700 rounded-xl py-2 text-white font-black text-lg focus:outline-none focus:border-green-500/60"
                    />
                    <button
                      onClick={() => { const v = Math.min(20, watchRoomMax + 1); setWatchRoomMax(v); setWatchRoomMaxInput(String(v)); }}
                      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors shrink-0"
                    >+</button>
                  </div>
                  <p className="text-slate-600 text-[10px] text-center mt-1.5">Tối thiểu 2 · Tối đa 20 người</p>
                </div>

                {/* Login warning */}
                {!session && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-yellow-400 text-xs font-medium">⚠️ Bạn cần đăng nhập để tạo phòng xem.</p>
                  </div>
                )}

                {/* Create button */}
                <button
                  disabled={!session || creatingRoom}
                  onClick={async () => {
                    if (!session || !selectedMovie) return;
                    setCreatingRoom(true);
                    try {
                      const roomId = await createWatchRoom({
                        movieSlug: selectedMovie.slug,
                        movieName: selectedMovie.name,
                        movieThumb: selectedMovie.thumb_url || '',
                        episodeSlug: '',
                        episodeName: '',
                        embedUrl: '',
                        m3u8Url: '',
                        serverName: '',
                        hostUid: session.uid,
                        hostName: session.username,
                        hostAvatar: session.avatar,
                        maxMembers: watchRoomMax,
                      });
                      setCreatedRoomId(roomId);
                      setModalStep('done');
                    } finally { setCreatingRoom(false); }
                  }}
                  className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {creatingRoom ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                  {creatingRoom ? 'Đang tạo phòng...' : `Tạo phòng · ${watchRoomMax} người`}
                </button>
              </div>
            )}

            {/* Step: DONE */}
            {modalStep === 'done' && createdRoomId && (
              <div className="px-5 py-5 flex flex-col gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                    <Check size={26} className="text-green-400" />
                  </div>
                  <h3 className="text-white font-bold text-base">Phòng đã được tạo!</h3>
                  <p className="text-slate-400 text-xs mt-1">Chia sẻ link cho bạn bè · Tối đa {watchRoomMax} người</p>
                </div>

                {/* Movie info strip */}
                {selectedMovie && (
                  <div className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="w-8 rounded overflow-hidden shrink-0" style={{ aspectRatio: '2/3' }}>
                      <img src={movieApi.getImageUrl(selectedMovie.thumb_url)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-slate-300 text-xs font-semibold truncate flex-1">{selectedMovie.name}</p>
                  </div>
                )}

                {/* Link box */}
                <div className="bg-slate-900 rounded-xl p-3 flex items-center gap-2 border border-green-500/20">
                  <p className="flex-1 text-green-300 text-xs font-mono truncate">
                    {window.location.origin}/watch-room/{createdRoomId}
                  </p>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/watch-room/${createdRoomId}`);
                    setRoomLinkCopied(true);
                    setTimeout(() => setRoomLinkCopied(false), 2000);
                  }}
                    className={cn(
                      'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      roomLinkCopied ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}>
                    {roomLinkCopied ? <Check size={12} /> : <Copy size={12} />}
                    {roomLinkCopied ? 'Đã copy!' : 'Copy'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowWatchRoomModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-colors">
                    Đóng
                  </button>
                  <button onClick={() => { navigate(`/watch-room/${createdRoomId}`); setShowWatchRoomModal(false); }}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5">
                    <Users size={14} /> Vào phòng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
