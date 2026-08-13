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

// Strip HTML tags from movie.content to get a plain-text synopsis (IMDb-style info block)
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
  const baseItems = movies.slice(0, 10);
  // Trộn dữ liệu chi tiết (content, category) đã fetch thêm vào — danh sách
  // "phim mới cập nhật" mặc định không kèm mô tả/thể loại như trang chi tiết.
  const items = baseItems.map(m => detailMap[m.slug] || m);

  // Endpoint danh sách không trả về content/category đầy đủ, nên fetch thêm
  // chi tiết từng phim trên banner để hiển thị mô tả + thể loại (giống ảnh mẫu).
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

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  }, [next]);

  useEffect(() => {
    if (!items.length) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [items.length, resetTimer]);

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
  const genres = useMemo(() => (movie?.category || []).slice(0, 3), [movie]);

  if (!items.length) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-slate-950"
      style={{
        height: 'clamp(460px, 46vw, 720px)',
        marginTop: '-64px',
        paddingTop: '64px',
      }}
    >
      {/* All slides — pure CSS opacity transition, no framer-motion. Tapping the image opens movie detail. */}
      {items.map((item, i) => (
        <Link
          to={`/phim/${item.slug}`}
          key={item._id}
          className="absolute inset-0 block transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0, pointerEvents: i === idx ? 'auto' : 'none' }}
        >
          <img
            src={movieApi.getImageUrl(item.thumb_url || item.poster_url)}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 md:via-slate-950/30 via-slate-950/50 to-transparent" />
        </Link>
      ))}

      {/* Content — aligned to the same container width used across the site,
          so it lines up with the rest of the homepage on PC/laptop screens */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pb-6 md:pb-10 lg:pb-12 flex items-end justify-between gap-8">

          {/* Movie info block (IMDb-style: title, genres, badges, synopsis) */}
          <div className="max-w-xl lg:max-w-2xl min-w-0 max-h-[calc(100vh-140px)] overflow-hidden w-full text-center md:text-left">
            <h1
              className="banner-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-[1.05] mb-2 line-clamp-2"
            >
              {decodeHtml(movie.name)}
            </h1>
            {movie.origin_name && (
              <p className="text-teal-400 text-sm md:text-base lg:text-lg font-bold mb-3 line-clamp-1">
                {decodeHtml(movie.origin_name)}
              </p>
            )}

            {/* Quality / year / duration — info badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-3">
              {movie.quality && (
                <span className="text-[10px] md:text-xs font-black bg-teal-400 text-slate-950 px-2 py-0.5 rounded-md">
                  {movie.quality}
                </span>
              )}
              {movie.year && (
                <span className="text-[10px] md:text-xs font-bold border border-white/40 text-white px-2 py-0.5 rounded-md">
                  {movie.year}
                </span>
              )}
              {movie.time && (
                <span className="text-[10px] md:text-xs font-bold border border-white/40 text-white px-2 py-0.5 rounded-md">
                  {decodeHtml(movie.time)}
                </span>
              )}
              {movie.episode_current && (
                <span className="text-[10px] md:text-xs font-bold border border-white/40 text-white px-2 py-0.5 rounded-md">
                  {decodeHtml(movie.episode_current)}
                </span>
              )}
            </div>

            {/* Top 10 — circular avatar carousel, mobile only (matches phone UI reference) */}
            <div className="md:hidden flex justify-center gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}>
              {items.map((m, i) => (
                <button key={m._id} onClick={() => { setIdx(i); resetTimer(); }}
                  aria-label={`Top ${i + 1}: ${decodeHtml(m.name)}`}
                  style={{ scrollSnapAlign: 'start' }}
                  className={cn(
                    'w-[34px] h-[34px] rounded-full overflow-hidden border shrink-0 transition-all bg-slate-800',
                    i === idx ? 'border-white' : 'border-white/25 opacity-70'
                  )}>
                  {/* Dùng poster dọc (không phải ảnh banner ngang của PC) và object-contain để hiện trọn poster, không bị cắt */}
                  <img src={movieApi.getImageUrl(m.poster_url || m.thumb_url)} alt={m.name}
                    className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>

            {/* Genre tags */}
            {genres.length > 0 && (
              <div className="max-sm:hidden flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                {genres.map(g => (
                  <Link key={g.id} to={`/type/${g.slug}`}
                    className="text-[11px] md:text-xs font-semibold bg-white/10 hover:bg-white/20 backdrop-blur text-slate-200 px-3 py-1 rounded-md transition-colors">
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {synopsis && (
              <p className="max-sm:hidden text-slate-300 text-xs md:text-sm lg:text-base leading-relaxed line-clamp-2 mb-4 max-w-lg lg:max-w-xl">
                {synopsis}
              </p>
            )}

            {/* Action buttons — desktop/tablet only, matching reference mobile UI which has none here */}
            <div className="hidden md:flex items-center gap-3">
              <Link to={`/phim/${movie.slug}`} aria-label="Xem ngay"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-lg shadow-teal-400/30 transition-all active:scale-95 shrink-0">
                <Play size={20} className="fill-current ml-0.5" />
              </Link>
              <button type="button" aria-label="Yêu thích" onClick={() => toggleFavorite(movie)}
                className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur hover:bg-slate-800 transition-all text-white shrink-0">
                <Heart size={17} className={cn(isFav && 'fill-red-500 text-red-500')} />
              </button>
              <Link to={`/phim/${movie.slug}`} aria-label="Chi tiết"
                className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur hover:bg-slate-800 transition-all text-white shrink-0">
                <Info size={17} />
              </Link>
            </div>
          </div>

          {/* Thumbnail strip — visible from md (laptop) up, aligned to the same container */}
          <div className="hidden md:flex items-end gap-2 lg:gap-2.5 shrink-0 max-w-[360px] lg:max-w-[480px] xl:max-w-[600px] overflow-hidden pb-1">
            {items.map((m, i) => (
              <button key={m._id} onClick={() => { setIdx(i); resetTimer(); }}
                aria-label={`${decodeHtml(m.name)}`}
                className={cn(
                  'relative w-14 h-14 md:w-16 md:h-16 lg:w-[74px] lg:h-[74px] rounded-xl overflow-hidden border-2 transition-all shrink-0',
                  i === idx ? 'border-red-500 opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-90'
                )}>
                <img src={movieApi.getImageUrl(m.thumb_url)} alt={m.name}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
