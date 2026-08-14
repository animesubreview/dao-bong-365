import React, { useEffect, useRef, useState } from 'react';
import { movieApi } from '../services/api';

/**
 * Cache toàn cục: slug → URL ảnh (poster/backdrop) lấy từ API
 * GET /v1/api/phim/{slug}/images (qua movieApi.getMovieImagesV1).
 * - value là string  → đã lấy được ảnh, dùng lại luôn cho mọi PosterImg cùng slug.
 * - value là null    → đã gọi API nhưng không có ảnh, khỏi gọi lại.
 * - chưa có key       → chưa từng gọi cho slug này.
 */
const apiPosterCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

function fetchApiPoster(slug: string): Promise<string | null> {
  if (apiPosterCache.has(slug)) return Promise.resolve(apiPosterCache.get(slug)!);
  if (inFlight.has(slug)) return inFlight.get(slug)!;

  const p = movieApi.getMovieImagesV1(slug)
    .then(({ posters, backdrops }) => {
      const url = posters[0] || backdrops[0] || null;
      apiPosterCache.set(slug, url);
      inFlight.delete(slug);
      return url;
    })
    .catch(() => {
      apiPosterCache.set(slug, null);
      inFlight.delete(slug);
      return null;
    });
  inFlight.set(slug, p);
  return p;
}

/**
 * Ảnh poster/thumbnail dùng chung toàn site.
 *
 * Mặc định (preferApiImage=false): giữ nguyên hành vi cũ — dùng `src` truyền vào,
 * chỉ thử ảnh từ API /v1/api/phim/{slug}/images như bước fallback cuối cùng khi lỗi.
 *
 * Khi `preferApiImage={true}` (dùng ở Trang chủ): coi API GET /v1/api/phim/{slug}/images
 * (TMDB, qua movieApi.getMovieImagesV1) là NGUỒN ẢNH CHÍNH — component sẽ ưu tiên lấy
 * ảnh từ API này ngay khi ảnh sắp vào viewport (IntersectionObserver, tránh gọi hàng
 * loạt API cùng lúc). Trong lúc chờ / nếu API không có ảnh, vẫn hiển thị `src` (nguồn cũ)
 * làm placeholder, rồi mới có chuỗi fallback dự phòng nếu ảnh lỗi:
 *   1) Ảnh từ API /v1/api/phim/{slug}/images (chính, chỉ khi preferApiImage)
 *   2) Link đã build sẵn (thường qua proxy phimapi.com) — dùng khi API chưa trả ảnh
 *   3) Link ảnh gốc (nếu khác link ở bước 2)
 *   4) Proxy ảnh dự phòng wsrv.nl (khi domain CDN gốc bị chặn/nghẽn ở mạng người xem)
 *   5) Ảnh từ API TMDB (nếu chưa thử ở bước 1)
 *   6) Cuối cùng mới hiện logo mặc định thay thế.
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
  preferApiImage = false,
}: {
  src: string;
  fallbackSrc?: string;
  movieSlug?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: React.CSSProperties;
  onLoad?: () => void;
  /** true = dùng /v1/api/phim/{slug}/images làm nguồn ảnh chính (Trang chủ) */
  preferApiImage?: boolean;
}) {
  const original = fallbackSrc || src;
  const placeholder = src || original || '/assets/logo-daophim.png';

  const [displaySrc, setDisplaySrc] = useState<string>(
    preferApiImage && movieSlug && apiPosterCache.has(movieSlug)
      ? (apiPosterCache.get(movieSlug) || placeholder)
      : placeholder
  );
  const wrapperRef = useRef<HTMLImageElement>(null);

  // Nếu src/fallback đổi (đổi phim) → reset về placeholder, trừ khi đã có ảnh API cache sẵn
  useEffect(() => {
    if (preferApiImage && movieSlug && apiPosterCache.has(movieSlug)) {
      setDisplaySrc(apiPosterCache.get(movieSlug) || placeholder);
    } else {
      setDisplaySrc(placeholder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieSlug, placeholder, preferApiImage]);

  // Lấy ảnh chính từ API /v1/api/phim/{slug}/images khi ảnh chuẩn bị vào viewport
  useEffect(() => {
    if (!preferApiImage || !movieSlug) return;
    if (apiPosterCache.has(movieSlug)) return; // đã cache rồi, không cần quan sát nữa

    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Môi trường không hỗ trợ IO → gọi thẳng
      fetchApiPoster(movieSlug).then((url) => { if (url) setDisplaySrc(url); });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          fetchApiPoster(movieSlug).then((url) => { if (url) setDisplaySrc(url); });
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [preferApiImage, movieSlug]);

  return (
    <img
      ref={wrapperRef}
      src={displaySrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={(e) => {
        const img = e.currentTarget;
        const step = img.dataset.fallbackStep || '0';
        if (step === '0' && placeholder && img.src !== placeholder) {
          // Ảnh API lỗi → thử link đã build sẵn (nguồn cũ)
          img.dataset.fallbackStep = '1';
          img.src = placeholder;
        } else if (step !== '1b' && step !== '2' && step !== '3' && original && img.src !== original) {
          img.dataset.fallbackStep = '1b';
          img.src = original;
        } else if (step !== '2' && step !== '3' && original) {
          img.dataset.fallbackStep = '2';
          img.src = `https://wsrv.nl/?url=${encodeURIComponent(original.replace(/^https?:\/\//, ''))}&default=1`;
        } else if (step !== '3' && movieSlug) {
          // Vẫn lỗi → thử lại API TMDB lần cuối (phòng khi lần đầu bị lỗi mạng tạm thời)
          img.dataset.fallbackStep = '3';
          apiPosterCache.delete(movieSlug);
          fetchApiPoster(movieSlug)
            .then((url) => { img.src = url || '/assets/logo-daophim.png'; })
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
