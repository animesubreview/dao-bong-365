import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, History, Heart, X, Loader2, LogIn, LogOut,
  ChevronDown, UserCog,
  Bell, Users, Check, Copy,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import { logout, onAuthChange, getUserProfile, UserProfile } from '../lib/auth';
import { createWatchRoom } from '../lib/watchRoom';
import { subscribeNotifications, countUnread, SiteNotification } from '../lib/notifications';
import { subscribeSiteSettings } from '../lib/siteSettings';
import AdBanner from './AdBanner';

function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({ logoType: 'text', siteName: 'ĐẢO PHIM' });
  useEffect(() => {
    const unsub = subscribeSiteSettings((data) => {
      setSettings((prev) => ({ ...prev, ...data }));
    });
    return unsub;
  }, []);
  return settings;
}

// ── Logo Đảo Phim — ảnh local duy nhất, nền trong suốt (icon + chữ + tagline) ──
const SITE_LOGO_URL = '/assets/logo-daophim.png';

function Logo({ settings }: { settings: any }) {
  const name: string = settings.siteName || 'ĐẢO PHIM';

  return (
    <div className="flex items-center">
      <img
        src={SITE_LOGO_URL}
        alt={name}
        className="h-9 w-auto object-contain shrink-0"
      />
    </div>
  );
}

