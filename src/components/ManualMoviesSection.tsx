import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { subscribeManualMovies } from '../lib/manualMovies';

export type { ManualMovie } from '../lib/manualMovies';
export { subscribeManualMovies };

import type { ManualMovie } from '../lib/manualMovies';

// Hook realtime – mọi client đều nhận update ngay khi admin thêm/xoá/sửa
export function useManualMovies(): ManualMovie[] {
  const [movies, setMovies] = useState<ManualMovie[]>([]);
  useEffect(() => {
    const unsub = subscribeManualMovies(setMovies);
    return unsub;
  }, []);
  return movies;
}

function LangBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  const label = lang === 'Vietsub' ? 'P.Đề'
    : lang === 'Lồng Tiếng' ? 'L.Tiếng'
    : lang === 'Thuyết Minh' ? 'T.Minh'
    : lang.slice(0, 5);
  const color = lang === 'Vietsub' ? 'bg-slate-700'
    : lang === 'Lồng Tiếng' ? 'bg-blue-600'
    : 'bg-green-700';
  return <span className={cn('movie-card-badge', color)}>{label}</span>;
}

export function ManualMovieCard({ movie, className }: { movie: ManualMovie; className?: string }) {
  return (
    <div className={cn('group block', className)}>
      <Link to={`/manual/${movie.id}`} className="block">
        <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '2/3' }}>
          {movie.posterUrl
            ? <img src={movie.posterUrl} alt={movie.name} loading="lazy" referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="absolute inset-0 w-full h-full bg-slate-800 flex items-center justify-center text-slate-600 text-3xl">🎬</div>
          }
          <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-1 items-start">
            <LangBadge lang={movie.lang} />
          </div>
        </div>
        <div className="mt-2 px-0.5">
          <div className="font-bold text-[13px] text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-1 leading-tight">{movie.name}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{movie.originName}</div>
        </div>
      </Link>
    </div>
  );
}
