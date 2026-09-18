import React from 'react';
import { Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';

// Badge helpers
function LangBadge({ lang }: { lang?: string }) {
  const cleaned = movieApi.cleanLang(lang || '');
  if (!cleaned) return null;
  if (cleaned === 'Song Ngữ') {
    return (
      <span className="movie-card-badge flex items-center gap-1 bg-[var(--primary)]/85">
        <Languages size={9} strokeWidth={2.5} /> Song Ngữ
      </span>
    );
  }
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
        <div
          className="relative rounded-2xl overflow-hidden bg-slate-800 border border-white/[0.06] shadow-md shadow-black/30 transition-transform duration-300 ease-out group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-[var(--primary)]/10"
          style={{ aspectRatio: '2/3' }}
        >
          <img
            src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url) || '/assets/logo-daophim.png'}
            alt={movie.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              const original = movie.poster_url || movie.thumb_url;
              const step = img.dataset.fallbackStep || '0';
              if (step === '0' && original && img.src !== original) {
                // Bước 1: thử lại bằng link ảnh gốc (bỏ qua proxy phimapi.com nếu nó đang lỗi)
                img.dataset.fallbackStep = '1';
                img.src = original;
              } else if (step !== '2' && original) {
                // Bước 2: mạng người xem có thể đang chặn domain ảnh gốc — thử qua proxy ảnh dự phòng (wsrv.nl)
                img.dataset.fallbackStep = '2';
                img.src = `https://wsrv.nl/?url=${encodeURIComponent(original.replace(/^https?:\/\//, ''))}&default=1`;
              } else {
                img.src = '/assets/logo-daophim.png';
              }
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay gradient — luôn nhẹ, đậm hơn khi hover để chữ/nút nổi bật (desktop) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Nút play khi hover trên desktop */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0c12"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </div>
          {/* Bottom badges */}
          <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-1 items-start z-10">
            <EpBadge ep={movie.episode_current} />
            <LangBadge lang={movie.lang} />
          </div>
        </div>
        {/* Info below */}
        <div className="mt-2 px-0.5">
          <div className="font-bold text-[13px] text-slate-100 group-hover:text-[var(--primary-light)] transition-colors line-clamp-2 leading-tight">
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
