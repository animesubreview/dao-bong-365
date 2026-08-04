import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Info } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';
import { getCurrentUser, onAuthChange } from '../lib/auth';
import { isFavorited, addFavorite, removeFavorite } from '../lib/favorites';

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
    <>
      {/* ═══════════════ MOBILE — coverflow poster (giữ nguyên) ═══════════════ */}
      <div className="md:hidden relative w-full bg-slate-950 pt-4 pb-2 overflow-hidden" style={{ marginTop: '-56px', paddingTop: '68px' }}>
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

      {/* ═══════════════ DESKTOP — hero banner full-bleed (mẫu DaoPhim) ═══════════════ */}
      <DesktopHero items={items} idx={idx} goTo={goTo} />
    </>
  );
}

/* ─── DesktopHero — banner lớn full-width: backdrop, tên phim, badge, mô tả,
   nút Play/Yêu thích/Thông tin, dải thumbnail phim khác góc phải dưới ───────── */
function DesktopHero({ items, idx, goTo }: { items: Movie[]; idx: number; goTo: (i: number) => void }) {
  const movie = items[idx];
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setUid(u?.uid || null);
    const unsub = onAuthChange(user => setUid(user?.uid || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid || !movie) { setIsFav(false); return; }
    isFavorited(uid, 'api', movie.slug).then(setIsFav);
  }, [uid, movie?.slug]);

  const toggleFavorite = async () => {
    if (!movie) return;
    if (!uid) {
      navigate('/auth');
      return;
    }
    setIsFav(v => !v); // optimistic
    if (isFav) {
      await removeFavorite(uid, 'api', movie.slug);
    } else {
      await addFavorite(uid, {
        type: 'api', slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url,
        poster_url: movie.poster_url, year: movie.year, quality: movie.quality, lang: movie.lang,
      });
    }
  };

  if (!movie) return null;

  return (
    <div
      className="hidden md:block relative w-full overflow-hidden bg-slate-950"
      style={{ height: 'min(74vh, 640px)', minHeight: 420, marginTop: '-64px' }}
    >
      {/* Backdrop — crossfade giữa các phim */}
      {items.map((item, i) => (
        <img
          key={item._id}
          src={movieApi.getImageUrl(item.thumb_url || item.poster_url)}
          alt=""
          referrerPolicy="no-referrer"
          aria-hidden={i !== idx}
          className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out',
            i === idx ? 'opacity-100' : 'opacity-0')}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Gradient để chữ luôn rõ, dù ảnh sáng/tối */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/5 to-black/10" />

      {/* Nội dung: tên phim, badge, mô tả, nút hành động */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center">
        <div className="max-w-lg pt-14">
          <Link to={`/phim/${movie.slug}`} className="group">
            <h1 className="text-white font-black text-3xl lg:text-4xl leading-tight drop-shadow-lg line-clamp-2 group-hover:text-yellow-400 transition-colors">
              {decodeHtml(movie.name)}
            </h1>
          </Link>
          {movie.origin_name && movie.origin_name !== movie.name && (
            <p className="text-slate-300 text-sm font-semibold mt-1.5 line-clamp-1">{decodeHtml(movie.origin_name)}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {movie.quality && (
              <span className="bg-yellow-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md">{movie.quality}</span>
            )}
            {!!movie.year && (
              <span className="bg-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/15">{movie.year}</span>
            )}
            {movie.time && (
              <span className="bg-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/15">{movie.time}</span>
            )}
          </div>

          {movie.content && (
            <p className="text-slate-300 text-sm leading-relaxed mt-4 line-clamp-3">
              {decodeHtml(movie.content.replace(/<[^>]*>/g, ''))}
            </p>
          )}

          <div className="flex items-center gap-3 mt-6">
            <Link
              to={`/phim/${movie.slug}`}
              aria-label="Xem ngay"
              className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-yellow-400 transition-colors shadow-lg"
            >
              <Play size={20} fill="currentColor" />
            </Link>
            <button
              onClick={toggleFavorite}
              aria-label="Yêu thích"
              className={cn('w-11 h-11 rounded-full flex items-center justify-center border transition-colors shadow-lg',
                isFav ? 'bg-yellow-400 border-yellow-400 text-slate-950' : 'bg-white/10 border-white/25 text-white hover:bg-white/20')}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>
            <Link
              to={`/phim/${movie.slug}`}
              aria-label="Thông tin phim"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/25 text-white flex items-center justify-center hover:bg-white/20 transition-colors shadow-lg"
            >
              <Info size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Dải thumbnail các phim khác trong banner — góc phải dưới */}
      <div className="absolute bottom-5 right-6 lg:right-10 z-10 flex items-end gap-2">
        {items.map((item, i) => (
          <button
            key={item._id}
            onClick={() => goTo(i)}
            aria-label={item.name}
            className={cn('relative rounded-lg overflow-hidden shrink-0 transition-all duration-300 shadow-lg',
              i === idx ? 'w-24 h-14 ring-2 ring-yellow-400' : 'w-14 h-9 opacity-55 hover:opacity-90')}
          >
            <img
              src={movieApi.getImageUrl(item.thumb_url || item.poster_url)}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
