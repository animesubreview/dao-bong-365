import React from 'react';
import { Link } from 'react-router-dom';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';

/* ── Badge trái (hồng): chất lượng + ngôn ngữ, VD "HD Lồng Tiếng", "CAM Phụ Đề" ── */
export function QualityBadge({ movie }: { movie: any }) {
  const cleanedLang = movieApi.cleanLang(movie.lang || '');
  const langLabel = cleanedLang === 'Vietsub' ? 'Phụ Đề'
    : cleanedLang === 'Lồng Tiếng' ? 'Lồng Tiếng'
    : cleanedLang === 'Thuyết Minh' ? 'Thuyết Minh'
    : cleanedLang || '';
  const quality = (movie.quality || 'HD').toUpperCase();
  const label = langLabel ? `${quality} ${langLabel}` : quality;
  return (
    <span className="inline-flex items-center rounded-md bg-pink-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-white shadow-sm whitespace-nowrap">
      {label}
    </span>
  );
}

/* ── Badge phải (tím): thời lượng phim lẻ, hoặc "Trọn Bộ" / "Tập x" cho phim bộ ── */
export function DurationBadge({ movie }: { movie: any }) {
  const isSeries = !!(movie.episode_total && movie.episode_total !== '1');
  let label = '';
  if (isSeries) {
    const cur = (movie.episode_current || '').match(/(\d+)/)?.[1];
    const total = (movie.episode_total || '').match(/(\d+)/)?.[1];
    if (cur && total && cur === total) label = 'Trọn Bộ';
    else if (cur) label = `Tập ${cur}`;
    else label = 'Trọn Bộ';
  } else if (movie.time) {
    label = String(movie.time).trim();
  }
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-white shadow-sm whitespace-nowrap">
      {label}
    </span>
  );
}

export default function MovieCard({ movie, className }: any) {
  return (
    <div className={cn('group block', className)}>
      <Link to={`/phim/${movie.slug}`} className="block">
        {/* Poster - tỷ lệ 2:3 cố định */}
        <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '2/3' }}>
          <img
            src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url) || '/assets/logo-phimtuoitho.png'}
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
                img.src = '/assets/logo-phimtuoitho.png';
              }
            }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Badge trên cùng: trái hồng (chất lượng), phải tím (thời lượng/tập) — như mẫu Phim Tuổi Thơ */}
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1">
            <QualityBadge movie={movie} />
            <DurationBadge movie={movie} />
          </div>
        </div>
        {/* Tiêu đề bên dưới — đậm, trắng */}
        <div className="mt-2 px-0.5">
          <div className="font-extrabold text-[13px] sm:text-sm text-white group-hover:text-yellow-400 transition-colors line-clamp-2 leading-snug">
            {movie.name}
          </div>
        </div>
      </Link>
    </div>
  );
}
