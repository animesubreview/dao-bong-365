import React from 'react';
import { Link } from 'react-router-dom';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';

// Badge helpers
function LangBadge({ lang }: { lang?: string }) {
  const cleaned = movieApi.cleanLang(lang || '');
  if (!cleaned) return null;
  const label = cleaned === 'Vietsub' ? 'P.Đề' : cleaned === 'Lồng Tiếng' ? 'L.Tiếng' : cleaned === 'Thuyết Minh' ? 'T.Minh' : cleaned.slice(0,5);
  const color = cleaned === 'Vietsub' ? 'bg-slate-700' : cleaned === 'Lồng Tiếng' ? 'bg-blue-600' : 'bg-green-700';
  return <span className={cn('movie-card-badge', color)}>{label}</span>;
}

function EpBadge({ ep }: { ep?: string }) {
  if (!ep || ep === 'Full' || ep === 'Hoàn Tất') return null;
  // e.g. "Tập 12/24" → show "PĐ. 12"
  const match = ep.match(/(\d+)/);
  if (!match) return null;
  return <span className="movie-card-badge bg-slate-700/90">PĐ. {match[1]}</span>;
}

export default function MovieCard({ movie, className }: any) {
  return (
    <div className={cn('group block', className)}>
      <Link to={`/phim/${movie.slug}`} className="block">
        {/* Poster - tỷ lệ 2:3 cố định */}
        <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '2/3' }}>
          <img
            src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url) || '/assets/logo-daophim.png'}
            alt={movie.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              const original = movie.poster_url || movie.thumb_url;
              // Nếu proxy phimapi.com lỗi/bị chặn, thử lại bằng link ảnh gốc
              if (original && img.src !== original) {
                img.src = original;
              } else {
                img.src = '/assets/logo-daophim.png';
              }
            }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Bottom badges */}
          <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-1 items-start">
            <EpBadge ep={movie.episode_current} />
            <LangBadge lang={movie.lang} />
          </div>
        </div>
        {/* Info below */}
        <div className="mt-2 px-0.5">
          <div className="font-bold text-[13px] text-slate-100 group-hover:text-green-400 transition-colors line-clamp-1 leading-tight">
            {movie.name}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            {movie.origin_name}
          </div>
        </div>
      </Link>
    </div>
  );
}
