import React from 'react';
import { movieApi } from '../services/api';

/**
 * Ảnh poster/thumbnail dùng chung toàn site — tự động thử lần lượt 4 nguồn trước khi
 * chịu thua, để 1 lần trục trặc mạng/CDN không làm ảnh hỏng vĩnh viễn:
 *   1) Link đã build (thường qua proxy phimapi.com)
 *   2) Link ảnh gốc (nếu khác link ở bước 1)
 *   3) Proxy ảnh dự phòng wsrv.nl (khi domain CDN gốc bị chặn/nghẽn ở mạng người xem)
 *   4) Ảnh từ TMDB (domain khác hẳn — nếu mạng người xem chặn domain KKPhim/wsrv.nl
 *      thì TMDB vẫn có khả năng truy cập được, giống cách trang Chi tiết phim đang làm)
 *   5) Cuối cùng mới hiện logo mặc định thay thế.
 */
export default function PosterImg({
  src,
  fallbackSrc,
  movieSlug,
  alt = '',
  className = '',
  loading = 'lazy',
  style,
  onLoad,
}: {
  src: string;
  fallbackSrc?: string;
  movieSlug?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: React.CSSProperties;
  onLoad?: () => void;
}) {
  const original = fallbackSrc || src;

  return (
    <img
      src={src || '/assets/logo-daophim.png'}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={(e) => {
        const img = e.currentTarget;
        const step = img.dataset.fallbackStep || '0';
        if (step === '0' && original && img.src !== original) {
          img.dataset.fallbackStep = '1';
          img.src = original;
        } else if (step !== '2' && step !== '3' && original) {
          img.dataset.fallbackStep = '2';
          img.src = `https://wsrv.nl/?url=${encodeURIComponent(original.replace(/^https?:\/\//, ''))}&default=1`;
        } else if (step !== '3' && movieSlug) {
          // Domain ảnh KKPhim/wsrv.nl có thể đang bị chặn ở mạng người xem — thử ảnh TMDB (domain hoàn toàn khác)
          img.dataset.fallbackStep = '3';
          movieApi.getMovieImagesV1(movieSlug)
            .then(({ posters, backdrops }) => {
              const tmdbUrl = posters[0] || backdrops[0];
              if (tmdbUrl) img.src = tmdbUrl;
              else img.src = '/assets/logo-daophim.png';
            })
            .catch(() => { img.src = '/assets/logo-daophim.png'; });
        } else {
          img.src = '/assets/logo-daophim.png';
        }
      }}
      className={className}
      style={style}
    />
  );
}
