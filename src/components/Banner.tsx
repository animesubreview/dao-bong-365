import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

/**
 * Banner poster-carousel — center nổi bật, 2 bên mờ/nhỏ hơn, chấm phân trang
 * bên dưới, tên phim ở giữa. Theo đúng mẫu trang chủ Phim Tuổi Thơ.
 */
export default function Banner({ movies }: BannerProps) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const items = movies.slice(0, 8);
  const n = items.length;

  const next = useCallback(() => setIdx(i => (i + 1) % n), [n]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4500);
  }, [next]);

  useEffect(() => {
    if (!n) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [n, resetTimer]);

  const goTo = (i: number) => { setIdx(((i % n) + n) % n); resetTimer(); };

  // ═══ Vuốt (swipe) trái/phải để chuyển banner ═══════════════════════════
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Chỉ coi là vuốt ngang khi di chuyển ngang rõ rệt hơn dọc (tránh chặn cuộn trang)
    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      touchDeltaX.current = dx;
      e.preventDefault();
    }
  };

  const justSwiped = useRef(false);

  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    const threshold = 40;
    if (isSwiping.current) {
      if (Math.abs(delta) > threshold) {
        if (delta < 0) goTo(idx + 1); // vuốt trái → phim tiếp theo
        else goTo(idx - 1); // vuốt phải → phim trước đó
      }
      // Đánh dấu vừa vuốt để chặn click-điều-hướng ăn theo ngay sau đó
      justSwiped.current = true;
      setTimeout(() => { justSwiped.current = false; }, 150);
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  };

  // Hỗ trợ kéo bằng chuột (desktop)
  const mouseStartX = useRef<number | null>(null);
  const mouseDeltaX = useRef(0);
  const isMouseDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    mouseDeltaX.current = 0;
    isMouseDragging.current = true;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDragging.current || mouseStartX.current === null) return;
    mouseDeltaX.current = e.clientX - mouseStartX.current;
  };
  const endMouseDrag = () => {
    if (!isMouseDragging.current) return;
    const delta = mouseDeltaX.current;
    const threshold = 40;
    if (Math.abs(delta) > threshold) {
      if (delta < 0) goTo(idx + 1);
      else goTo(idx - 1);
      justSwiped.current = true;
      setTimeout(() => { justSwiped.current = false; }, 150);
    }
    isMouseDragging.current = false;
    mouseStartX.current = null;
    mouseDeltaX.current = 0;
  };

  if (!n) return null;
  const movie = items[idx];

  return (
    <div className="relative w-full bg-slate-950 pt-4 pb-2 overflow-hidden" style={{ marginTop: '-56px', paddingTop: '68px' }}>
      {/* Coverflow: poster giữa nổi bật, 2 bên mờ nhỏ hơn.
          Chiều cao container = 0.84 * chiều rộng (khớp đúng với poster giữa: 56% rộng × tỉ lệ 2:3),
          dùng aspect-ratio thay vì áng chừng theo vw để KHÔNG BAO GIỜ bị tràn đè lên tiêu đề bên dưới. */}
      <div
        className="relative mx-auto select-none cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: '1 / 0.84', maxWidth: 480, width: '100%', touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endMouseDrag}
        onMouseLeave={endMouseDrag}
      >
        {items.map((item, i) => {
          let offset = i - idx;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          if (Math.abs(offset) > 1) return null;
          const isCenter = offset === 0;
          return (
            <Link
              key={item._id}
              to={`/phim/${item.slug}`}
              onClick={(e) => {
                if (justSwiped.current) { e.preventDefault(); return; }
                if (!isCenter) { e.preventDefault(); goTo(i); }
              }}
              className="absolute top-0 left-1/2 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ease-out bg-slate-800"
              style={{
                width: isCenter ? '56%' : '42%',
                aspectRatio: '2/3',
                transform: `translateX(calc(-50% + ${offset * 82}%)) scale(${isCenter ? 1 : 0.86})`,
                zIndex: isCenter ? 10 : 5,
                filter: isCenter ? 'none' : 'brightness(0.4)',
                opacity: isCenter ? 1 : 0.9,
              }}
            >
              <img
                src={movieApi.getImageUrl(item.poster_url || item.thumb_url)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              {isCenter && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Tên phim — giữa, đậm, trắng */}
      <div className="text-center mt-4 px-6">
        <Link
          to={`/phim/${movie.slug}`}
          className="inline-block text-white font-black text-base sm:text-xl leading-tight line-clamp-1 hover:text-yellow-400 transition-colors"
        >
          {decodeHtml(movie.name)}
        </Link>
      </div>

      {/* Chấm phân trang */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn('h-1.5 rounded-full transition-all', i === idx ? 'w-5 bg-yellow-400' : 'w-1.5 bg-slate-700')}
          />
        ))}
      </div>
    </div>
  );
}
