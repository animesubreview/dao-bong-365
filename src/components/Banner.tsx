import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';

function dec(s: string) {
  return (s || '').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

interface BannerProps { movies: Movie[]; }

export default function Banner({ movies }: BannerProps) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const items = movies.slice(0, 10);

  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);
  const prev = () => setIdx(i => (i - 1 + items.length) % items.length);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5000);
  }, [next]);

  useEffect(() => {
    if (!items.length) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [items.length, resetTimer]);

  if (!items.length) return null;
  const movie = items[idx];

  return (
    <div className="relative w-full overflow-hidden">
      {/* ── Fullscreen BG slides ── */}
      <div style={{ height: 'clamp(480px, 95vw, 700px)', position: 'relative' }}>
        {items.map((item, i) => (
          <div key={item._id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}>
            <img
              src={movieApi.getImageUrl(item.thumb_url || item.poster_url)}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            {/* Gradients — top for header, bottom heavy for content */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          </div>
        ))}

        {/* ── Content — pinned to bottom of BG ── */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-6 px-4">

          {/* Poster card — center, medium size like CôBePhim */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 mb-5"
            style={{ width: 'clamp(140px, 42vw, 200px)', aspectRatio: '2/3' }}>
            <img
              src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)}
              alt={dec(movie.name)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl font-black text-white text-center leading-tight line-clamp-2 drop-shadow-lg mb-1">
            {dec(movie.name)}
          </h1>

          {/* Origin name */}
          {movie.origin_name && movie.origin_name !== movie.name && (
            <p className="text-green-400 text-sm font-bold text-center mb-3">
              {dec(movie.origin_name)}
            </p>
          )}

          {/* Year badge */}
          {movie.year && !movie.origin_name && (
            <div className="mb-3">
              <span className="border border-white/30 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                {movie.year}
              </span>
            </div>
          )}
          {movie.year && movie.origin_name && (
            <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
              <span className="border border-white/30 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                {movie.year}
              </span>
              {movie.episode_current && (
                <span className="border border-white/30 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                  {dec(movie.episode_current)}
                </span>
              )}
            </div>
          )}

          {/* CTA Buttons — xanh lá + outline */}
          <div className="flex items-center gap-3 w-full max-w-sm">
            <Link
              to={`/phim/${movie.slug}`}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 active:scale-95 text-white font-black py-3.5 rounded-full text-sm transition-all shadow-lg shadow-green-500/30">
              <Play size={16} className="fill-current" /> Xem phim
            </Link>
            <Link
              to={`/phim/${movie.slug}`}
              className="flex items-center justify-center gap-1.5 border border-white/30 bg-white/10 backdrop-blur text-white font-bold px-5 py-3.5 rounded-full text-sm hover:bg-white/20 transition-all">
              <Info size={15} /> Thông tin
            </Link>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); resetTimer(); }}
                className={cn('rounded-full transition-all',
                  i === idx ? 'w-6 h-1.5 bg-green-500' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60')} />
            ))}
          </div>
        </div>
      </div>

      {/* Prev/Next — desktop only */}
      <button onClick={() => { prev(); resetTimer(); }}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/20 items-center justify-center text-white hover:bg-green-500 hover:border-green-500 transition-all">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => { next(); resetTimer(); }}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/20 items-center justify-center text-white hover:bg-green-500 hover:border-green-500 transition-all">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
