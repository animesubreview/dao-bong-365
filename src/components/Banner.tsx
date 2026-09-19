import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Heart } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';

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

  const PosterSide = ({ item, side }: { item: Movie; side: 'left' | 'right' }) => (
    <button
      onClick={() => goTo(side === 'left' ? prevIdx : nextIdx)}
      aria-label={decodeHtml(item.name)}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 w-[30%] sm:w-[26%] rounded-2xl overflow-hidden opacity-40 hover:opacity-60 transition-opacity shadow-xl',
        side === 'left' ? 'left-0 -translate-x-[15%]' : 'right-0 translate-x-[15%]'
      )}
      style={{ aspectRatio: '2/3' }}
    >
      <img
        src={movieApi.getImageUrl(item.poster_url || item.thumb_url)}
        alt={item.name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/40" />
    </button>
  );

  return (
    <div className="relative w-full overflow-hidden pt-4 pb-6">
      {/* Backdrop mờ phía sau — lấy chính poster phim đang chọn, blur mạnh để tạo chiều sâu */}
      <div className="absolute inset-0 -z-10">
        <img
          key={movie._id}
          src={movieApi.getImageUrl(movie.thumb_url || movie.poster_url)}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover scale-110 blur-2xl opacity-30 transition-opacity duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />
      </div>

      {/* 3 poster: trái/phải mờ hé lộ, giữa nổi bật */}
      <div className="relative mx-auto px-4" style={{ height: 'clamp(260px, 42vw, 420px)', maxWidth: 720 }}>
        {items.length > 1 && <PosterSide item={items[prevIdx]} side="left" />}
        {items.length > 1 && <PosterSide item={items[nextIdx]} side="right" />}

        <Link
          to={`/phim/${movie.slug}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full rounded-2xl overflow-hidden border-2 border-white/90 shadow-2xl shadow-black/50 z-10 block"
          style={{ aspectRatio: '2/3' }}
        >
          <img
            src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)}
            alt={movie.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </Link>
      </div>

      {/* Thông tin phim — căn giữa, giống ảnh mẫu */}
      <div className="max-w-xl mx-auto px-5 text-center mt-5">
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
