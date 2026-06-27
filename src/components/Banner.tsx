import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
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

interface BannerProps { movies: Movie[]; }

export default function Banner({ movies }: BannerProps) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const items = movies.slice(0, 8);

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
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 'clamp(360px, 56vw, 620px)',
        marginTop: '-56px',
        paddingTop: '56px',
      }}
    >
      {/* All slides — pure CSS opacity transition, no framer-motion */}
      {items.map((item, i) => (
        <div
          key={item._id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}
        >
          <img
            src={movieApi.getImageUrl(item.thumb_url || item.poster_url)}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/20 to-transparent" />
        </div>
      ))}

      {/* Content — on top (z-10) */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10 max-w-2xl z-10">
        <h1 className="text-lg md:text-2xl font-black text-white leading-tight mb-1 drop-shadow-lg line-clamp-2">
          {decodeHtml(movie.name)}
        </h1>
        <p className="text-sky-400 text-sm font-bold mb-3 line-clamp-1">
          {decodeHtml(movie.origin_name)}
        </p>

        {/* Info badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {movie.quality && (
            <span className="text-[10px] font-black bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded">
              {movie.quality}
            </span>
          )}
          {movie.year && (
            <span className="text-[10px] border border-slate-500 text-slate-300 px-1.5 py-0.5 rounded">
              {movie.year}
            </span>
          )}
          {movie.episode_current && (
            <span className="text-[10px] border border-slate-500 text-slate-300 px-1.5 py-0.5 rounded">
              {decodeHtml(movie.episode_current)}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Link to={`/phim/${movie.slug}`}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2.5 rounded-full text-sm transition-all active:scale-95 shadow-lg">
            <Play size={16} className="fill-current" /> Xem Ngay
          </Link>
          <Link to={`/phim/${movie.slug}`}
            className="flex items-center gap-2 bg-slate-800/70 backdrop-blur border border-slate-600 text-white font-bold px-5 py-2.5 rounded-full text-sm hover:bg-slate-700 transition-all">
            <Info size={16} /> Chi tiết
          </Link>
        </div>
      </div>

      {/* Thumbnail strip — PC only */}
      <div className="absolute bottom-5 right-5 hidden md:flex gap-2 z-10">
        {items.map((m, i) => (
          <button key={m._id} onClick={() => { setIdx(i); resetTimer(); }}
            className={cn(
              'w-14 h-9 rounded-lg overflow-hidden border-2 transition-all shrink-0',
              i === idx ? 'border-sky-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
            )}>
            <img src={movieApi.getImageUrl(m.thumb_url)} alt={m.name}
              className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
        ))}
      </div>
    </div>
  );
}
