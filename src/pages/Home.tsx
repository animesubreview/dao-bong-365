import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2, Calendar, Play, Clock } from 'lucide-react';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import { useManualMovies, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeUpcomingMovies as subscribeOldUpcoming } from '../lib/manualMovies';
import { subscribeUpcomingMovies, UpcomingMovie } from '../lib/upcomingMovies';
import { cn } from '../lib/utils';
import { onAuthChange } from '../lib/auth';
import Banner from '../components/Banner';
import AdBanner from '../components/AdBanner';
import LiveBanner from '../components/LiveBanner';

/* ─── helpers ─────────────────────────────────────────────────── */
function dec(s: string) {
  return (s || '').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

/* ─── Badges ──────────────────────────────────────────────────── */
function EpBadge({ ep }: { ep?: string }) {
  if (!ep) return null;
  const c = ep.match(/hoàn tất\s*\((\d+)\/(\d+)\)/i);
  const n = ep.match(/tập\s*(\d+)/i);
  const label = c ? `HT (${c[1]}/${c[2]})` : n ? `Tập ${n[1]}` : /^full$/i.test(ep.trim()) ? 'FULL' : /hoàn tất/i.test(ep) ? 'FULL' : '';
  if (!label) return null;
  return <span className="absolute top-1 right-1 text-[8px] font-black px-1.5 py-0.5 rounded bg-black/80 text-white z-10 leading-none">{label}</span>;
}
function LangBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  const l = lang.toLowerCase();
  const label = l.includes('vietsub')||l.includes('phụ đề') ? 'P.ĐỀ' : l.includes('thuyết minh') ? 'T.MINH' : l.includes('lồng tiếng') ? 'L.TIẾNG' : null;
  if (!label) return null;
  return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white leading-none ${label==='P.ĐỀ'?'bg-red-600':label==='T.MINH'?'bg-blue-600':'bg-green-700'}`}>{label}</span>;
}

/* ─── Card sizes ──────────────────────────────────────────────── */
const CW = 'clamp(110px,30vw,155px)';
const SKELETON_H = 220; // px — đủ để tránh layout shift

/* ─── MCard với ảnh fade-in 500ms ────────────────────────────── */
function MCard({ movie }: { movie: Movie }) {
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
        <EpBadge ep={movie.episode_current} />
        <div className="absolute bottom-1 left-1"><LangBadge lang={movie.lang} /></div>
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{dec(movie.name)}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
          <span className="truncate">{dec(movie.origin_name)}</span>
          {movie.year && <span className="shrink-0 text-green-400/50">{movie.year}</span>}
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
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{movie.name}</div>
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
          <div className="absolute bottom-1.5 left-1 right-1 flex items-center gap-1 bg-green-600/90 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
            <Calendar size={9} className="text-slate-950 shrink-0" />
            <span className="text-[9px] font-black text-slate-950 truncate">{movie.releaseDate}</span>
          </div>
        )}
        {!movie.releaseDate && (
          <div className="absolute top-1 right-1 bg-green-600 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded">
            SẮP RA
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{movie.name}</div>
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
          <div className="absolute bottom-1.5 left-1 right-1 flex items-center gap-1 bg-green-600/90 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
            <Calendar size={9} className="text-slate-950 shrink-0" />
            <span className="text-[9px] font-black text-slate-950 truncate">{movie.releaseDate}</span>
          </div>
        ) : (
          <div className="absolute top-1 right-1 bg-green-600 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded">
            SẮP RA
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{movie.name}</div>
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
      </div>
      <div className="flex items-start gap-1.5 mt-1">
        <span className={cn('text-3xl font-black leading-none shrink-0 mt-0.5', rank<=3?'text-green-400':'text-slate-600')} style={{fontStyle:'italic'}}>{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-2 leading-snug">{dec(movie.name)}</div>
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
      {canL && <button onClick={() => scroll('left')} className="absolute left-0 top-[35%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/95 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-green-500 hover:text-slate-950 shadow-xl -translate-x-1/2"><ChevronLeft size={16}/></button>}
      <div ref={ref} className="flex gap-2 overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0"
        style={{ scrollSnapType:'x mandatory', scrollbarWidth:'none', msOverflowStyle:'none', WebkitOverflowScrolling:'touch' }}>
        {children}
      </div>
      {canR && <button onClick={() => scroll('right')} className="absolute right-0 top-[35%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/95 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-green-500 hover:text-slate-950 shadow-xl translate-x-1/2"><ChevronRight size={16}/></button>}
    </div>
  );
}

/* ─── Bảng màu tiêu đề danh mục (đa dạng, bắt mắt như các web phim lớn) ── */
const TITLE_COLORS = [
  { text: 'text-pink-400',    bar: 'bg-pink-400' },
  { text: 'text-orange-400',  bar: 'bg-orange-400' },
  { text: 'text-yellow-400',  bar: 'bg-yellow-400' },
  { text: 'text-fuchsia-400', bar: 'bg-fuchsia-400' },
  { text: 'text-sky-400',     bar: 'bg-sky-400' },
  { text: 'text-emerald-400', bar: 'bg-emerald-400' },
  { text: 'text-violet-400',  bar: 'bg-violet-400' },
  { text: 'text-rose-400',    bar: 'bg-rose-400' },
  { text: 'text-cyan-400',    bar: 'bg-cyan-400' },
  { text: 'text-lime-400',    bar: 'bg-lime-400' },
];

function colorForTitle(title: string) {
  const t = title.toLowerCase();
  // Màu cố định theo quốc gia/chủ đề (ưu tiên trước khi dùng màu ngẫu nhiên theo hash)
  if (t.includes('việt nam')) return { text: 'text-red-500', bar: 'bg-yellow-400' };       // Cờ Việt Nam: đỏ - vàng
  if (t.includes('hàn quốc')) return { text: 'text-pink-400', bar: 'bg-pink-400' };
  if (t.includes('trung quốc')) return { text: 'text-orange-400', bar: 'bg-orange-400' };
  if (t.includes('us-uk') || t.includes('âu mỹ')) return { text: 'text-fuchsia-400', bar: 'bg-fuchsia-400' };
  if (t.includes('nhật bản')) return { text: 'text-sky-400', bar: 'bg-sky-400' };
  if (t.includes('thái lan')) return { text: 'text-yellow-400', bar: 'bg-yellow-400' };
  if (t.includes('hoạt hình') || t.includes('anime')) return { text: 'text-violet-400', bar: 'bg-violet-400' };

  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return TITLE_COLORS[hash % TITLE_COLORS.length];
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
    const unsub = onAuthChange((user) => {
      setLoggedIn(!!user);
      if (user) {
        try {
          const saved = JSON.parse(localStorage.getItem('watchHistory') || '[]');
          setHistory(Array.isArray(saved) ? saved.slice(0, 12) : []);
        } catch { setHistory([]); }
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
                  t.src = '/assets/logo-daophim.png';
                }
              }}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-green-500/90 flex items-center justify-center">
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

/* ─── SecHeader ───────────────────────────────────────────────── */
function SecHeader({ title, to, label='Tất cả' }: { title:string; to?:string; label?:string }) {
  const { text, bar } = colorForTitle(title);
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className={`text-base font-black flex items-center gap-2 ${text}`}>
        <span className={`w-1 h-4 rounded-full inline-block shrink-0 ${bar}`} />{title}
      </h2>
      {to && <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-green-400 transition-colors bg-slate-800/60 border border-slate-700/60 px-2.5 py-1.5 rounded-full shrink-0">{label} <ChevronRight size={11}/></Link>}
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

/* ─── Interest cards ──────────────────────────────────────────── */
const INTEREST = [
  { label:'Hàn Quốc', sub:'Phim Bộ', to:'/type/phim-bo', g:'from-purple-600/70 via-blue-500/60 to-blue-400/50' },
  { label:'Trung Quốc', sub:'Hoa Ngữ', to:'/type/phim-bo', g:'from-pink-500/70 via-rose-400/60 to-pink-300/50' },
  { label:'Thái Lan', sub:'Cực Hay', to:'/type/phim-le', g:'from-blue-500/70 via-cyan-400/60 to-teal-400/50' },
  { label:'Sitcom', sub:'TV Shows', to:'/type/tv-shows', g:'from-emerald-500/70 via-teal-400/60 to-cyan-400/50' },
  { label:'Âu Mỹ', sub:'Hollywood', to:'/type/phim-le', g:'from-green-600/70 via-orange-400/60 to-yellow-400/50' },
  { label:'Hoạt Hình', sub:'Anime', to:'/type/hoat-hinh', g:'from-indigo-500/70 via-purple-400/60 to-violet-400/50' },
];

/* ─── Top tabs config ─────────────────────────────────────────── */
const TOP_TABS = ['Top ngày','Top tuần','Top tháng','Top bộ','Top lẻ'];
const TOP_TITLES = ['Top 10 Hôm Nay','Top 10 Tuần Này','Top 10 Tháng Này','Top 10 Phim Bộ','Top 10 Phim Lẻ'];
const TOP_SRCS = [null,'phim-moi','phim-chieu-rap','phim-bo','phim-le'] as const;

/* ─── All lazy sections từ KKPhim API ────────────────────────── */
const LAZY_SECTIONS = [
  { title:'Phim Hàn Quốc',    to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('hàn quốc',1,24).then(r=>r.items) },
  { title:'Phim Trung Quốc',  to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('trung quốc',1,24).then(r=>r.items) },
  { title:'Phim Hành Động',   to:'/type/phim-le',       fetch: () => movieApi.searchMovies('hành động',1,24).then(r=>r.items) },
  { title:'Phim Bộ Đang Chiếu',to:'/type/phim-bo',      fetch: () => movieApi.getMoviesByType('phim-bo',1,24).then(r=>r.items) },
  { title:'Phim Lẻ Mới',      to:'/type/phim-le',       fetch: () => movieApi.getMoviesByType('phim-le',1,24).then(r=>r.items) },
  { title:'Phim Hoạt Hình',   to:'/type/hoat-hinh',     fetch: () => movieApi.getMoviesByType('hoat-hinh',1,24).then(r=>r.items) },
  { title:'Tâm Lý - Tình Cảm',to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('tình cảm',1,24).then(r=>r.items) },
  { title:'Phim Kinh Dị',     to:'/type/phim-le',       fetch: () => movieApi.searchMovies('kinh dị',1,24).then(r=>r.items) },
  { title:'Phim Âu Mỹ',       to:'/type/phim-le',       fetch: () => movieApi.filterMovies({ type:'phim-le', country:'au-my', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Nhật Bản',    to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('nhật bản',1,24).then(r=>r.items) },
  { title:'Phim Thái Lan',    to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('thái lan',1,24).then(r=>r.items) },
  { title:'Phim Viễn Tưởng',  to:'/type/phim-le',       fetch: () => movieApi.filterMovies({ type:'phim-le', category:'vien-tuong', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Hài Hước',    to:'/type/phim-le',       fetch: () => movieApi.searchMovies('hài hước',1,24).then(r=>r.items) },
  { title:'TV Shows',          to:'/type/tv-shows',      fetch: () => movieApi.getMoviesByType('tv-shows',1,24).then(r=>r.items) },
  { title:'Phim Hoạt Hình Nhiều Người Xem',to:'/type/hoat-hinh',fetch: () => movieApi.getMoviesByType('hoat-hinh',2,24).then(r=>r.items) },
  { title:'Phim Cổ Trang',    to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('cổ trang',1,24).then(r=>r.items) },
  { title:'Phim Hình Sự',     to:'/type/phim-le',       fetch: () => movieApi.searchMovies('hình sự',1,24).then(r=>r.items) },
  { title:'Phim Việt Nam',    to:'/type/phim-bo',       fetch: () => movieApi.searchMovies('việt nam',1,24).then(r=>r.items) },
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
  const [cinema, setCinema] = useState<Movie[]>([]);
  const [newUpdates, setNewUpdates] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const manualMovies = useManualMovies();
  const upcomingMovies = useUpcomingMoviesHook();
  const oldUpcoming = useOldUpcomingHook();

  useSEO({
    title: 'Xem Phim Miễn Phí - Phim Hay Cả Đảo',
    description: 'Đảo Phim - Xem phim online miễn phí chất lượng HD. Phim bộ, phim lẻ, hoạt hình, anime, phim chiếu rạp Vietsub, thuyết minh, lồng tiếng. Cập nhật liên tục mỗi ngày.',
    url: '/',
    type: 'website',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          movieApi.getNewUpdates(1),
          movieApi.getMoviesByType('phim-chieu-rap', 1, 20),
        ]);
        if (cancelled) return;
        const t10 = r1.items.slice(0, 10);
        setBannerMovies(t10);
        setTop10(t10);
        setTopTabMovies(t10);
        setCinema(r2.items);
        setNewUpdates(r1.items.slice(0, 30));
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
      const res = src === 'phim-moi'
        ? await movieApi.getNewUpdates(2)
        : await movieApi.getMoviesByType(src!, 1, 10);
      setTopTabMovies(res.items.slice(0, 10));
    } catch { setTopTabMovies(top10); }
    finally { setTopTabLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ paddingTop:'56px' }}>
        <div className="w-8 h-8 border-t-transparent rounded-full animate-spin border-green-500" style={{ borderWidth:3, borderStyle:'solid' }} />
      </div>
    );
  }

  return (
    <div className="pb-20 bg-slate-950 min-h-screen">
      <h1 className="sr-only">
        Đảo Phim - Xem Phim Online Miễn Phí HD Vietsub, Thuyết Minh, Lồng Tiếng
      </h1>
      <Banner movies={bannerMovies} />
      <ContinueWatchingSection />
      <LiveBanner />
      <AdBanner position="top" className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-3" />

      <main className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-6 flex flex-col gap-8">

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

        {/* Top 10 */}
        {top10.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth:'none' }}>
              {TOP_TABS.map((t,i) => (
                <button key={t} onClick={() => handleTopTab(i)}
                  className={cn('shrink-0 text-xs font-bold px-3.5 py-2 rounded-full border transition-all',
                    topTab===i ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                  {t}
                </button>
              ))}
            </div>
            <SecHeader title={TOP_TITLES[topTab]} to="/type/phim-moi" label="Xem tất cả" />
            {topTabLoading
              ? <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-green-400"/></div>
              : <HRow>{topTabMovies.map((m,i) => <Top10Card key={m._id} movie={m} rank={i+1}/>)}</HRow>
            }
          </section>
        )}

        {/* Phim Chiếu Rạp — load ngay */}
        {cinema.length > 0 && (
          <section>
            <SecHeader title="Phim Chiếu Rạp Mới" to="/type/phim-chieu-rap" label="Tất cả" />
            <HRow>{cinema.map(m => <MCard key={m._id} movie={m}/>)}</HRow>
          </section>
        )}

        {/* Phim Mới Cập Nhật — load ngay */}
        {(newUpdates.length > 0 || manualMovies.length > 0) && (
          <section>
            <SecHeader title="Phim Mới Cập Nhật" to="/type/phim-moi" label="Tất cả" />
            <HRow>
              {manualMovies.slice(0,4).map(m => <ManualMCard key={m.id} movie={m}/>)}
              {newUpdates.map(m => <MCard key={m._id} movie={m}/>)}
            </HRow>
          </section>
        )}

        {/* Phim Sắp Chiếu Rạp — từ collection riêng */}
        {upcomingMovies.filter(m => m.upcomingType === 'movie').length > 0 && (
          <section>
            <SecHeader title="Phim Sắp Chiếu Rạp" to="/type/phim-chieu-rap" label="Tất cả" />
            <HRow>
              {upcomingMovies
                .filter(m => m.upcomingType === 'movie')
                .map(m => <UpcomingNewCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* Anime Sắp Chiếu — từ collection riêng */}
        {upcomingMovies.filter(m => m.upcomingType === 'anime').length > 0 && (
          <section>
            <SecHeader title="Anime Sắp Chiếu" to="/type/hoat-hinh" label="Tất cả" />
            <HRow>
              {upcomingMovies
                .filter(m => m.upcomingType === 'anime')
                .map(m => <UpcomingNewCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* Phim Bộ Sắp Chiếu — từ collection riêng */}
        {upcomingMovies.filter(m => m.upcomingType === 'series').length > 0 && (
          <section>
            <SecHeader title="Phim Bộ Sắp Chiếu" to="/type/phim-bo" label="Tất cả" />
            <HRow>
              {upcomingMovies
                .filter(m => m.upcomingType === 'series')
                .map(m => <UpcomingNewCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* Fallback: sắp chiếu cũ từ manualMovies (isUpcoming=true) nếu chưa migrate */}
        {oldUpcoming.filter(m => m.upcomingType === 'anime' || !m.upcomingType).length > 0 && (
          <section>
            <SecHeader title="Anime Sắp Chiếu" to="/type/hoat-hinh" label="Tất cả" />
            <HRow>
              {oldUpcoming
                .filter(m => m.upcomingType === 'anime' || !m.upcomingType)
                .map(m => <UpcomingCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}
        {oldUpcoming.filter(m => m.upcomingType === 'movie').length > 0 && (
          <section>
            <SecHeader title="Phim Sắp Chiếu Rạp" to="/type/phim-chieu-rap" label="Tất cả" />
            <HRow>
              {oldUpcoming
                .filter(m => m.upcomingType === 'movie')
                .map(m => <UpcomingCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* Tất cả lazy sections từ KKPhim API */}
        {LAZY_SECTIONS.map(s => (
          <LazySection key={s.title} title={s.title} to={s.to} fetch={s.fetch} />
        ))}

      </main>
      <AdBanner position="bottom" className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-4" />
    </div>
  );
}
