import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2, Calendar, Play } from 'lucide-react';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import { useManualMovies, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeUpcomingMovies as subscribeOldUpcoming } from '../lib/manualMovies';
import { subscribeUpcomingMovies, UpcomingMovie } from '../lib/upcomingMovies';
import { cn } from '../lib/utils';
import Banner from '../components/Banner';
import AdBanner from '../components/AdBanner';

function dec(s: string) {
  return (s || '').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

/* ─── Lang/Ep badges ─────────────────────────────────────────── */
function EpBadge({ ep }: { ep?: string }) {
  if (!ep) return null;
  const c = ep.match(/hoàn tất\s*\((\d+)\/(\d+)\)/i);
  const n = ep.match(/tập\s*(\d+)/i);
  const label = c ? `HT (${c[1]}/${c[2]})` : n ? `Tập ${n[1]}` : /^full$/i.test(ep.trim()) ? 'FULL' : /hoàn tất/i.test(ep) ? 'FULL' : '';
  if (!label) return null;
  return <span className="absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-black/75 text-white z-10 leading-none backdrop-blur-sm">{label}</span>;
}
function LangBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  const l = lang.toLowerCase();
  const label = l.includes('vietsub')||l.includes('phụ đề') ? 'P.Đề' : l.includes('thuyết minh') ? 'T.Minh' : l.includes('lồng tiếng') ? 'L.Tiếng' : null;
  if (!label) return null;
  const color = label==='P.Đề' ? 'bg-red-500' : label==='T.Minh' ? 'bg-blue-500' : 'bg-green-600';
  return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md text-white leading-none ${color}`}>{label}</span>;
}
function EpCountBadge({ ep }: { ep?: string }) {
  if (!ep) return null;
  const n = ep.match(/tập\s*(\d+)/i);
  const ht = ep.match(/hoàn tất\s*\((\d+)/i);
  const num = ht ? ht[1] : n ? n[1] : null;
  if (!num) return null;
  return <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-700/90 text-slate-200 leading-none">LT. {num}</span>;
}

/* ─── Card size ──────────────────────────────────────────────── */
const CW = 'clamp(108px,29vw,148px)';
const CW_WIDE = 'clamp(160px,44vw,220px)'; // for cinema/2-col style
const SKELETON_H = 200;

/* ─── Standard Movie Card (portrait 2:3) ────────────────────── */
function MCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800/80" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <EpBadge ep={movie.episode_current} />
        <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5">
          <LangBadge lang={movie.lang} />
          <EpCountBadge ep={movie.episode_current} />
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-bold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1 leading-snug">{dec(movie.name)}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name)}</div>
      </div>
    </Link>
  );
}

/* ─── Wide Card (16:9 thumb) — for cinema 2-col ─────────────── */
function WideCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: CW_WIDE, scrollSnapAlign:'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio:'16/9' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.thumb_url||movie.poster_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-1.5 right-1.5">
          {movie.quality && <span className="text-[8px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-md">{movie.quality}</span>}
        </div>
        <div className="absolute bottom-1.5 left-1.5">
          <LangBadge lang={movie.lang} />
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-bold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1 leading-snug">{dec(movie.name)}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name)}</div>
      </div>
    </Link>
  );
}

/* ─── Manual Movie Card ──────────────────────────────────────── */
function ManualMCard({ movie }: { movie: ManualMovie }) {
  return (
    <Link to={`/manual/${movie.id}`} className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        {movie.posterUrl
          ? <img src={movie.posterUrl} alt={movie.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-800">🎬</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-bold text-[12px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName}</div>
      </div>
    </Link>
  );
}

/* ─── Upcoming Card ──────────────────────────────────────────── */
function UpcomingNewCard({ movie }: { movie: UpcomingMovie }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="group shrink-0 block" style={{ width: CW_WIDE, scrollSnapAlign:'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio:'16/9' }}>
        <div className="absolute inset-0 bg-slate-800" />
        {movie.posterUrl && (
          <img src={movie.posterUrl} alt={movie.name} loading="lazy" referrerPolicy="no-referrer"
            onLoad={() => setOk(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2">
          <span className="text-[9px] font-black bg-slate-800/90 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Sắp chiếu</span>
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-bold text-[12px] text-slate-100 line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName}</div>
      </div>
    </div>
  );
}

function UpcomingCard({ movie }: { movie: ManualMovie }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="group shrink-0 block" style={{ width: CW, scrollSnapAlign:'start' }}>
      <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio:'2/3' }}>
        <div className="absolute inset-0 bg-slate-800" />
        {movie.posterUrl && (
          <img src={movie.posterUrl} alt={movie.name} loading="lazy" referrerPolicy="no-referrer"
            onLoad={() => setOk(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          {movie.releaseDate && (
            <span className="text-[8px] font-black bg-green-500/90 text-white px-1.5 py-0.5 rounded-md">{movie.releaseDate}</span>
          )}
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <div className="font-bold text-[12px] text-slate-100 line-clamp-1">{movie.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{movie.originName || movie.year}</div>
      </div>
    </div>
  );
}

/* ─── Top 10 Card — BIG fullwidth như CôBePhim ──────────────── */
function Top10Card({ movie, rank }: { movie: Movie; rank: number }) {
  const [ok, setOk] = useState(false);
  // Width: 80vw max 340px — single big card shown in scroll
  const w = 'clamp(240px,75vw,340px)';
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width: w, scrollSnapAlign:'start' }}>
      <div className="relative rounded-2xl overflow-hidden bg-slate-800" style={{ aspectRatio:'3/4' }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.poster_url||movie.thumb_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Lang badges bottom-left */}
        <div className="absolute bottom-3 left-3 flex gap-1">
          <LangBadge lang={movie.lang} />
          <EpCountBadge ep={movie.episode_current} />
        </div>
      </div>
      {/* Rank + title below card */}
      <div className="flex items-start gap-2 mt-2 px-0.5">
        <span className={cn('text-4xl font-black leading-none shrink-0 mt-0.5', rank<=3?'text-slate-300':rank<=6?'text-slate-500':'text-slate-700')}
          style={{ fontStyle:'italic', fontFamily:'Georgia, serif' }}>
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-2 leading-snug">{dec(movie.name)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{dec(movie.origin_name)}</div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Anime Big Card — fullwidth info card như CôBePhim ─────── */
function AnimeBigCard({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link to={`/phim/${movie.slug}`} className="group shrink-0 block" style={{ width:'clamp(280px,85vw,420px)', scrollSnapAlign:'start' }}>
      <div className="relative rounded-2xl overflow-hidden bg-slate-800" style={{ minHeight:220 }}>
        <div className="absolute inset-0 bg-slate-800" />
        <img src={movieApi.getImageUrl(movie.thumb_url||movie.poster_url)} alt={dec(movie.name)}
          loading="lazy" referrerPolicy="no-referrer" onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }} />
        {/* dark overlay for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent" />
        {/* Content inside card */}
        <div className="relative z-10 p-4 flex flex-col justify-end" style={{ minHeight:220 }}>
          <h3 className="text-base font-black text-white leading-snug line-clamp-2">{dec(movie.name)}</h3>
          {movie.origin_name && <p className="text-green-400 text-xs font-semibold mt-0.5">{dec(movie.origin_name)}</p>}
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {movie.year && <span className="text-[10px] font-bold border border-slate-600 text-slate-300 px-2 py-0.5 rounded-full">{movie.year}</span>}
            {movie.episode_current && <span className="text-[10px] font-bold border border-slate-600 text-slate-300 px-2 py-0.5 rounded-full">{dec(movie.episode_current)}</span>}
            {movie.category?.slice(0,2).map((c: any) => (
              <span key={c.id} className="text-[10px] font-semibold bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-full">{c.name}</span>
            ))}
          </div>
          {/* Short desc */}
          {movie.content && (
            <p className="text-slate-400 text-[11px] mt-2 line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: movie.content.replace(/<[^>]*>/g,'').slice(0,120)+'...' }} />
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── HRow ───────────────────────────────────────────────────── */
function HRow({ children, gap = 'gap-2.5' }: { children: React.ReactNode; gap?: string }) {
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
      {canL && <button onClick={() => scroll('left')} className="hidden md:flex absolute left-0 top-[38%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-900/95 border border-slate-700 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-green-500 hover:border-green-500 shadow-xl -translate-x-1/2"><ChevronLeft size={15}/></button>}
      <div ref={ref} className={cn('flex overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0', gap)}
        style={{ scrollSnapType:'x mandatory', scrollbarWidth:'none', msOverflowStyle:'none', WebkitOverflowScrolling:'touch' }}>
        {children}
      </div>
      {canR && <button onClick={() => scroll('right')} className="hidden md:flex absolute right-0 top-[38%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-900/95 border border-slate-700 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-green-500 hover:border-green-500 shadow-xl translate-x-1/2"><ChevronRight size={15}/></button>}
    </div>
  );
}

/* ─── Section Header — CôBePhim style: big bold, arrow circle ── */
function SecHeader({ title, to, color }: { title: string; to?: string; color?: string }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-2">
      <h2 className={cn('text-[17px] font-black leading-tight', color || 'text-white')} style={{ maxWidth:'calc(100% - 48px)' }}>
        {title}
      </h2>
      {to && (
        <Link to={to} className="shrink-0 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:border-green-500/60 transition-all">
          <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex gap-2.5 overflow-hidden">
      {Array.from({length:6}).map((_,i) => (
        <div key={i} className="shrink-0 rounded-xl bg-slate-800/50 animate-pulse"
          style={{ width: CW, height: SKELETON_H }} />
      ))}
    </div>
  );
}

/* ─── LazySection ────────────────────────────────────────────── */
function LazySection({ title, to, fetch: fetchFn, color }: {
  title: string; to: string; color?: string;
  fetch: () => Promise<Movie[]>;
}) {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      obs.disconnect();
      setTimeout(() => {
        fetchFn().then(data => setMovies(data)).catch(() => setMovies([]));
      }, 300);
    }, { rootMargin: '500px' });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ minHeight: SKELETON_H + 56 }}>
      <SecHeader title={title} to={to} color={color} />
      {movies && movies.length > 0
        ? <HRow>{movies.map(m => <MCard key={m._id} movie={m} />)}</HRow>
        : <SkeletonRow />
      }
    </section>
  );
}

/* ─── Interest chips — "Bạn đang quan tâm gì?" ──────────────── */
const INTEREST = [
  { label:'Top ImDb',   to:'/search?q=imdb',       g:'from-green-500 to-emerald-400' },
  { label:'Thuyết Minh',to:'/search?q=thuyết minh',g:'from-teal-500 to-cyan-400' },
  { label:'Phim 4K',    to:'/search?q=4k',          g:'from-purple-500 to-pink-400' },
  { label:'Anime Hot',  to:'/type/hoat-hinh',        g:'from-pink-500 to-rose-400' },
  { label:'Phim Lẻ',   to:'/type/phim-le',           g:'from-blue-500 to-indigo-400' },
  { label:'TV Shows',   to:'/type/tv-shows',          g:'from-green-500 to-emerald-400' },
];

/* ─── Colored section titles like CôBePhim ──────────────────── */
const LAZY_SECTIONS = [
  { title:'Phim Hàn Quốc mới',    to:'/type/phim-bo',    color:'text-orange-300',  fetch: () => movieApi.searchMovies('hàn quốc',1,24).then(r=>r.items) },
  { title:'Phim Trung Quốc mới',  to:'/type/phim-bo',    color:'text-pink-400',    fetch: () => movieApi.searchMovies('trung quốc',1,24).then(r=>r.items) },
  { title:'Phim US-UK mới',        to:'/type/phim-le',    color:'text-pink-400',    fetch: () => movieApi.filterMovies({ type:'phim-le', country:'au-my', page:1, limit:24 }).then(r=>r.items) },
  { title:'Phim Hành Động',        to:'/type/phim-le',    color:'text-white',       fetch: () => movieApi.searchMovies('hành động',1,24).then(r=>r.items) },
  { title:'Phim Bộ Đang Chiếu',   to:'/type/phim-bo',    color:'text-white',       fetch: () => movieApi.getMoviesByType('phim-bo',1,24).then(r=>r.items) },
  { title:'Phim Lẻ Mới',           to:'/type/phim-le',    color:'text-white',       fetch: () => movieApi.getMoviesByType('phim-le',1,24).then(r=>r.items) },
  { title:'Tâm Lý - Tình Cảm',    to:'/type/phim-bo',    color:'text-rose-300',    fetch: () => movieApi.searchMovies('tình cảm',1,24).then(r=>r.items) },
  { title:'Phim Kinh Dị',          to:'/type/phim-le',    color:'text-white',       fetch: () => movieApi.searchMovies('kinh dị',1,24).then(r=>r.items) },
  { title:'Phim Nhật Bản',         to:'/type/phim-bo',    color:'text-white',       fetch: () => movieApi.searchMovies('nhật bản',1,24).then(r=>r.items) },
  { title:'Phim Thái Lan',         to:'/type/phim-bo',    color:'text-white',       fetch: () => movieApi.searchMovies('thái lan',1,24).then(r=>r.items) },
  { title:'Phim Hài Hước',         to:'/type/phim-le',    color:'text-white',       fetch: () => movieApi.searchMovies('hài hước',1,24).then(r=>r.items) },
  { title:'Phim Việt Nam',         to:'/type/phim-bo',    color:'text-yellow-300',  fetch: () => movieApi.searchMovies('việt nam',1,24).then(r=>r.items) },
  { title:'TV Shows',               to:'/type/tv-shows',   color:'text-white',       fetch: () => movieApi.getMoviesByType('tv-shows',1,24).then(r=>r.items) },
  { title:'Phim Cổ Trang',         to:'/type/phim-bo',    color:'text-green-300',   fetch: () => movieApi.searchMovies('cổ trang',1,24).then(r=>r.items) },
  { title:'Phim Hình Sự',          to:'/type/phim-le',    color:'text-white',       fetch: () => movieApi.searchMovies('hình sự',1,24).then(r=>r.items) },
];

const TOP_TABS = ['Top ngày','Top tuần','Top tháng','Top bộ','Top lẻ'];
const TOP_TITLES: Record<number, string> = {
  0:'Top 10 phim bộ hôm nay', 1:'Top 10 tuần này', 2:'Top 10 tháng này', 3:'Top 10 phim bộ', 4:'Top 10 phim lẻ',
};
const TOP_SRCS = [null,'phim-moi','phim-chieu-rap','phim-bo','phim-le'] as const;

/* ══════════════════════════════════════════════════════════════
   MAIN HOME
   ══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([]);
  const [top10, setTop10] = useState<Movie[]>([]);
  const [topTabMovies, setTopTabMovies] = useState<Movie[]>([]);
  const [topTabLoading, setTopTabLoading] = useState(false);
  const [topTab, setTopTab] = useState(0);
  const [cinema, setCinema] = useState<Movie[]>([]);
  const [newUpdates, setNewUpdates] = useState<Movie[]>([]);
  const [animeList, setAnimeList] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const manualMovies = useManualMovies();
  const [upcomingMovies, setUpcomingMovies] = useState<UpcomingMovie[]>([]);
  const [oldUpcoming, setOldUpcoming] = useState<ManualMovie[]>([]);
  useEffect(() => { const u = subscribeUpcomingMovies(setUpcomingMovies); return u; }, []);
  useEffect(() => { const u = subscribeOldUpcoming(setOldUpcoming); return u; }, []);

  useSEO({ title:'Xem Phim Miễn Phí - Phim Hay Cả Đảo', description:'Đảo Phim - Xem phim online miễn phí HD Vietsub, thuyết minh, lồng tiếng.', url:'/', type:'website' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          movieApi.getNewUpdates(1),
          movieApi.getMoviesByType('phim-chieu-rap', 1, 20),
          movieApi.getMoviesByType('hoat-hinh', 1, 20),
        ]);
        if (cancelled) return;
        const t10 = r1.items.slice(0, 10);
        setBannerMovies(t10);
        setTop10(t10);
        setTopTabMovies(t10);
        setCinema(r2.items);
        setNewUpdates(r1.items.slice(0, 30));
        setAnimeList(r3.items);
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
      const res = src === 'phim-moi' ? await movieApi.getNewUpdates(2) : await movieApi.getMoviesByType(src!, 1, 10);
      setTopTabMovies(res.items.slice(0, 10));
    } catch { setTopTabMovies(top10); }
    finally { setTopTabLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ paddingTop:'64px' }}>
        <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin border-green-500" />
      </div>
    );
  }

  return (
    <div className="pb-safe bg-slate-950 min-h-screen">
      <Banner movies={bannerMovies} />
      <AdBanner position="top" className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-3" />

      <main className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-6 flex flex-col gap-9">

        {/* ── "Bạn đang quan tâm gì?" — gradient chips ── */}
        <section>
          <h2 className="text-[17px] font-black text-white mb-4">Bạn đang quan tâm gì?</h2>
          <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth:'none' }}>
            {INTEREST.map(c => (
              <Link key={c.label} to={c.to}
                className={cn('shrink-0 rounded-xl overflow-hidden bg-gradient-to-br text-white font-black text-sm flex items-center justify-center hover:scale-[1.03] active:scale-95 transition-transform', c.g)}
                style={{ minWidth:'clamp(110px,32vw,160px)', height:'clamp(55px,12vw,75px)', padding:'8px 12px' }}>
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Top 10 — BIG fullwidth cards ── */}
        {top10.length > 0 && (
          <section>
            {/* Tab pills */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth:'none' }}>
              {TOP_TABS.map((t,i) => (
                <button key={t} onClick={() => handleTopTab(i)}
                  className={cn('shrink-0 text-[12px] font-bold px-3.5 py-1.5 rounded-full border transition-all',
                    topTab===i ? 'border-slate-600 bg-slate-800 text-white' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                  {t}
                </button>
              ))}
            </div>
            <SecHeader title={TOP_TITLES[topTab]} to="/type/phim-moi" />
            {topTabLoading
              ? <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-green-400"/></div>
              : <HRow gap="gap-3">{topTabMovies.map((m,i) => <Top10Card key={m._id} movie={m} rank={i+1}/>)}</HRow>
            }
          </section>
        )}

        {/* ── Mãn Nhãn với Phim Chiếu Rạp — wide 16:9 ── */}
        {cinema.length > 0 && (
          <section>
            <SecHeader title="Mãn Nhãn với Phim Chiếu Rạp" to="/type/phim-chieu-rap" />
            <HRow gap="gap-3">{cinema.map(m => <WideCard key={m._id} movie={m}/>)}</HRow>
          </section>
        )}

        {/* ── Phim Sắp Tới — wide 16:9 ── */}
        {upcomingMovies.filter(m => m.upcomingType === 'movie').length > 0 && (
          <section>
            <SecHeader title="Phim Sắp Tới Trên Rổ" to="/type/phim-chieu-rap" />
            <HRow gap="gap-3">
              {upcomingMovies.filter(m => m.upcomingType === 'movie').map(m => <UpcomingNewCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}
        {oldUpcoming.filter(m => m.upcomingType === 'movie').length > 0 && (
          <section>
            <SecHeader title="Phim Sắp Tới Trên Rổ" to="/type/phim-chieu-rap" />
            <HRow gap="gap-3">
              {oldUpcoming.filter(m => m.upcomingType === 'movie').map(m => <UpcomingCard key={m.id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* ── Phim Mới Cập Nhật ── */}
        {(newUpdates.length > 0 || manualMovies.length > 0) && (
          <section>
            <SecHeader title="Phim Mới Cập Nhật" to="/type/phim-moi" />
            <HRow>
              {manualMovies.slice(0,4).map(m => <ManualMCard key={m.id} movie={m}/>)}
              {newUpdates.map(m => <MCard key={m._id} movie={m}/>)}
            </HRow>
          </section>
        )}

        {/* ── Kho Tàng Anime — BIG info card ── */}
        {animeList.length > 0 && (
          <section>
            <SecHeader title="Kho Tàng Anime Mới Nhất" to="/type/hoat-hinh" />
            <HRow gap="gap-3">
              {animeList.slice(0,10).map(m => <AnimeBigCard key={m._id} movie={m} />)}
            </HRow>
          </section>
        )}

        {/* ── Anime Sắp Chiếu ── */}
        {upcomingMovies.filter(m => m.upcomingType === 'anime').length > 0 && (
          <section>
            <SecHeader title="Anime Sắp Chiếu" to="/type/hoat-hinh" />
            <HRow>{upcomingMovies.filter(m => m.upcomingType === 'anime').map(m => <UpcomingNewCard key={m.id} movie={m} />)}</HRow>
          </section>
        )}

        {/* ── All Lazy Sections ── */}
        {LAZY_SECTIONS.map(s => (
          <LazySection key={s.title} title={s.title} to={s.to} fetch={s.fetch} color={s.color} />
        ))}

      </main>
      <AdBanner position="bottom" className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-4" />
    </div>
  );
}