export const GENRES = ['Hành Động','Lịch Sử','Viễn Tưởng','Bí Ẩn','Thể Thao','Gia Đình','Hình Sự','Thần Thoại','Cổ Trang','Kinh Dị','Tình Cảm','Phiêu Lưu','Học Đường','Võ Thuật','Chính Kịch','Chiến Tranh','Tâm Lý','Âm Nhạc','Hài Hước'];
export const COUNTRIES = [
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
  const [session, setSession] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  // ── Dropdown "Thể Loại / Quốc Gia / Thêm" trên nav desktop ──
  const [openNavMenu, setOpenNavMenu] = useState<'genre' | 'country' | 'more' | null>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) setOpenNavMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  // ── Tìm kiếm nhanh trên desktop (dropdown ngay trong header) ──
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState('');
  const [desktopResults, setDesktopResults] = useState<Movie[]>([]);
  const [desktopSearching, setDesktopSearching] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSiteSettings();

  // ── Banner mỏng dính trên cùng, phía trên thanh header (mọi trang) ──
  // Đo chiều cao thực tế của cả khối [banner + header] để chừa đúng khoảng
  // trống cho nội dung trang bên dưới, không bị banner đè lên.
  const headerWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty('--app-header-h', `${el.offsetHeight}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Chuông thông báo: đếm số chưa đọc, cập nhật realtime + khi đổi trang ──
  const [allNotifs, setAllNotifs] = useState<SiteNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeNotifications(setAllNotifs);
    return unsub;
  }, []);

  useEffect(() => {
    setUnreadCount(countUnread(allNotifs));
  }, [allNotifs, location.pathname]);

  useEffect(() => {
    const u = onAuthChange(async user => {
      if (user) { const p = await getUserProfile(user.uid); setSession(p); } else setSession(null);
    });
    return () => u();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) setShowDesktopSearch(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Header scroll effect
  useEffect(() => {
    const header = document.getElementById('main-header');
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 60) {
        header.style.background = 'rgba(10,10,10,0.97)';
        header.style.backdropFilter = 'blur(20px)';
        header.style.borderBottomColor = 'rgba(255,255,255,0.06)';
      } else {
        header.style.background = 'transparent';
        header.style.backdropFilter = 'none';
        header.style.borderBottomColor = 'transparent';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Debounce tìm kiếm nhanh trên desktop
  useEffect(() => {
    if (!showDesktopSearch || desktopQuery.trim().length < 2) { setDesktopResults([]); return; }
    const t = setTimeout(async () => {
      setDesktopSearching(true);
      try {
        const r = await movieApi.searchMovies(desktopQuery.trim(), 1, 8);
        setDesktopResults(r.items || []);
      } catch {
        setDesktopResults([]);
      } finally {
        setDesktopSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [desktopQuery, showDesktopSearch]);

  // Auto-focus khi mở ô tìm kiếm + đóng bằng phím Esc
  useEffect(() => {
    if (showDesktopSearch) {
      desktopInputRef.current?.focus();
    } else {
      setDesktopQuery('');
      setDesktopResults([]);
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDesktopSearch(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showDesktopSearch]);

  const goToDesktopSearchResults = () => {
    const val = desktopQuery.trim();
    if (!val) return;
    setShowDesktopSearch(false);
    navigate(`/search?q=${encodeURIComponent(val)}`);
  };

  const goToDesktopMovie = (movie: Movie) => {
    setShowDesktopSearch(false);
    navigate(`/phim/${movie.slug}`);
  };

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
    setCreatedRoomId(null);
    setRoomLinkCopied(false);
    setModalSearch('');
    setModalMovies([]);
    setSelectedMovie(null);
    setModalStep('search');
    setWatchRoomMax(2);
    setWatchRoomMaxInput('2');
  };

  // Cho phép các trang khác (vd. trang Tài khoản) mở modal Xem Chung qua custom event
  useEffect(() => {
    const handler = () => openWatchRoomModal();
    window.addEventListener('open-watch-room-modal', handler);
    return () => window.removeEventListener('open-watch-room-modal', handler);
  }, []);

  return (
    <>
      {/* ── Wrapper fixed chung: banner QC trên cùng (nếu có) + thanh header ── */}
      <div ref={headerWrapRef} className="fixed top-0 left-0 right-0 z-50">
        <AdBanner position="header" />
        {/* ── HEADER BAR ── */}
        <header className="relative bg-transparent backdrop-blur-0 border-b border-transparent transition-all duration-300" id="main-header" style={{ background: 'transparent', backdropFilter: 'none' }}>
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 flex items-center gap-2 md:gap-3">

          {/* Logo — 1 lần duy nhất */}
          <Link to="/" className="shrink-0"><Logo settings={settings} /></Link>

          {/* Desktop nav links */}
          <nav ref={navMenuRef} className="hidden lg:flex items-center gap-0.5 ml-2 shrink-0">
            {[
              { to: '/type/phim-le', label: 'Phim Lẻ' },
              { to: '/type/phim-bo', label: 'Phim Bộ' },
              { to: '/type/song-ngu', label: 'Song Ngữ' },
            ].map(l => (
              <Link key={l.to} to={l.to}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                  location.pathname === l.to ? 'text-green-400' : 'text-slate-400 hover:text-white')}>
                {l.label}
              </Link>
            ))}

            {/* Mới — Xem Chung */}
            <button onClick={openWatchRoomModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all whitespace-nowrap">
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">Mới</span>
              Xem Chung
            </button>

            {/* Thể Loại */}
            <div className="relative">
              <button onClick={() => setOpenNavMenu(v => v === 'genre' ? null : 'genre')}
                className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                  openNavMenu === 'genre' ? 'text-white' : 'text-slate-400 hover:text-white')}>
                Thể Loại <ChevronDown size={13} className={cn('transition-transform', openNavMenu === 'genre' && 'rotate-180')} />
              </button>
              {openNavMenu === 'genre' && (
                <div className="absolute top-full left-0 mt-2 w-[420px] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-50 p-3 grid grid-cols-3 gap-1">
                  {GENRES.map(g => (
                    <Link key={g} to={`/type/${g}`} onClick={() => setOpenNavMenu(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate">
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quốc Gia */}
            <div className="relative">
              <button onClick={() => setOpenNavMenu(v => v === 'country' ? null : 'country')}
                className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                  openNavMenu === 'country' ? 'text-white' : 'text-slate-400 hover:text-white')}>
                Quốc Gia <ChevronDown size={13} className={cn('transition-transform', openNavMenu === 'country' && 'rotate-180')} />
              </button>
              {openNavMenu === 'country' && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-50 p-3 grid grid-cols-2 gap-1">
                  {COUNTRIES.map(c => (
                    <Link key={c.slug} to={`/quoc-gia/${c.slug}`} onClick={() => setOpenNavMenu(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate">
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Thêm */}
            <div className="relative">
              <button onClick={() => setOpenNavMenu(v => v === 'more' ? null : 'more')}
                className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                  openNavMenu === 'more' ? 'text-white' : 'text-slate-400 hover:text-white')}>
                Thêm <ChevronDown size={13} className={cn('transition-transform', openNavMenu === 'more' && 'rotate-180')} />
              </button>
              {openNavMenu === 'more' && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-50 p-1.5">
                  {[
                    { to: '/type/hoat-hinh', label: 'Hoạt Hình' },
                    { to: '/type/phim-chieu-rap', label: 'Chiếu Rạp' },
                    { to: '/tv-truc-tuyen', label: 'TV Trực Tuyến' },
                    { to: '/lich-chieu', label: 'Lịch Chiếu' },
                    { to: '/truyen-tranh', label: 'Truyện Tranh' },
                  ].map(l => (
                    <Link key={l.to} to={l.to} onClick={() => setOpenNavMenu(null)}
                      className="block px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex-1" />

          {/* Tải ứng dụng — desktop only */}
          <a href="/" onClick={e => e.preventDefault()}
            className="hidden xl:flex items-center gap-2 pr-3 mr-1 border-r border-white/10 shrink-0 cursor-pointer group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black text-[11px] shrink-0">
              DP
            </div>
            <div className="leading-tight">
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300">Tải ứng dụng</p>
              <p className="text-xs font-bold text-white -mt-0.5">DaoPhim</p>
            </div>
          </a>

          {/* Tìm kiếm — icon riêng cho mobile, mở thẳng trang /search */}
          <Link
            to="/search"
            className="md:hidden p-1.5 text-slate-300 hover:text-white transition-colors shrink-0"
            aria-label="Tìm kiếm phim"
          >
            <Search size={19} />
          </Link>

          {/* ── Tìm kiếm nhanh (chỉ desktop) ── */}
          <div ref={desktopSearchRef} className="relative hidden md:block shrink-0">
            <div className={cn(
              'flex items-center transition-all duration-200 overflow-hidden rounded-full border',
              showDesktopSearch
                ? 'w-72 bg-slate-900/90 border-slate-700/70 px-3'
                : 'w-9 bg-transparent border-transparent'
            )}>
              <button
                onClick={() => setShowDesktopSearch(v => !v)}
                className="p-1.5 text-slate-300 hover:text-white transition-colors shrink-0"
                aria-label="Tìm kiếm phim"
              >
                {desktopSearching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
              </button>
              {showDesktopSearch && (
                <>
                  <input
                    ref={desktopInputRef}
                    type="text"
                    value={desktopQuery}
                    onChange={e => setDesktopQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') goToDesktopSearchResults(); }}
                    placeholder="Tìm phim, diễn viên..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 py-2 px-1.5 focus:outline-none min-w-0"
                  />
                  {desktopQuery && (
                    <button onClick={() => setDesktopQuery('')} className="p-1 text-slate-500 hover:text-white shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Dropdown kết quả */}
            {showDesktopSearch && desktopQuery.trim().length >= 2 && (
              <div className="absolute top-full right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-50">
                {desktopSearching && desktopResults.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-slate-500" />
                  </div>
                ) : desktopResults.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-slate-500 text-sm">Không tìm thấy phim nào</p>
                  </div>
                ) : (
                  <>
                    <div className="py-1.5">
                      {desktopResults.map(movie => (
                        <button
                          key={movie._id}
                          onClick={() => goToDesktopMovie(movie)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800/80 transition-colors text-left"
                        >
                          <div className="w-10 rounded-md overflow-hidden shrink-0 bg-slate-800" style={{ aspectRatio: '2/3' }}>
                            <img
                              src={movieApi.getImageUrl(movie.thumb_url)}
                              alt={movie.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{movie.name}</p>
                            <p className="text-slate-500 text-xs truncate">{movie.origin_name} · {movie.year}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={goToDesktopSearchResults}
                      className="w-full text-center py-2.5 text-xs font-bold text-green-400 hover:bg-slate-800/80 border-t border-slate-800 transition-colors"
                    >
                      Xem tất cả kết quả cho "{desktopQuery.trim()}"
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Chuông thông báo — thay cho icon tài khoản cũ trên mobile */}
          <Link
            to="/notifications"
            className="relative p-1.5 text-slate-300 hover:text-white transition-colors shrink-0"
            aria-label="Thông báo"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User / Login — trên mobile đã có tab "Tài khoản" ở thanh dưới nên chỉ hiện từ md trở lên */}
          {session ? (
            <div ref={userMenuRef} className="relative shrink-0 hidden md:block">
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
              className="shrink-0 hidden md:flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-950 text-xs font-black px-4 py-2 rounded-full transition-all">
              <LogIn size={13} /> <span className="hidden sm:inline">Thành viên</span>
            </Link>
          )}
        </div>
      </header>
      </div>

      {/* ── WATCH ROOM MODAL ── */}
      {showWatchRoomModal && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:px-4" onClick={() => setShowWatchRoomModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative w-full sm:max-w-lg bg-gradient-to-b from-[#161616] to-[#0c0c0c] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/70 flex flex-col overflow-hidden"
            style={{ maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Đầu khung: tiêu đề + 3 bước */}
            <div className="px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/30">
                  <Users size={19} className="text-slate-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-base leading-tight">Tạo phòng xem chung</h3>
                  <p className="text-slate-400 text-xs truncate">
                    {modalStep === 'search' && 'Chọn bộ phim muốn xem cùng bạn bè'}
                    {modalStep === 'confirm' && selectedMovie?.name}
                    {modalStep === 'done' && 'Phòng đã sẵn sàng 🎉'}
                  </p>
                </div>
                <button onClick={() => setShowWatchRoomModal(false)} aria-label="Đóng"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                {(['search', 'confirm', 'done'] as const).map((st, i) => {
                  const cur = ['search', 'confirm', 'done'].indexOf(modalStep);
                  return <span key={st} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= cur ? 'bg-green-500' : 'bg-white/10')} />;
                })}
              </div>
            </div>

            {/* Bước 1: chọn phim */}
            {modalStep === 'search' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-5 pb-3 shrink-0">
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Tìm tên phim..."
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/60 focus:bg-white/[0.07] transition-colors"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      {modalSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5 glass-scroll" style={{ minHeight: 180 }}>
                  {modalSearch.trim().length < 2 ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-2">🎬</div>
                      <p className="text-slate-400 text-sm font-semibold">Gõ ít nhất 2 chữ để tìm phim</p>
                      <p className="text-slate-600 text-xs mt-1">Bạn sẽ chọn tập sau khi vào phòng</p>
                    </div>
                  ) : modalMovies.length === 0 && !modalSearching ? (
                    <p className="text-center text-slate-500 text-sm py-10">Không tìm thấy phim nào</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {modalMovies.map(movie => (
                        <button
                          key={movie._id}
                          onClick={() => { setSelectedMovie(movie); setModalStep('confirm'); }}
                          className="group text-left rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-green-500/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200"
                        >
                          <div className="relative w-full bg-slate-800" style={{ aspectRatio: '2/3' }}>
                            <img
                              src={movieApi.getImageUrl(movie.thumb_url)}
                              alt={movie.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            {movie.year ? <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">{movie.year}</span> : null}
                          </div>
                          <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight p-1.5">{movie.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bước 2: cài đặt phòng */}
            {modalStep === 'confirm' && selectedMovie && (
              <div className="flex flex-col overflow-y-auto px-5 pb-5 gap-4 glass-scroll">
                <div className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-14 rounded-lg overflow-hidden shrink-0 bg-slate-800" style={{ aspectRatio: '2/3' }}>
                    <img src={movieApi.getImageUrl(selectedMovie.thumb_url)} alt={selectedMovie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-white text-sm font-bold line-clamp-2 leading-snug">{selectedMovie.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{selectedMovie.origin_name} · {selectedMovie.year}</p>
                    <button onClick={() => { setModalStep('search'); setSelectedMovie(null); }}
                      className="mt-1.5 text-[11px] text-green-400 hover:text-green-300 font-semibold text-left">
                      ← Đổi phim khác
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Số người tối đa</p>
                  <div className="flex flex-wrap gap-2">
                    {[2, 3, 4, 5, 6, 8, 10, 20].map(n => (
                      <button key={n}
                        onClick={() => { setWatchRoomMax(n); setWatchRoomMaxInput(String(n)); }}
                        className={cn('min-w-[44px] h-10 px-3 rounded-xl text-sm font-black border transition-all active:scale-95',
                          watchRoomMax === n
                            ? 'bg-green-500 border-green-400 text-slate-950 shadow-lg shadow-green-500/25'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30')}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-2">Có chat trực tiếp và mic trò chuyện trong phòng. Phòng tự đóng sau 2 giờ.</p>
                </div>

                {!session && (
                  <div className="px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl">
                    <p className="text-yellow-300 text-xs font-medium">⚠️ Bạn cần đăng nhập để tạo phòng.</p>
                  </div>
                )}

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
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 font-black text-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
                >
                  {creatingRoom ? <Loader2 size={17} className="animate-spin" /> : <Users size={17} />}
                  {creatingRoom ? 'Đang tạo phòng...' : `Tạo phòng · ${watchRoomMax} người`}
                </button>
              </div>
            )}

            {/* Bước 3: xong */}
            {modalStep === 'done' && createdRoomId && (
              <div className="px-5 pb-5 flex flex-col gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-2">
                    <Check size={26} className="text-green-400" />
                  </div>
                  <h3 className="text-white font-bold text-base">Phòng đã được tạo!</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Gửi link cho bạn bè · tối đa {watchRoomMax} người</p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-green-500/25 p-2.5 flex items-center gap-2">
                  <p className="flex-1 min-w-0 text-green-300 text-xs font-mono truncate pl-1">
                    {window.location.origin}/watch-room/{createdRoomId}
                  </p>
                  <button onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/watch-room/${createdRoomId}`).catch(() => {});
                    setRoomLinkCopied(true);
                    setTimeout(() => setRoomLinkCopied(false), 2000);
                  }}
                    className={cn('shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                      roomLinkCopied ? 'bg-green-500 text-slate-950' : 'bg-white/10 text-slate-200 hover:bg-white/15')}>
                    {roomLinkCopied ? <Check size={13} /> : <Copy size={13} />}
                    {roomLinkCopied ? 'Đã copy' : 'Copy'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowWatchRoomModal(false)}
                    className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/10 transition-colors">
                    Đóng
                  </button>
                  <button onClick={() => { navigate(`/watch-room/${createdRoomId}`); setShowWatchRoomModal(false); }}
                    className="flex-[1.4] h-11 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/25">
                    <Users size={15} /> Vào phòng
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
