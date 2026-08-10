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
import { subscribeBilingualMovies, bilingualToMovie, BilingualMovie } from '../lib/bilingualMovies';
import { cn } from '../lib/utils';
import { onAuthChange } from '../lib/auth';
import Banner from '../components/Banner';
import AdBanner from '../components/AdBanner';
import LiveBanner from '../components/LiveBanner';
import PosterImg from '../components/PosterImg';
import { RecentCommentsSection, TrendingMoviesSection, FavoriteMoviesSection, HotGenresSection } from '../components/CommunityWidgets';

/* ─── helpers ─────────────────────────────────────────────────── */
function dec(s: string) {
  return (s || '').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}
function stripHtml(s?: string) {
  if (!s) return '';
  return dec(s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
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
// Trả về TẤT CẢ badge ngôn ngữ+tập cùng lúc (vd: PĐ.4 + TM.4 + LT.4 nếu phim có đủ 3 bản)
function langEpBadgeList(movie: Movie): { label: string; color: string }[] {
  const ep = movie.episode_current || '';
  const c = ep.match(/hoàn tất\s*\((\d+)\/(\d+)\)/i);
  const n = ep.match(/tập\s*(\d+)/i);
  const epNum = c ? c[2] : n ? n[1] : null;
  const isFull = /^full$/i.test(ep.trim()) || /hoàn tất/i.test(ep);
  const l = (movie.lang || '').toLowerCase();
  const suffix = epNum ? `. ${epNum}` : isFull ? '. FULL' : '';
  const list: { label: string; color: string }[] = [];
  if (l.includes('vietsub') || l.includes('phụ đề')) list.push({ label: `PĐ${suffix}`, color: 'bg-pink-600' });
  if (l.includes('thuyết minh')) list.push({ label: `TM${suffix}`, color: 'bg-emerald-600' });
  if (l.includes('lồng tiếng')) list.push({ label: `LT${suffix}`, color: 'bg-blue-600' });
  return list;
}
// Badge gộp ngôn ngữ + số tập, kiểu "PĐ. 4" "TM. 4" "LT. 4" — hiện TẤT CẢ cùng lúc, góc dưới-trái poster
function LangEpBadge({ movie }: { movie: Movie }) {
  const list = langEpBadgeList(movie);
  if (!list.length) return null;
  return (
    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1 z-10">
      {list.map(b => (
        <span key={b.label} className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded-md leading-none ${b.color}`}>{b.label}</span>
      ))}
    </div>
  );
}

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
        <PosterImg src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} fallbackSrc={movie.poster_url||movie.thumb_url} alt={dec(movie.name)} movieSlug={movie.slug}
          loading="lazy" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
        {pinned && (
          <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-blue-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            📌 GHIM
          </div>
        )}
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
          ? <PosterImg src={movie.posterUrl} alt={movie.name} movieSlug={movie.slug} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
          <PosterImg src={movie.posterUrl} alt={movie.name} movieSlug={movie.slug} loading="lazy"
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
          <PosterImg src={movie.posterUrl} alt={movie.name} movieSlug={movie.slug} loading="lazy"
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
      <div className="relative rounded-2xl overflow-hidden bg-slate-800 shadow-lg" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <PosterImg src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} fallbackSrc={movie.poster_url||movie.thumb_url} alt={dec(movie.name)} movieSlug={movie.slug}
          loading="lazy" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <LangEpBadge movie={movie} />
      </div>
      {/* Số hạng + thông tin phim — nằm hẳn bên dưới poster, KHÔNG đè lên tiêu đề */}
      <div className="flex items-start gap-2 mt-2">
        <span
          className={cn('text-3xl md:text-4xl font-black leading-none shrink-0 select-none', rank<=3?'text-green-400':'text-slate-600')}
          style={{ fontStyle:'italic' }}
        >{rank}</span>
        <div className="min-w-0 pt-0.5">
          <div className="font-bold text-[13px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1 leading-snug">{dec(movie.name)}</div>
          {movie.origin_name && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name)}</div>}
          {(movie.year || movie.quality) && (
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
              {movie.year && <span>{movie.year}</span>}
              {movie.year && movie.quality && <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />}
              {movie.quality && <span>{movie.quality}</span>}
            </div>
          )}
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
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base md:text-lg font-black flex items-center gap-2.5 tracking-tight text-white">
        <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />{title}
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

/* ─── Thẻ lưới ngang 2 cột (poster 16:10, badge tập + ngôn ngữ, mô tả ngắn) ── */
function GridLandscapeCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group block min-w-0">
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '16/10' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <PosterImg src={movieApi.getImageUrl(movie.thumb_url || movie.poster_url)} fallbackSrc={movie.thumb_url || movie.poster_url} alt={dec(movie.name)} movieSlug={movie.slug}
          loading="lazy" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
        <EpBadge ep={movie.episode_current} />
        <LangEpBadge movie={movie} />
      </div>
      <div className="mt-2 min-w-0">
        <div className="font-bold text-[13px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{dec(movie.name)}</div>
        <div className="text-[11px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name) || (movie.year ? String(movie.year) : '')}</div>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-slate-800/50 animate-pulse" style={{ aspectRatio: '16/10' }} />
      ))}
    </div>
  );
}

/* ─── LazySection — scroll trigger, 500ms delay, KHÔNG bị đen ── */
function LazySection({ title, to, fetch: fetchFn, label, variant = 'row' }: {
  title: string; to: string; label?: string;
  fetch: () => Promise<Movie[]>;
  variant?: 'row' | 'grid';
}) {
  const [movies, setMovies] = useState<Movie[] | null>(null); // null = chưa fetch xong
  const [retried, setRetried] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const runFetch = React.useCallback(() => {
    fetchFn()
      .then(data => setMovies(data))
      .catch(() => setMovies([]));
  }, [fetchFn]);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      obs.disconnect();
      // Delay 500ms trước khi fetch để tránh quá nhiều request đồng thời
      setTimeout(runFetch, 500);
    }, { rootMargin: '400px' }); // Trigger sớm khi còn cách 400px
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nếu tải xong mà rỗng (0 phim) — có thể do lỗi mạng thoáng qua, tự thử lại 1 lần sau 2s
  useEffect(() => {
    if (movies !== null && movies.length === 0 && !retried) {
      const t = setTimeout(() => { setRetried(true); runFetch(); }, 2000);
      return () => clearTimeout(t);
    }
  }, [movies, retried, runFetch]);

  // Đã tải xong, thử lại rồi mà vẫn rỗng thật → ẩn hẳn mục này, không hiện skeleton giả mãi mãi
  if (movies !== null && movies.length === 0 && retried) return null;

  return (
    // min-height cố định → layout KHÔNG bao giờ collapse → không bị đen
    <section ref={ref} style={{ minHeight: SKELETON_H + 60 }}>
      <SecHeader title={title} to={to} label={label} />
      {variant === 'grid' ? (
        movies && movies.length > 0
          ? <div className="grid grid-cols-2 gap-x-3 gap-y-4">{movies.slice(0, 4).map(m => <GridLandscapeCard key={m._id} movie={m} />)}</div>
          : <GridSkeleton />
      ) : (
        movies && movies.length > 0
          ? <HRow>{movies.map(m => <MCard key={m._id} movie={m} />)}</HRow>
          : <SkeletonRow />
      )}
    </section>
  );
}

/* ─── Interest cards ──────────────────────────────────────────── */
const INTEREST = [
  { label:'TV Trực Tuyến', sub:'Xem Ngay', to:'/tv-truc-tuyen', g:'from-red-600/70 via-orange-500/60 to-yellow-400/50' },
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
  { title:'Phim Hàn Quốc',    to:'/type/phim-bo?country=han-quoc',   fetch: () => movieApi.filterMovies({ type:'phim-bo', country:'han-quoc', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Trung Quốc',  to:'/type/phim-bo?country=trung-quoc', fetch: () => movieApi.filterMovies({ type:'phim-bo', country:'trung-quoc', page:1, limit:24 }).then(r=>r.items), variant:'grid' as const },
  { title:'Phim Hành Động',   to:'/type/phim-le?category=hanh-dong', fetch: () => movieApi.filterMovies({ type:'phim-le', category:'hanh-dong', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Bộ Đang Chiếu',to:'/type/phim-bo',      fetch: () => movieApi.getMoviesByType('phim-bo',1,24).then(r=>r.items) },
  { title:'Phim Lẻ Mới',      to:'/type/phim-le',       fetch: () => movieApi.getMoviesByType('phim-le',1,24).then(r=>r.items) },
  { title:'Phim Hoạt Hình',   to:'/type/hoat-hinh',     fetch: () => movieApi.getMoviesByType('hoat-hinh',1,24).then(r=>r.items) },
  { title:'Tâm Lý - Tình Cảm',to:'/type/phim-bo?category=tinh-cam',  fetch: () => movieApi.filterMovies({ type:'phim-bo', category:'tinh-cam', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Kinh Dị',     to:'/type/phim-le?category=kinh-di',   fetch: () => movieApi.filterMovies({ type:'phim-le', category:'kinh-di', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Âu Mỹ',       to:'/type/phim-le?country=au-my',      fetch: () => movieApi.filterMovies({ type:'phim-le', country:'au-my', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Nhật Bản',    to:'/type/phim-bo?country=nhat-ban',   fetch: () => movieApi.filterMovies({ type:'phim-bo', country:'nhat-ban', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Thái Lan',    to:'/type/phim-bo?country=thai-lan',   fetch: () => movieApi.filterMovies({ type:'phim-bo', country:'thai-lan', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Viễn Tưởng',  to:'/type/phim-le?category=vien-tuong',fetch: () => movieApi.filterMovies({ type:'phim-le', category:'vien-tuong', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Hài Hước',    to:'/type/phim-le?category=hai-huoc',  fetch: () => movieApi.filterMovies({ type:'phim-le', category:'hai-huoc', page:1, limit:24 }).then(r=>r.items) },
  { title:'TV Shows',          to:'/type/tv-shows',      fetch: () => movieApi.getMoviesByType('tv-shows',1,24).then(r=>r.items) },
  { title:'Phim Hoạt Hình Nhiều Người Xem',to:'/type/hoat-hinh',fetch: () => movieApi.getMoviesByType('hoat-hinh',2,24).then(r=>r.items) },
  { title:'Phim Cổ Trang',    to:'/type/phim-bo?category=co-trang',  fetch: () => movieApi.filterMovies({ type:'phim-bo', category:'co-trang', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Hình Sự',     to:'/type/phim-le?category=hinh-su',   fetch: () => movieApi.filterMovies({ type:'phim-le', category:'hinh-su', page:1, limit:24 }).then(r=>r.items) },
];

/* ─── Nguồn dữ liệu cho 2 mục "thẻ lớn" mới: Hoạt Hình Trung Quốc & Hàn Đỉnh Cao ─── */
const FEATURED_GRID_SECTIONS = [
  { title:'Hoạt Hình Trung Quốc', to:'/type/hoat-hinh?country=trung-quoc', fetch: () => movieApi.filterMovies({ type:'hoat-hinh', country:'trung-quoc', page:1, limit:8 }).then(r=>r.items) },
  { title:'Phim Hàn Đỉnh Cao',    to:'/type/phim-bo?country=han-quoc',     fetch: () => movieApi.filterMovies({ type:'phim-bo', country:'han-quoc', sort:'view', page:1, limit:8 }).then(r=>r.items) },
];

/* ─── "Phim Mới" — carousel nổi bật dạng thẻ bo góc + chấm phân trang ─── */
function NewMovieSpotlight({ movies }: { movies: Movie[] }) {
  const [idx, setIdx] = useState(0);
  const [detailMap, setDetailMap] = useState<Record<string, Movie>>({});
  const list = movies.slice(0, 8);

  // ── Vuốt (touch) / kéo chuột (mouse) để chuyển slide ─────────────
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);
  const dragged = useRef(false);

  const goNext = useCallback(() => setIdx(i => (i + 1) % Math.max(list.length, 1)), [list.length]);
  const goPrev = useCallback(() => setIdx(i => (i - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1)), [list.length]);

  const dragStart = (x: number) => { dragStartX.current = x; dragDeltaX.current = 0; dragged.current = false; };
  const dragMove = (x: number) => {
    if (dragStartX.current == null) return;
    dragDeltaX.current = x - dragStartX.current;
    if (Math.abs(dragDeltaX.current) > 8) dragged.current = true;
  };
  const dragEnd = () => {
    const dx = dragDeltaX.current;
    dragStartX.current = null;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
  };
  // Chặn click điều hướng (Link) nếu vừa mới kéo/vuốt (tránh mở nhầm phim khi lướt)
  const guardClick = (e: React.MouseEvent) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); } };

  useEffect(() => {
    const missing = list.filter(m => !detailMap[m.slug]);
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(m => movieApi.getMovieDetail(m.slug).then(r => ({ slug: m.slug, movie: r?.movie })).catch(() => null)))
      .then(results => {
        if (cancelled) return;
        setDetailMap(prev => {
          const next = { ...prev };
          results.forEach(r => { if (r?.movie) next[r.slug] = r.movie; });
          return next;
        });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  useEffect(() => {
    if (!list.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), 7000);
    return () => clearInterval(t);
  }, [list.length]);

  if (!list.length) return null;
  const base = list[idx];
  const movie = detailMap[base.slug] || base;
  const synopsis = stripHtml(movie.content);

  return (
    <section>
      <SecHeader title="Phim Mới" to="/type/phim-moi" label="Xem thêm" />
      <div
        className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 select-none"
        onTouchStart={e => dragStart(e.touches[0].clientX)}
        onTouchMove={e => dragMove(e.touches[0].clientX)}
        onTouchEnd={dragEnd}
        onMouseDown={e => dragStart(e.clientX)}
        onMouseMove={e => { if (dragStartX.current != null) dragMove(e.clientX); }}
        onMouseUp={dragEnd}
        onMouseLeave={() => { if (dragStartX.current != null) dragEnd(); }}
      >
        <Link to={`/phim/${movie.slug}`} onClick={guardClick} onClickCapture={guardClick} className="block relative" style={{ aspectRatio: '16/9' }} draggable={false}>
          <PosterImg src={movieApi.getImageUrl(movie.thumb_url || movie.poster_url)} fallbackSrc={movie.thumb_url || movie.poster_url} alt={dec(movie.name)} movieSlug={movie.slug}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/10 to-transparent" />
          <EpBadge ep={movie.episode_current} />
        </Link>
        {/* Mũi tên điều hướng — chỉ hiện trên PC (hover), mobile dùng vuốt */}
        {list.length > 1 && (
          <>
            <button onClick={goPrev} aria-label="Phim trước"
              className="hidden md:flex absolute left-2 top-[38%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-950/90 border border-slate-700 text-white items-center justify-center transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goNext} aria-label="Phim tiếp theo"
              className="hidden md:flex absolute right-2 top-[38%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-950/90 border border-slate-700 text-white items-center justify-center transition-colors">
              <ChevronRight size={18} />
            </button>
          </>
        )}
        <div className="p-4">
          <h3 className="text-lg md:text-xl font-black text-white line-clamp-1">{dec(movie.name)}</h3>
          {movie.origin_name && <p className="text-orange-400 text-xs md:text-sm font-bold mt-0.5 line-clamp-1">{dec(movie.origin_name)}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {movie.quality && <span className="text-[10px] font-black bg-teal-400 text-slate-950 px-2 py-0.5 rounded-md">{movie.quality}</span>}
            {movie.year && <span className="text-[10px] font-bold border border-slate-600 text-slate-300 px-2 py-0.5 rounded-md">{movie.year}</span>}
            {movie.time && <span className="text-[10px] font-bold border border-slate-600 text-slate-300 px-2 py-0.5 rounded-md">{dec(movie.time)}</span>}
          </div>
          {synopsis && <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mt-2.5">{synopsis}</p>}
          <div className="flex justify-center gap-1.5 mt-4">
            {list.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
                className={cn('h-1.5 rounded-full transition-all', i === idx ? 'w-6 bg-orange-400' : 'w-1.5 bg-slate-700 hover:bg-slate-600')} />
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

/* ─── "Phim Song Ngữ" — banner gradient + hàng thẻ nghiêng, lọc theo dữ liệu thật ── */
function BilingualCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign: 'start' }}>
      <div className="relative rounded-lg overflow-hidden bg-slate-800 transition-transform duration-300 group-hover:-translate-y-1" style={{ aspectRatio: '2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <PosterImg src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)} fallbackSrc={movie.poster_url || movie.thumb_url} alt={dec(movie.name)} movieSlug={movie.slug}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <span className="absolute top-1.5 left-1.5 right-1.5 text-center text-[8px] font-black bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white px-1 py-0.5 rounded leading-none">
          SONG NGỮ
        </span>
        <LangEpBadge movie={movie} />
      </div>
      <div className="mt-1.5">
        <div className="font-semibold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{dec(movie.name)}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name)}</div>
      </div>
    </Link>
  );
}

function BilingualSection({ movies }: { movies: Movie[] }) {
  // Danh sách này do admin tự tìm & thêm tay ở trang Admin (mục "Phim Song Ngữ"),
  // không lọc tự động theo movie.lang nữa.
  if (!movies.length) return null;
  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800/80 p-4 md:p-6">
      <h2 className="text-lg md:text-2xl font-black text-white leading-tight">
        Phim Song Ngữ <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">luyện nghe mượt hơn</span>
      </h2>
      <p className="text-slate-400 text-[11px] md:text-sm mt-1.5 max-w-xl">
        Tuyển chọn những phim có phụ đề + thuyết minh/lồng tiếng — dễ theo dõi, hợp để vừa giải trí vừa luyện nghe.
      </p>
      <Link to="/type/phim-bo" className="inline-flex items-center gap-1 bg-white text-slate-900 font-bold text-xs px-4 py-2 rounded-full mt-3.5">
        Xem tất cả <ChevronRight size={13} />
      </Link>
      <div className="mt-4">
        <HRow>{movies.map(m => <BilingualCard key={m._id} movie={m} />)}</HRow>
      </div>
    </section>
  );
}

/* ─── "Phim Việt Mới Nhất" — mọi thẻ đều là banner ngang, poster nhỏ chồng góc dưới-trái ── */
function VietBannerCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 md:shrink-0 block w-[min(78vw,360px)] md:w-full" style={{ scrollSnapAlign: 'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <PosterImg src={movieApi.getImageUrl(movie.thumb_url || movie.poster_url)} fallbackSrc={movie.thumb_url || movie.poster_url} alt={dec(movie.name)} movieSlug={movie.slug}
          loading="lazy" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 500ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
        <EpBadge ep={movie.episode_current} />
        {/* Poster nhỏ chồng lên góc dưới-trái, xoay nhẹ — hiệu ứng "xếp chồng ảnh" */}
        <PosterImg src={movieApi.getImageUrl(movie.poster_url)} fallbackSrc={movie.poster_url} alt=""
          className="absolute -bottom-3 left-2.5 w-11 h-16 rounded-md object-cover border-2 border-slate-950 shadow-lg -rotate-6 group-hover:rotate-0 transition-transform duration-300 z-10" />
      </div>
      <div className="mt-3.5 pl-1">
        <div className="font-black text-white text-sm line-clamp-1 group-hover:text-green-400 transition-colors">{dec(movie.name)}</div>
        {movie.origin_name && <div className="text-green-400 text-[11px] font-semibold line-clamp-1 mt-0.5">{dec(movie.origin_name)}</div>}
        <div className="text-slate-500 text-[10px] mt-1 truncate">
          {[movie.episode_current, movie.year, movie.time].filter(Boolean).map(v => dec(String(v))).join(' • ')}
        </div>
      </div>
    </Link>
  );
}

function VietFeaturedSection({ movies }: { movies: Movie[] }) {
  if (!movies.length) return null;
  return (
    <section>
      <SecHeader title="Phim Việt Mới Nhất" to="/type/phim-bo?country=viet-nam" label="Xem tất cả" />
      {/* Mobile: cuộn ngang. Desktop: lưới 2 cột thẳng hàng, thẻ to hơn rõ rệt */}
      <div className="flex gap-4 overflow-x-auto -mx-4 md:mx-0 md:overflow-visible px-4 md:px-0 pb-1 md:grid md:grid-cols-2 md:gap-5"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {movies.slice(0, 10).map(m => <VietBannerCard key={m._id} movie={m} />)}
      </div>
    </section>
  );
}

/* ─── "Thẻ lớn" dùng chung cho các mục nổi bật theo quốc gia (Hoạt Hình Trung Quốc, Hàn Đỉnh Cao...) ── */
function FeaturedGridSection({ title, to, fetch: fetchFn }: { title: string; to: string; fetch: () => Promise<Movie[]> }) {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      obs.disconnect();
      setTimeout(() => { fetchFn().then(setMovies).catch(() => setMovies([])); }, 500);
    }, { rootMargin: '400px' });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (movies && movies.length === 0) return null;

  return (
    <section ref={ref} style={{ minHeight: 220 }}>
      <SecHeader title={title} to={to} label="Xem tất cả" />
      {movies === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-800/50 animate-pulse" style={{ aspectRatio: '16/9' }} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto -mx-4 md:mx-0 md:overflow-visible px-4 md:px-0 pb-1 md:grid md:grid-cols-2 md:gap-5"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {movies.slice(0, 8).map(m => <VietBannerCard key={m._id} movie={m} />)}
        </div>
      )}
    </section>
  );
}

/* ─── "Lịch Chiếu" — tab theo ngày trong tuần + đếm ngược, dữ liệu từ Phim Sắp Chiếu (Admin) ── */
const WEEKDAY_LABELS = ['CHỦ NHẬT','THỨ 2','THỨ 3','THỨ 4','THỨ 5','THỨ 6','THỨ 7'];

function useCountdownToMidnight() {
  const [left, setLeft] = useState(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(24,0,0,0);
    return Math.max(0, end.getTime() - now.getTime());
  });
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      const end = new Date(now); end.setHours(24,0,0,0);
      setLeft(Math.max(0, end.getTime() - now.getTime()));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(left / 3600000)).padStart(2,'0');
  const m = String(Math.floor((left % 3600000) / 60000)).padStart(2,'0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function ScheduleSection({ upcomingMovies }: { upcomingMovies: UpcomingMovie[] }) {
  const days = React.useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = -2; i <= 4; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);
  const [selected, setSelected] = useState(2); // index của "hôm nay" trong mảng days (i=0)
  const countdown = useCountdownToMidnight();

  const selDate = days[selected];
  const selKey = `${selDate.getDate()}/${selDate.getMonth() + 1}/${selDate.getFullYear()}`;
  const isToday = selDate.toDateString() === new Date().toDateString();

  const moviesToday = upcomingMovies.filter(m => {
    const parts = (m.releaseDate || '').split('/').map(v => parseInt(v, 10));
    if (parts.length !== 3) return false;
    const [d, mo, y] = parts;
    return d === selDate.getDate() && mo === selDate.getMonth() + 1 && y === selDate.getFullYear();
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base md:text-lg font-black flex items-center gap-2.5 tracking-tight text-white">
          <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />Lịch Chiếu
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-400 bg-slate-900/70 border border-slate-800 px-2.5 py-1 rounded-full">
          <Clock size={11} /> Cập nhật sau {countdown}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {days.map((d, i) => {
          const active = i === selected;
          const today = d.toDateString() === new Date().toDateString();
          return (
            <button key={i} onClick={() => setSelected(i)}
              className={cn('shrink-0 flex flex-col items-center justify-center rounded-xl px-3.5 py-2 border transition-all min-w-[74px]',
                active ? 'bg-green-500 border-green-500 text-slate-950' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600')}>
              <span className="text-[10px] font-black tracking-wide">{today ? 'HÔM NAY' : WEEKDAY_LABELS[d.getDay()]}</span>
              <span className="text-[11px] font-semibold mt-0.5">{String(d.getDate()).padStart(2,'0')} thg {d.getMonth()+1}</span>
            </button>
          );
        })}
      </div>

      {moviesToday.length > 0 ? (
        <HRow>{moviesToday.map(m => <UpcomingNewCard key={m.id} movie={m} />)}</HRow>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl bg-slate-900/50 border border-slate-800/60">
          <Calendar size={26} className="text-slate-600" />
          <p className="text-slate-500 text-sm font-semibold">
            {isToday ? 'Chưa có lịch cho ngày' : 'Chưa có lịch cho ngày'} {selKey}.
          </p>
        </div>
      )}
    </section>
  );
}


export default function Home() {
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([]);
  const [top10, setTop10] = useState<Movie[]>([]);
  const [topTabMovies, setTopTabMovies] = useState<Movie[]>([]);
  const [topTabLoading, setTopTabLoading] = useState(false);
  const [topTab, setTopTab] = useState(0);
  const [cinema, setCinema] = useState<Movie[]>([]);
  const [newUpdates, setNewUpdates] = useState<Movie[]>([]);
  const [vietMovies, setVietMovies] = useState<Movie[]>([]);
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

  // Phim Song Ngữ - admin tự tìm & thêm tay ở trang Admin
  const [bilingualMovies, setBilingualMovies] = useState<BilingualMovie[]>([]);
  useEffect(() => {
    const unsub = subscribeBilingualMovies(setBilingualMovies);
    return unsub;
  }, []);

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
        const [r1, r2, r3] = await Promise.all([
          movieApi.getNewUpdates(1),
          movieApi.getMoviesByType('phim-chieu-rap', 1, 20),
          movieApi.filterMovies({ type: 'phim-bo', country: 'viet-nam', page: 1, limit: 12 }),
        ]);
        if (cancelled) return;
        const t10 = r1.items.slice(0, 10);
        setBannerMovies(t10);
        setTop10(t10);
        setTopTabMovies(t10);
        setCinema(r2.items);
        setNewUpdates(r1.items.slice(0, 30));
        setVietMovies(r3.items);
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
        Đảo Phim - Xem Phim Online Miễn Phí Full HD Vietsub, Thuyết Minh, Lồng Tiếng, Không Quảng Cáo
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

        {/* Phim Mới — carousel nổi bật, chấm phân trang */}
        <NewMovieSpotlight movies={top10} />

        {/* Phim Chiếu Rạp — load ngay */}
        {cinema.length > 0 && (
          <section>
            <SecHeader title="Phim Chiếu Rạp Mới" to="/type/phim-chieu-rap" label="Tất cả" />
            <HRow>{cinema.map(m => <MCard key={m._id} movie={m}/>)}</HRow>
          </section>
        )}

        {/* Phim Việt Mới Nhất — thẻ lớn nổi bật */}
        <VietFeaturedSection movies={vietMovies} />

        {/* Hoạt Hình Trung Quốc & Phim Hàn Đỉnh Cao — thẻ lớn nổi bật theo quốc gia */}
        {FEATURED_GRID_SECTIONS.map(s => (
          <FeaturedGridSection key={s.title} title={s.title} to={s.to} fetch={s.fetch} />
        ))}

        {/* Lịch chiếu phim theo ngày */}
        <ScheduleSection upcomingMovies={upcomingMovies} />

        {/* Cộng đồng — bình luận mới nhất & 3 cột xếp hạng (sôi nổi / yêu thích / thể loại hot) */}
        <RecentCommentsSection />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <TrendingMoviesSection />
          <FavoriteMoviesSection />
          <HotGenresSection />
        </div>

        {/* Phim Mới Cập Nhật — đánh số thứ hạng (phim ghim của admin luôn hiện đầu tiên) */}
        {(newUpdates.length > 0 || manualMovies.length > 0 || pinnedMovies.length > 0) && (
          <section>
            <SecHeader title="Mới Cập Nhật" to="/type/phim-moi" label="Tất cả" />
            <HRow>
              {pinnedMovies.map((p, i) => <Top10Card key={p.slug} movie={pinnedToMovie(p)} rank={i + 1} />)}
              {manualMovies.slice(0,4).map((m, i) => <ManualMCard key={m.id} movie={m}/>)}
              {newUpdates
                .filter(m => !pinnedMovies.some(p => p.slug === m.slug))
                .map((m, i) => <Top10Card key={m._id} movie={m} rank={pinnedMovies.length + i + 1} />)}
            </HRow>
          </section>
        )}

        {/* Phim Song Ngữ — banner gradient, danh sách do admin tự thêm */}
        <BilingualSection movies={bilingualMovies.map(bilingualToMovie)} />

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
          <LazySection key={s.title} title={s.title} to={s.to} fetch={s.fetch} variant={(s as any).variant} />
        ))}

      </main>
      <AdBanner position="bottom" className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-4" />
    </div>
  );
}
