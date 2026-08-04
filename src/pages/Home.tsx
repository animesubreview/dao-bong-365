import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2, Calendar, Play, Clock } from 'lucide-react';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import { useManualMovies, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeUpcomingMovies as subscribeOldUpcoming } from '../lib/manualMovies';
import { subscribeUpcomingMovies, UpcomingMovie } from '../lib/upcomingMovies';
import { subscribePinnedMovies, pinnedToMovie, PinnedMovie } from '../lib/pinnedMovies';
import { cn } from '../lib/utils';
import { onAuthChange } from '../lib/auth';
import { getHistory } from '../lib/history';
import Banner from '../components/Banner';
import { QualityBadge, DurationBadge } from '../components/MovieCard';
import MovieCard from '../components/MovieCard';

import LiveBanner from '../components/LiveBanner';

/* ─── helpers ─────────────────────────────────────────────────── */
function dec(s: string) {
  return (s || '').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

/* ─── Badges ──────────────────────────────────────────────────── */

/* ─── Card sizes ──────────────────────────────────────────────── */
const CW = 'clamp(110px,30vw,155px)';
const SKELETON_H = 220; // px — đủ để tránh layout shift

/* ─── MCard với ảnh fade-in 500ms ────────────────────────────── */
function MCard({ movie, pinned }: { movie: Movie; pinned?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
        {pinned && (
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-blue-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
            📌 GHIM
          </div>
        )}
        {/* Badge trên cùng: trái hồng (chất lượng+ngôn ngữ), phải tím (thời lượng/tập) */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1 z-10">
          <QualityBadge movie={movie} />
          <DurationBadge movie={movie} />
        </div>
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">{dec(movie.name)}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
          <span className="truncate">{dec(movie.origin_name)}</span>
          {movie.year && <span className="shrink-0 text-yellow-400/60">{movie.year}</span>}
        </div>
      </div>
    </Link>
  );
}

function ManualMCard({ movie }: { movie: ManualMovie }) {
  return (
    <Link to={`/manual/${movie.id}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        {movie.posterUrl
          ? <img src={movie.posterUrl} alt={movie.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName}</div>
      </div>
    </Link>
  );
}


/* ─── Upcoming Movie Card (Sắp chiếu - từ Admin) ────────────────── */
function UpcomingCard({ movie }: { movie: ManualMovie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/manual/${movie.id}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        {movie.posterUrl && (
          <img src={movie.posterUrl} alt={movie.name} loading="lazy" referrerPolicy="no-referrer"
            onLoad={() => setOk(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        {/* Release date badge */}
        {movie.releaseDate && (
          <div className="absolute bottom-1.5 left-1 right-1 flex items-center gap-1 bg-yellow-500/90 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
            <Calendar size={9} className="text-slate-950 shrink-0" />
            <span className="text-[9px] font-black text-slate-950 truncate">{movie.releaseDate}</span>
          </div>
        )}
        {!movie.releaseDate && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded">
            SẮP RA
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName || movie.year}</div>
      </div>
    </Link>
  );
}

// Hook lấy phim sắp chiếu từ collection riêng (mới)
function useUpcomingMoviesHook() {
  const [movies, setMovies] = useState<UpcomingMovie[]>([]);
  useEffect(() => {
    const unsub = subscribeUpcomingMovies(setMovies);
    return unsub;
  }, []);
  return movies;
}

// Hook lấy phim sắp chiếu từ manualMovies (cũ - giữ tương thích)
function useOldUpcomingHook() {
  const [movies, setMovies] = useState<ManualMovie[]>([]);
  useEffect(() => {
    const unsub = subscribeOldUpcoming(setMovies);
    return unsub;
  }, []);
  return movies;
}

/* ─── New Upcoming Card (từ collection riêng) ───────────────────── */
function UpcomingNewCard({ movie }: { movie: UpcomingMovie }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        {movie.posterUrl && (
          <img src={movie.posterUrl} alt={movie.name} loading="lazy" referrerPolicy="no-referrer"
            onLoad={() => setOk(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        {/* Release date badge */}
        {movie.releaseDate ? (
          <div className="absolute bottom-1.5 left-1 right-1 flex items-center gap-1 bg-yellow-500/90 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
            <Calendar size={9} className="text-slate-950 shrink-0" />
            <span className="text-[9px] font-black text-slate-950 truncate">{movie.releaseDate}</span>
          </div>
        ) : (
          <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded">
            SẮP RA
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName || movie.year}</div>
      </div>
    </div>
  );
}

function Top10Card({ movie, rank }: { movie: Movie; rank: number }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1 z-10">
          <QualityBadge movie={movie} />
          <DurationBadge movie={movie} />
        </div>
      </div>
      <div className="flex items-start gap-1.5 mt-1">
        <span className={cn('text-3xl font-black leading-none shrink-0 mt-0.5', rank<=3?'text-yellow-400':'text-slate-600')} style={{fontStyle:'italic'}}>{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[12px] text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-2 leading-snug">{dec(movie.name)}</div>
          {movie.year && <div className="text-[10px] text-slate-500 mt-0.5">{movie.year}</div>}
        </div>
      </div>
    </Link>
  );
}

/* ─── HRow ────────────────────────────────────────────────────── */
function HRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const check = useCallback(() => {
    const el = ref.current; if (!el) return;
    setCanL(el.scrollLeft > 10);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);
  useEffect(() => {
    check();
    const el = ref.current;
    el?.addEventListener('scroll', check, { passive:true });
    window.addEventListener('resize', check);
    return () => { el?.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [check]);
  const scroll = (d: 'left'|'right') => ref.current?.scrollBy({ left: d==='right'?500:-500, behavior:'smooth' });
  return (
    <div className="relative group/row">
      {canL && <button onClick={() => scroll('left')} className="absolute left-0 top-[35%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/95 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-yellow-500 hover:text-slate-950 shadow-xl -translate-x-1/2"><ChevronLeft size={16}/></button>}
      <div ref={ref} className="flex gap-2 overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0"
        style={{ scrollSnapType:'x mandatory', scrollbarWidth:'none', msOverflowStyle:'none', WebkitOverflowScrolling:'touch' }}>
        {children}
      </div>
      {canR && <button onClick={() => scroll('right')} className="absolute right-0 top-[35%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/95 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-yellow-500 hover:text-slate-950 shadow-xl translate-x-1/2"><ChevronRight size={16}/></button>}
    </div>
  );
}

/* ─── Tiếp tục xem (lịch sử xem gần đây, chỉ hiện khi đã đăng nhập) ─── */
function timeAgo(ts: number) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

function ContinueWatchingSection() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setLoggedIn(!!user);
      if (user) {
        try {
          const saved = await getHistory(user.uid, 12);
          setHistory(saved);
        } catch { setHistory([]); }
      } else {
        setHistory([]);
      }
    });
    return () => unsub();
  }, []);

  if (!loggedIn || history.length === 0) return null;

  return (
    <section className="px-4 md:px-8 mb-6">
      <SecHeader title="Tiếp Tục Xem" to="/history" label="Xem tất cả" />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {history.map((item) => (
          <Link
            key={item.slug + item.episodeSlug}
            to={`/watch/${item.slug}/${item.episodeSlug}`}
            className="group relative shrink-0 w-40 sm:w-48 rounded-xl overflow-hidden bg-slate-800"
            style={{ aspectRatio: '16/9' }}
          >
            <img
              src={movieApi.getImageUrl(item.thumb_url || item.poster_url || '')}
              alt={item.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const t = e.currentTarget;
                if (item.poster_url && !t.src.includes(item.poster_url)) {
                  t.src = movieApi.getImageUrl(item.poster_url);
                } else {
                  t.src = '/assets/logo-phimtuoitho.png';
                }
              }}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-yellow-500/90 flex items-center justify-center">
                <Play size={18} className="text-white fill-current" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-[12px] font-bold text-white line-clamp-1">{item.name}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-slate-300">Tập {item.episodeName}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                  <Clock size={9} /> {timeAgo(item.updatedAt)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── SecHeader — tiêu đề trắng, gạch chân vàng, nút "Tất Cả" viên vàng + "Xem thêm »" (theo mẫu Phim Tuổi Thơ) ── */
function SecHeader({ title, to, label='Tất Cả' }: { title:string; to?:string; label?:string }) {
  return (
    <div className="flex items-end justify-between mb-3 gap-2">
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">{title}</h2>
        <span className="block w-9 h-[3px] rounded-full bg-yellow-400 mt-1.5" />
      </div>
      {to && (
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to={to} className="text-[11px] font-black text-slate-950 bg-yellow-400 hover:bg-yellow-300 px-3.5 py-[7px] rounded-full transition-colors whitespace-nowrap">
            {label}
          </Link>
          <Link to={to} className="hidden sm:inline text-xs font-extrabold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap">
            Xem thêm »
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── GridHeader — tiêu đề + gạch vàng + nút "Tất Cả" + "Xem thêm »" góc phải (mẫu ảnh mới) ── */
function GridHeader({ title, to, allLabel='Tất Cả' }: { title: string; to?: string; allLabel?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{title}</h2>
        {to && (
          <Link to={to} className="shrink-0 text-sm font-extrabold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap pt-0.5">
            Xem thêm »
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="block w-9 h-[3px] rounded-full bg-yellow-400 shrink-0" />
        {allLabel && (
          <button className="shrink-0 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full bg-yellow-400 text-slate-950">
            {allLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── GridTabHeader — tiêu đề + "Xem thêm »" + list tab (dạng "Gợi ý phim") ── */
function GridTabHeader({ title, to, tabs, active, onTab }: {
  title: string; to?: string; tabs: string[]; active: number; onTab: (i: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{title}</h2>
        {to && (
          <Link to={to} className="shrink-0 text-sm font-extrabold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap pt-0.5">
            Xem thêm »
          </Link>
        )}
      </div>
      <span className="block w-9 h-[3px] rounded-full bg-yellow-400 mt-2 mb-2.5" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => onTab(i)}
            className={cn('text-xs sm:text-sm font-black transition-all whitespace-nowrap',
              active === i ? 'bg-yellow-400 text-slate-950 px-3.5 py-1.5 rounded-full' : 'text-yellow-400 hover:text-yellow-300')}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── GridGrid — lưới poster 2 cột (thay cho scroll ngang), dùng MovieCard đầy đủ badge ── */
function GridGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {movies.map(m => <MovieCard key={m._id} movie={m} />)}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-slate-800/50 animate-pulse" style={{ aspectRatio: '2/3' }} />
      ))}
    </div>
  );
}

/* ─── Skeleton row (không bao giờ biến mất → no black screen) ── */
function SkeletonRow() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({length:8}).map((_,i) => (
        <div key={i} className="shrink-0 rounded-lg bg-slate-800/50 animate-pulse"
          style={{ width: CW, height: SKELETON_H }} />
      ))}
    </div>
  );
}

/* ─── LazySection — scroll trigger, 500ms delay, KHÔNG bị đen ── */
function LazySection({ title, to, fetch: fetchFn, label }: {
  title: string; to: string; label?: string;
  fetch: () => Promise<Movie[]>;
}) {
  const [movies, setMovies] = useState<Movie[] | null>(null); // null = chưa fetch
  const [fetching, setFetching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      obs.disconnect();
      setFetching(true);
      // Delay 500ms trước khi fetch để tránh quá nhiều request đồng thời
      setTimeout(() => {
        fetchFn()
          .then(data => setMovies(data))
          .catch(() => setMovies([]))
          .finally(() => setFetching(false));
      }, 500);
    }, { rootMargin: '400px' }); // Trigger sớm khi còn cách 400px
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    // min-height cố định → layout KHÔNG bao giờ collapse → không bị đen
    <section ref={ref} style={{ minHeight: SKELETON_H + 60 }}>
      <SecHeader title={title} to={to} label={label} />
      {movies && movies.length > 0
        ? <HRow>{movies.map(m => <MCard key={m._id} movie={m} />)}</HRow>
        : <SkeletonRow />
      }
    </section>
  );
}

/* ─── Interest cards — chỉ hoạt hình (Phim Tuổi Thơ ưu tiên hoạt hình) ──── */
const INTEREST = [
  { label:'Anime Nhật', sub:'Hoạt Hình', to:'/type/hoat-hinh', g:'from-purple-600/70 via-blue-500/60 to-blue-400/50' },
  { label:'Hoạt Hình Trung', sub:'Hoa Ngữ', to:'/type/hoat-hinh', g:'from-pink-500/70 via-rose-400/60 to-pink-300/50' },
  { label:'Hoạt Hình Âu Mỹ', sub:'Cực Hay', to:'/type/hoat-hinh', g:'from-blue-500/70 via-cyan-400/60 to-teal-400/50' },
  { label:'Hoạt Hình Bộ', sub:'Trọn Bộ', to:'/type/hoat-hinh', g:'from-emerald-500/70 via-teal-400/60 to-cyan-400/50' },
  { label:'Hoạt Hình Chiếu Rạp', sub:'Mới Nhất', to:'/type/hoat-hinh', g:'from-yellow-600/70 via-orange-400/60 to-yellow-400/50' },
  { label:'Hoạt Hình Việt', sub:'Vietsub', to:'/type/hoat-hinh', g:'from-indigo-500/70 via-purple-400/60 to-violet-400/50' },
];

/* ─── Top tabs config — chỉ hoạt hình ───────────────────────────── */
const TOP_TABS = ['Top ngày','Top tuần','Top tháng','Hoạt hình bộ','Hoạt hình lẻ'];
const TOP_TITLES = ['Top 10 Hoạt Hình Hôm Nay','Top 10 Hoạt Hình Tuần Này','Top 10 Hoạt Hình Tháng Này','Top 10 Hoạt Hình Bộ','Top 10 Hoạt Hình Lẻ'];
const TOP_SRCS = [null,'hoat-hinh-2','hoat-hinh-3','hoat-hinh-bo','hoat-hinh-le'] as const;

/* ─── Tabs khối "Gợi ý phim truyền hình" (phim bộ hoạt hình nhiều tập) ── */
const SERIES_TABS = ['Phổ Biến','Mới Cập Nhật','Hoàn Thành','Đang Chiếu'];
const SERIES_TITLES = ['Phim Truyền Hình Hoạt Hình Nổi Bật','Phim Truyền Hình Hoạt Hình Mới Cập Nhật','Phim Truyền Hình Hoạt Hình Hoàn Thành','Phim Truyền Hình Hoạt Hình Đang Chiếu'];
const SERIES_SRCS = [null,'moi-cap-nhat','hoan-thanh','dang-chieu'] as const;

/* ─── Tất cả lazy sections — chỉ nguồn hoạt hình (KKPhim/OPhim/NguonC ưu tiên hoạt hình) ── */
const LAZY_SECTIONS = [
  { title:'Hoạt Hình Nhật Bản (Anime)', to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', country:'nhat-ban', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Âu Mỹ',            to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', country:'au-my', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Trung Quốc',       to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', country:'trung-quoc', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Trọn Bộ',          to:'/type/hoat-hinh', fetch: () => movieApi.getMoviesByType('hoat-hinh',2,24).then(r=>r.items) },
  { title:'Hoạt Hình Mới Cập Nhật',     to:'/type/hoat-hinh', fetch: () => movieApi.getMoviesByType('hoat-hinh',3,24).then(r=>r.items) },
  { title:'Hoạt Hình Hài Hước',         to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', category:'hai-huoc', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Gia Đình',         to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', category:'gia-dinh', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Phiêu Lưu',        to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', category:'phieu-luu', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Siêu Anh Hùng',    to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', category:'hanh-dong', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Học Đường',        to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', category:'hoc-duong', page:1, limit:24 }).then(r=>r.items) },
  { title:'Hoạt Hình Kinh Điển Tuổi Thơ',to:'/type/hoat-hinh',fetch: () => movieApi.getMoviesByType('hoat-hinh',4,24).then(r=>r.items) },
  { title:'Hoạt Hình Việt Nam',         to:'/type/hoat-hinh', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', country:'viet-nam', page:1, limit:24 }).then(r=>r.items) },
];

/* ════════════════════════════════════════════════════════════════
   MAIN HOME
   ════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([]);
  const [top10, setTop10] = useState<Movie[]>([]);
  const [topTabMovies, setTopTabMovies] = useState<Movie[]>([]);
  const [topTabLoading, setTopTabLoading] = useState(false);
  const [topTab, setTopTab] = useState(0);
  const [seriesTop10, setSeriesTop10] = useState<Movie[]>([]);
  const [seriesTabMovies, setSeriesTabMovies] = useState<Movie[]>([]);
  const [seriesTabLoading, setSeriesTabLoading] = useState(false);
  const [seriesTab, setSeriesTab] = useState(0);
  const [cinema, setCinema] = useState<Movie[]>([]);
  const [newUpdates, setNewUpdates] = useState<Movie[]>([]);
  const [seriesNewUpdates, setSeriesNewUpdates] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const manualMovies = useManualMovies();
  const upcomingMovies = useUpcomingMoviesHook();
  const oldUpcoming = useOldUpcomingHook();

  // Phim ghim từ KKPhim - admin chọn ghim lên đầu mục "Phim Mới Cập Nhật"
  const [pinnedMovies, setPinnedMovies] = useState<PinnedMovie[]>([]);
  useEffect(() => {
    const unsub = subscribePinnedMovies(setPinnedMovies);
    return unsub;
  }, []);

  useSEO({
    description: 'Phim Tuổi Thơ - Xem phim hoạt hình, anime online miễn phí chất lượng HD. Vietsub, thuyết minh, lồng tiếng. Cập nhật liên tục mỗi ngày.',
    url: '/',
    type: 'website',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Trang chủ chỉ ưu tiên & hiển thị phim hoạt hình (nguồn KKPhim → OPhim → NguonC)
        const [r1, r2, r3, r4] = await Promise.all([
          movieApi.getMoviesByType('hoat-hinh', 1, 24),
          movieApi.getMoviesByType('hoat-hinh', 5, 20),
          movieApi.searchMovies('hoạt hình bộ', 1, 10),
          movieApi.getMoviesByType('hoat-hinh', 6, 12),
        ]);
        if (cancelled) return;
        const t10 = r1.items.slice(0, 10);
        setBannerMovies(t10);
        setTop10(t10);
        setTopTabMovies(t10);
        setCinema(r2.items);
        setNewUpdates(r1.items.slice(0, 30));
        setSeriesTop10(r3.items.slice(0, 10));
        setSeriesTabMovies(r3.items.slice(0, 10));
        setSeriesNewUpdates(r4.items.slice(0, 8));
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTopTab = async (i: number) => {
    setTopTab(i);
    if (i === 0) { setTopTabMovies(top10); return; }
    setTopTabLoading(true);
    try {
      const src = TOP_SRCS[i];
      let res;
      if (src === 'hoat-hinh-2') res = await movieApi.getMoviesByType('hoat-hinh', 2, 10);
      else if (src === 'hoat-hinh-3') res = await movieApi.getMoviesByType('hoat-hinh', 3, 10);
      else if (src === 'hoat-hinh-bo') res = await movieApi.searchMovies('hoạt hình trọn bộ', 1, 10);
      else if (src === 'hoat-hinh-le') res = await movieApi.searchMovies('hoạt hình lẻ', 1, 10);
      else res = await movieApi.getMoviesByType('hoat-hinh', 1, 10);
      setTopTabMovies(res.items.slice(0, 10));
    } catch { setTopTabMovies(top10); }
    finally { setTopTabLoading(false); }
  };

  const handleSeriesTab = async (i: number) => {
    setSeriesTab(i);
    if (i === 0) { setSeriesTabMovies(seriesTop10); return; }
    setSeriesTabLoading(true);
    try {
      const src = SERIES_SRCS[i];
      let res;
      if (src === 'moi-cap-nhat') res = await movieApi.getMoviesByType('hoat-hinh', 6, 10);
      else if (src === 'hoan-thanh') res = await movieApi.searchMovies('hoạt hình trọn bộ', 1, 10);
      else if (src === 'dang-chieu') res = await movieApi.searchMovies('hoạt hình đang chiếu', 1, 10);
      else res = await movieApi.searchMovies('hoạt hình bộ', 1, 10);
      setSeriesTabMovies(res.items.slice(0, 10));
    } catch { setSeriesTabMovies(seriesTop10); }
    finally { setSeriesTabLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ paddingTop:'56px' }}>
        <div className="w-8 h-8 border-t-transparent rounded-full animate-spin border-yellow-500" style={{ borderWidth:3, borderStyle:'solid' }} />
      </div>
    );
  }

  return (
    <div className="pb-20 bg-slate-950 min-h-screen">
      <h1 className="sr-only">
        Phim Tuổi Thơ - Xem Phim Hoạt Hình Online Miễn Phí HD Vietsub, Thuyết Minh, Lồng Tiếng
      </h1>
      <Banner movies={bannerMovies} />
      <ContinueWatchingSection />
      <LiveBanner />

      <main className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-6 flex flex-col gap-8">

        {/* Phim mới nhất — lưới 2 cột */}
        {newUpdates.length > 0 && (
          <section>
            <GridHeader title="Phim mới nhất" to="/type/hoat-hinh" />
            <GridGrid movies={newUpdates.slice(0, 8)} />
          </section>
        )}

        {/* Phim truyền hình mới nhất — lưới 2 cột */}
        {seriesNewUpdates.length > 0 && (
          <section>
            <GridHeader title="Phim truyền hình mới nhất" to="/type/hoat-hinh" />
            <GridGrid movies={seriesNewUpdates} />
          </section>
        )}

        {/* Gợi ý phim — lưới 2 cột + tabs */}
        {topTabMovies.length > 0 && (
          <section>
            <GridTabHeader title="Gợi ý phim" to="/type/hoat-hinh" tabs={TOP_TABS} active={topTab} onTab={handleTopTab} />
            {topTabLoading ? <GridSkeleton /> : <GridGrid movies={topTabMovies.slice(0, 8)} />}
          </section>
        )}

        {/* Gợi ý phim truyền hình — lưới 2 cột + tabs */}
        {seriesTabMovies.length > 0 && (
          <section>
            <GridTabHeader title="Gợi ý phim truyền hình" to="/type/hoat-hinh" tabs={SERIES_TABS} active={seriesTab} onTab={handleSeriesTab} />
            {seriesTabLoading ? <GridSkeleton /> : <GridGrid movies={seriesTabMovies.slice(0, 8)} />}
          </section>
        )}

        {/* Quan tâm gì */}
        <section>
          <SecHeader title="Bạn đang quan tâm gì?" />
          <div className="flex gap-2 overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0 pb-1"
            style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
            {INTEREST.map(card => (
              <Link key={card.label} to={card.to}
                className={cn('shrink-0 relative rounded-xl overflow-hidden hover:scale-[1.02] transition-transform', `bg-gradient-to-br ${card.g}`)}
                style={{ width:'clamp(120px,38vw,180px)', height:'clamp(65px,14vw,90px)', flexShrink:0 }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-black/20" />
                <div className="absolute bottom-0 left-0 p-2.5">
                  <p className="text-white font-black text-sm leading-tight">{card.label}</p>
                  <p className="text-white/80 text-[10px] font-semibold flex items-center gap-0.5">{card.sub} <ChevronRight size={9}/></p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Hoạt Hình Nổi Bật — load ngay */}
        {cinema.length > 0 && (
          <section>
            <SecHeader title="Hoạt Hình Nổi Bật" to="/type/hoat-hinh" label="Tất cả" />
            <HRow>{cinema.map(m => <MCard key={m._id} movie={m}/>)}</HRow>
          </section>
        )}

        {/* Hoạt Hình Mới Cập Nhật — load ngay (phim ghim của admin luôn hiện đầu tiên) */}
        {(newUpdates.length > 0 || manualMovies.length > 0 || pinnedMovies.length > 0) && (
          <section>
            <SecHeader title="Hoạt Hình Mới Cập Nhật" to="/type/hoat-hinh" label="Tất cả" />
            <HRow>
              {pinnedMovies.map(p => <MCard key={p.slug} movie={pinnedToMovie(p)} pinned />)}
              {manualMovies.slice(0,4).map(m => <ManualMCard key={m.id} movie={m}/>)}
              {newUpdates
                .filter(m => !pinnedMovies.some(p => p.slug === m.slug))
                .map(m => <MCard key={m._id} movie={m}/>)}
            </HRow>
          </section>
        )}

        {/* Anime / Hoạt Hình Sắp Chiếu — từ collection riêng (gộp cả 2 nguồn cũ + mới) */}
        {(upcomingMovies.filter(m => m.upcomingType === 'anime').length > 0
          || oldUpcoming.filter(m => m.upcomingType === 'anime' || !m.upcomingType).length > 0) && (
          <section>
            <SecHeader title="Hoạt Hình Sắp Chiếu" to="/type/hoat-hinh" label="Tất cả" />
            <HRow>
              {upcomingMovies
                .filter(m => m.upcomingType === 'anime')
                .map(m => <UpcomingNewCard key={m.id} movie={m} />)}
              {oldUpcoming
                .filter(m => m.upcomingType === 'anime' || !m.upcomingType)
                .map(m => <UpcomingCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* Tất cả lazy sections — chỉ hoạt hình (KKPhim → OPhim → NguonC) */}
        {LAZY_SECTIONS.map(s => (
          <LazySection key={s.title} title={s.title} to={s.to} fetch={s.fetch} />
        ))}

      </main>
    </div>
  );
}
