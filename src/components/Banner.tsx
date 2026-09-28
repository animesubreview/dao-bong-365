import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Heart } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';
import PosterImg from './PosterImg';

// Decode HTML entities (&#039; → ', &amp; → &, etc.)
function decodeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

// Strip HTML tags from movie.content to get a plain-text synopsis
function stripHtml(str?: string): string {
  if (!str) return '';
  return decodeHtml(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

interface BannerProps { movies: Movie[]; }

export default function Banner({ movies }: BannerProps) {
  const [idx, setIdx] = useState(0);
  const [favSlugs, setFavSlugs] = useState<string[]>([]);
  const [detailMap, setDetailMap] = useState<Record<string, Movie>>({});
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const baseItems = movies.slice(0, 8);
  // Trộn dữ liệu chi tiết (content, category) đã fetch thêm vào — danh sách
  // "phim mới cập nhật" mặc định không kèm mô tả/thể loại như trang chi tiết.
  const items = baseItems.map(m => detailMap[m.slug] || m);

  useEffect(() => {
    const missing = baseItems.filter(m => !detailMap[m.slug]);
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(m =>
      movieApi.getMovieDetail(m.slug).then(r => ({ slug: m.slug, movie: r?.movie })).catch(() => null)
    )).then(results => {
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

  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const prevIdx = (idx - 1 + items.length) % items.length;
  const nextIdx = (idx + 1) % items.length;

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  }, [next]);

  useEffect(() => {
    if (!items.length) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [items.length, resetTimer]);

  const goTo = (i: number) => { setIdx(i); resetTimer(); };

  // ── Vuốt mượt kiểu coverflow: poster đi theo ngón tay theo thời gian thực,
  // thả tay thì "hít" về poster gần nhất (có quán tính nếu vuốt nhanh). ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; t: number; lock: 'x' | 'y' | null; step: number } | null>(null);
  const wasDraggedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    const h = stageRef.current?.clientHeight || 360;
    dragRef.current = { startX: e.clientX, startY: e.clientY, t: Date.now(), lock: null, step: h * (2 / 3) * 0.78 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      d.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.lock === 'x') { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} setDragging(true); clearInterval(timerRef.current); }
    }
    if (d.lock === 'x') setDragX(dx);
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.lock === 'x') {
      const dx = e.clientX - d.startX;
      const v = dx / Math.max(1, Date.now() - d.t); // px/ms
      // Số poster nhảy = quãng kéo + quán tính, tối đa 2
      let moved = Math.round((dx + v * 180) / d.step);
      moved = Math.max(-2, Math.min(2, moved));
      if (moved === 0 && Math.abs(dx) > 40) moved = dx > 0 ? 1 : -1;
      setDragging(false);
      setDragX(0);
      if (moved !== 0) setIdx(i => ((i - moved) % items.length + items.length) % items.length);
      resetTimer();
      wasDraggedRef.current = true;
      setTimeout(() => { wasDraggedRef.current = false; }, 60);
    }
  };
  const onPosterLinkClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) e.preventDefault();
  };

  // Đọc danh sách yêu thích để tô đậm icon trái tim (đồng bộ với trang Favorites)
  const readFavs = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavSlugs(Array.isArray(raw) ? raw.map((m: any) => m.slug) : []);
    } catch { setFavSlugs([]); }
  }, []);
  useEffect(() => { readFavs(); }, [readFavs]);

  const toggleFavorite = useCallback((movie: Movie) => {
    try {
      const raw = JSON.parse(localStorage.getItem('favorites') || '[]');
      const list: any[] = Array.isArray(raw) ? raw : [];
      const exists = list.some(m => m.slug === movie.slug);
      const updated = exists ? list.filter(m => m.slug !== movie.slug) : [...list, movie];
      localStorage.setItem('favorites', JSON.stringify(updated));
      readFavs();
    } catch { /* ignore */ }
  }, [readFavs]);

  const movie = items[idx];
  const isFav = useMemo(() => !!movie && favSlugs.includes(movie.slug), [movie, favSlugs]);
  const synopsis = useMemo(() => stripHtml(movie?.content), [movie]);

  if (!items.length) return null;

  const n = items.length;
  const stageH = 'clamp(280px, 52vw, 440px)';
  // Vị trí tương đối (có phần lẻ khi đang kéo) của từng poster so với poster giữa
  const offsetOf = (i: number) => {
    let o = i - idx;
    if (o > n / 2) o -= n;
    if (o < -n / 2) o += n;
    return o;
  };
  const ease = 'transform 550ms cubic-bezier(.22,1,.36,1), opacity 550ms ease';

  return (
    <div className="relative w-full overflow-hidden pt-4 pb-6">
      {/* Nền kính: backdrop poster phim đang chọn, blur rất mạnh + chuyển mờ dần khi đổi slide */}
      <div className="absolute inset-0 -z-10 bg-slate-950">
        {items.map((m, i) => (
          <img
            key={m._id}
            src={movieApi.getImageUrl(m.thumb_url || m.poster_url)}
            alt="" aria-hidden="true" referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl saturate-150 transition-opacity duration-700"
            style={{ opacity: i === idx ? 0.55 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
      </div>

      {/* Coverflow: poster giữa lớn, 2 bên nghiêng + thu nhỏ + mờ — vuốt trái/phải mượt */}
      <div
        ref={stageRef}
        className="relative mx-auto select-none"
        style={{ height: stageH, maxWidth: 720, touchAction: 'pan-y', perspective: 1100 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((m, i) => {
          const base = offsetOf(i);
          if (Math.abs(base) > 2.6) return null;
          const stepPx = (stageRef.current?.clientHeight || 360) * (2 / 3) * 0.78;
          const f = base + (dragging ? dragX / stepPx : 0); // vị trí thực tế theo ngón tay
          const af = Math.min(Math.abs(f), 2);
          const isCenter = base === 0;
          return (
            <Link
              key={m._id}
              to={`/phim/${m.slug}`}
              draggable={false}
              onClick={(e) => {
                if (wasDraggedRef.current) { e.preventDefault(); return; }
                if (!isCenter) { e.preventDefault(); goTo(i); }
              }}
              aria-label={decodeHtml(m.name)}
              className="absolute left-1/2 top-1/2 block h-[92%] rounded-2xl overflow-hidden border border-white/25 shadow-2xl shadow-black/60 bg-slate-800"
              style={{
                aspectRatio: '2/3',
                transform: `translate(-50%, -50%) translateX(${f * 78}%) rotateY(${-f * 28}deg) rotateZ(${f * 6}deg) scale(${1 - af * 0.16})`,
                opacity: Math.max(0, 1 - af * 0.5),
                zIndex: 20 - Math.round(af * 5),
                transition: dragging ? 'none' : ease,
                willChange: 'transform, opacity',
                borderColor: isCenter ? 'rgba(255,255,255,0.9)' : undefined,
                borderWidth: isCenter ? 2 : 1,
              }}
            >
              <PosterImg
                src={movieApi.getImageUrl(m.poster_url || m.thumb_url)}
                fallbackSrc={m.poster_url || m.thumb_url}
                movieSlug={m.slug}
                alt={m.name}
                loading={Math.abs(base) <= 1 ? 'eager' : 'lazy'}
                className="w-full h-full object-cover pointer-events-none"
              />
              {!isCenter && <div className="absolute inset-0 bg-slate-950/35" />}
            </Link>
          );
        })}
      </div>

      {/* Thông tin phim — căn giữa, giống ảnh mẫu */}
      <div className="max-w-xl mx-4 sm:mx-auto px-5 py-5 text-center mt-5 rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <h1 className="banner-title text-2xl sm:text-3xl md:text-4xl text-white leading-[1.15] mb-1 line-clamp-2">
          {decodeHtml(movie.name)}
        </h1>
        {movie.origin_name && (
          <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wide mb-4 line-clamp-1">
            {decodeHtml(movie.origin_name)}
          </p>
        )}

        {/* Nút hành động — 1 khối pill chia 3 phần, giống ảnh mẫu */}
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <Link
            to={`/phim/${movie.slug}`}
            className="btn-primary !py-2.5 !px-6 text-sm gap-2"
          >
            <Play size={16} className="fill-current" /> Xem Phim
          </Link>
          <button
            type="button" aria-label="Yêu thích" onClick={() => toggleFavorite(movie)}
            className="w-11 h-11 shrink-0 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
          >
            <Heart size={17} className={cn(isFav && 'fill-red-500 text-red-500')} />
          </button>
          <Link
            to={`/phim/${movie.slug}`} aria-label="Chi tiết"
            className="w-11 h-11 shrink-0 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
          >
            <Info size={17} />
          </Link>
        </div>

        {/* Badge thông tin — dạng viền, giống ảnh mẫu */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
          {movie.quality && (
            <span className="text-[11px] font-bold border border-[var(--primary)]/60 text-[var(--primary-light)] px-2.5 py-1 rounded-lg">
              {movie.quality}
            </span>
          )}
          {movie.year && (
            <span className="text-[11px] font-bold border border-white/20 text-slate-300 px-2.5 py-1 rounded-lg">
              {movie.year}
            </span>
          )}
          {movie.time && (
            <span className="text-[11px] font-bold border border-white/20 text-slate-300 px-2.5 py-1 rounded-lg">
              {decodeHtml(movie.time)}
            </span>
          )}
          {movie.episode_current && (
            <span className="text-[11px] font-bold border border-white/20 text-slate-300 px-2.5 py-1 rounded-lg">
              {decodeHtml(movie.episode_current)}
            </span>
          )}
        </div>

        {/* Mô tả ngắn */}
        {synopsis && (
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4">
            {synopsis}
          </p>
        )}

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {items.map((m, i) => (
              <button
                key={m._id} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === idx ? 'w-6 bg-[var(--primary)]' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
