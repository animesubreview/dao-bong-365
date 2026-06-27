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
    <div className="relative w-full overflow-hidden" style={{ marginTop: '-64px', paddingTop: '64px' }}>
      {/* BG Slides */}
      {items.map((item, i) => (
        <div key={item._id} className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}>
          <img src={movieApi.getImageUrl(item.thumb_url || item.poster_url)} alt={item.name}
            referrerPolicy="no-referrer" className="w-full h-full object-cover object-top"
            loading={i === 0 ? 'eager' : 'lazy'} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 px-4 pb-6 pt-2" style={{ minHeight: 'clamp(320px,55vw,560px)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
        {/* Card-style poster + info (mobile: center) */}
        <div className="flex flex-col items-center md:items-start md:flex-row gap-5 max-w-4xl md:mx-0 mx-auto w-full">
          {/* Poster card */}
          <div className="shrink-0 w-32 md:w-44 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10"
            style={{ aspectRatio: '2/3' }}>
            <img src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)} alt={movie.name}
              referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="eager" />
          </div>

          {/* Info */}
          <div className="flex flex-col items-center md:items-start gap-3 pb-1 text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">
              {dec(movie.name)}
            </h1>
            {movie.origin_name && movie.origin_name !== movie.name && (
              <p className="text-green-400 text-sm font-bold">{dec(movie.origin_name)}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
              {movie.imdb_id && (
                <span className="text-[11px] font-black bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-md">IMDb</span>
              )}
              {movie.year && (
                <span className="text-[11px] font-semibold border border-slate-500/60 text-slate-300 px-2 py-0.5 rounded-full">{movie.year}</span>
              )}
              {movie.quality && (
                <span className="text-[11px] font-bold border border-slate-500/60 text-slate-300 px-2 py-0.5 rounded-full">{movie.quality}</span>
              )}
              {movie.episode_current && (
                <span className="text-[11px] font-semibold border border-slate-500/60 text-slate-300 px-2 py-0.5 rounded-full">{dec(movie.episode_current)}</span>
              )}
            </div>

            {/* Short desc */}
            {movie.content && (
              <p className="text-slate-400 text-xs line-clamp-2 max-w-sm" dangerouslySetInnerHTML={{ __html: movie.content.replace(/<[^>]*>/g,'').slice(0,120) + '...' }} />
            )}

            {/* CTA buttons */}
            <div className="flex gap-3 mt-1">
              <Link to={`/phim/${movie.slug}`}
                className="flex items-center gap-2 btn-brand text-sm">
                <Play size={15} className="fill-current" /> Xem phim
              </Link>
              <Link to={`/phim/${movie.slug}`}
                className="flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-600/60 text-white font-bold px-5 py-3 rounded-full text-sm hover:bg-slate-700 transition-all">
                <Info size={15} /> Thông tin
              </Link>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {items.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); resetTimer(); }}
              className={cn('rounded-full transition-all', i === idx ? 'w-6 h-1.5 bg-green-500' : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-400')} />
          ))}
        </div>
      </div>

      {/* Prev/Next arrows — desktop */}
      <button onClick={() => { prev(); resetTimer(); }}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-900/80 border border-slate-700 items-center justify-center text-white hover:bg-green-500 hover:border-green-500 transition-all">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => { next(); resetTimer(); }}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-900/80 border border-slate-700 items-center justify-center text-white hover:bg-green-500 hover:border-green-500 transition-all">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
