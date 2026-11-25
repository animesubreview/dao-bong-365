import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Heart } from 'lucide-react';
import { Movie } from '../types';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';
import PosterImg from './PosterImg';

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

// Strip HTML tags from movie.content to get a plain-text synopsis
function stripHtml(str?: string): string {
  if (!str) return '';
  return decodeHtml(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

interface BannerProps { movies: Movie[]; }

// Phim thủ công (ghim từ Admin) có trang riêng /manual/:id, phim API là /phim/:slug
const detailPath = (m: any) => (m?.isManual ? `/manual/${m.manualId}` : `/phim/${m?.slug}`);

export default function Banner({ movies }: BannerProps) {
  const [idx, setIdx] = useState(0);
  const [favSlugs, setFavSlugs] = useState<string[]>([]);
  const [detailMap, setDetailMap] = useState<Record<string, Movie>>({});
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const baseItems = movies.slice(0, 10);
  // Trộn dữ liệu chi tiết (content, category) đã fetch thêm vào — danh sách
  // "phim mới cập nhật" mặc định không kèm mô tả/thể loại như trang chi tiết.
  const items = baseItems.map(m => detailMap[m.slug] || m);

  useEffect(() => {
    const missing = baseItems.filter(m => !detailMap[m.slug] && !(m as any).isManual);
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(m =>
      movieApi.getMovieDetail(m.slug).then(r => ({ slug: m.slug, movie: r?.movie })).catch(() => null)
    )).then(results => {
      if (cancelled) return;
      setDetailMap(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r?.movie) next[r.slug] = r.movie; });
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const prevIdx = (idx - 1 + items.length) % items.length;
  const nextIdx = (idx + 1) % items.length;

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  }, [next]);

  useEffect(() => {
    if (!items.length) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [items.length, resetTimer]);

  const goTo = (i: number) => { setIdx(i); resetTimer(); };

  // ── Vuốt mượt kiểu coverflow: poster đi theo ngón tay theo thời gian thực,
  // thả tay thì "hít" về poster gần nhất (có quán tính nếu vuốt nhanh). ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; t: number; lock: 'x' | 'y' | null; step: number } | null>(null);
  const wasDraggedRef = useRef(false);

  // Dải ảnh nhỏ (PC): hiện 5 ô/lần, kéo hoặc bấm mũi tên để xem tiếp; tự cuộn tới ô đang chọn
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = stripRef.current;
    const b = c?.children[idx] as HTMLElement | undefined;
    if (!c || !b) return;
    c.scrollTo({ left: b.offsetLeft - (c.clientWidth - b.clientWidth) / 2, behavior: 'smooth' });
  }, [idx]);

  const onPointerDown = (e: React.PointerEvent) => {
    const h = stageRef.current?.clientHeight || 360;
    dragRef.current = { startX: e.clientX, startY: e.clientY, t: Date.now(), lock: null, step: h * (2 / 3) * 0.96 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      d.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.lock === 'x') { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} setDragging(true); clearInterval(timerRef.current); }
    }
    if (d.lock === 'x') setDragX(dx);
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.lock === 'x') {
      const dx = e.clientX - d.startX;
      const v = dx / Math.max(1, Date.now() - d.t); // px/ms
      // Số poster nhảy = quãng kéo + quán tính, tối đa 2
      let moved = Math.round((dx + v * 180) / d.step);
      moved = Math.max(-2, Math.min(2, moved));
      if (moved === 0 && Math.abs(dx) > 40) moved = dx > 0 ? 1 : -1;
      setDragging(false);
      setDragX(0);
      if (moved !== 0) setIdx(i => ((i - moved) % items.length + items.length) % items.length);
      resetTimer();
      wasDraggedRef.current = true;
      setTimeout(() => { wasDraggedRef.current = false; }, 60);
    }
  };
  const onPosterLinkClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) e.preventDefault();
  };

  // Đọc danh sách yêu thích để tô đậm icon trái tim (đồng bộ với trang Favorites)
  const readFavs = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('favorites') || '[]');
      const manualFavs = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
      setFavSlugs([
        ...(Array.isArray(raw) ? raw.map((m: any) => m.slug) : []),
        ...(Array.isArray(manualFavs) ? manualFavs.map((id: string) => `manual-${id}`) : []),
      ]);
    } catch { setFavSlugs([]); }
  }, []);
  useEffect(() => { readFavs(); }, [readFavs]);

  const toggleFavorite = useCallback((movie: Movie) => {
    try {
      if ((movie as any).isManual) {
        const id = (movie as any).manualId as string;
        const favs: string[] = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
        localStorage.setItem('manual_favorites', JSON.stringify(favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]));
        readFavs();
        return;
      }
      const raw = JSON.parse(localStorage.getItem('favorites') || '[]');
      const list: any[] = Array.isArray(raw) ? raw : [];
      const exists = list.some(m => m.slug === movie.slug);
      const updated = exists ? list.filter(m => m.slug !== movie.slug) : [...list, movie];
      localStorage.setItem('favorites', JSON.stringify(updated));
      readFavs();
    } catch { /* ignore */ }
  }, [readFavs]);

  const movie = items[idx];
  const isFav = useMemo(() => !!movie && favSlugs.includes(movie.slug), [movie, favSlugs]);
  const imdbVal = Number((movie as any)?.imdb?.vote_average ?? 0);
  const tmdbVal = Number((movie as any)?.tmdb?.vote_average ?? 0);
  const ratingSrc: 'IMDb' | 'TMDb' = imdbVal > 0 ? 'IMDb' : 'TMDb';
  const rawRating = imdbVal > 0 ? imdbVal : tmdbVal;
  const rating = rawRating > 0 ? rawRating.toFixed(1) : '';
  const chip = 'text-[13px] font-bold border border-white/20 text-slate-200 px-3 py-1.5 rounded-xl';
  const imdbBadge = rating ? (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-extrabold text-white border bg-black/30 pl-1 pr-2.5 py-1 rounded-lg',
      ratingSrc === 'IMDb' ? 'border-[#F5C518]/50 shadow-[0_0_14px_-4px_rgba(245,197,24,.6)]' : 'border-[#01b4e4]/50 shadow-[0_0_14px_-4px_rgba(1,180,228,.6)]')}>
      <span className={cn('text-[11px] font-black px-1.5 py-0.5 rounded', ratingSrc === 'IMDb' ? 'bg-[#F5C518] text-black' : 'bg-[#01b4e4] text-white')}>{ratingSrc}</span>{rating}
    </span>
  ) : null;

  if (!items.length) return null;

  const synopsis = stripHtml(movie?.content);
  const genres = (movie?.category || []).slice(0, 3);

  // ── Giao diện PC: nền ngang toàn chiều rộng + thông tin bên trái + dải ảnh thu nhỏ bên phải ──
  const desktopHero = (
    <div className="hidden md:block relative w-full overflow-hidden bg-slate-950" style={{ height: 'clamp(480px, 46vw, 820px)' }}>
      {items.map((m, i) => (
        <div key={m._id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === idx ? 1 : 0 }} aria-hidden={i !== idx}>
          <PosterImg
            src={movieApi.getImageUrl(m.thumb_url || m.poster_url)}
            fallbackSrc={m.thumb_url || m.poster_url}
            movieSlug={m.slug}
            loading={i === idx ? 'eager' : 'lazy'}
            className="w-full h-full object-cover object-center"
          />
        </div>
      ))}
      {/* Lớp tối: trái (để đọc chữ) + dưới (hòa vào nền trang) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

      {/* Thông tin phim */}
      <div className="absolute left-[4.5%] bottom-[14%] w-[min(52%,740px)] text-left" style={{ textShadow: '0 2px 12px rgba(0,0,0,.55)' }}>
        <h1 className="banner-title text-[clamp(30px,3.9vw,60px)] text-white leading-[1.15] mb-3 line-clamp-2">
          {decodeHtml(movie.name)}
        </h1>
        {movie.origin_name && (
          <p className="text-[var(--primary)] text-[clamp(14px,1.35vw,20px)] font-bold mb-3.5 line-clamp-1">
            {decodeHtml(movie.origin_name)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {imdbBadge}
          {movie.quality && <span className="text-xs font-extrabold bg-teal-400 text-slate-950 px-2.5 py-0.5 rounded-md">{decodeHtml(movie.quality)}</span>}
          {movie.year ? <span className="text-xs font-semibold border border-white/50 text-white px-2.5 py-0.5 rounded-md bg-black/20">{movie.year}</span> : null}
          {movie.time && <span className="text-xs font-semibold border border-white/50 text-white px-2.5 py-0.5 rounded-md bg-black/20">{decodeHtml(movie.time)}</span>}
          {movie.episode_current && <span className="text-xs font-semibold border border-white/50 text-white px-2.5 py-0.5 rounded-md bg-black/20">{decodeHtml(movie.episode_current)}</span>}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3.5">
            {genres.map(g => (
              <span key={g.id || g.slug} className="text-xs font-semibold text-slate-100 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-lg">{decodeHtml(g.name)}</span>
            ))}
          </div>
        )}
        {synopsis && <p className="text-[clamp(13px,1.15vw,17px)] text-white/90 leading-relaxed line-clamp-2 mb-5 max-w-[620px]">{synopsis}</p>}

        <div className="flex items-center gap-3">
          <Link to={detailPath(movie)} aria-label="Xem phim"
            className="w-14 h-14 rounded-full bg-[var(--primary)] text-slate-950 flex items-center justify-center shadow-[0_0_34px_-2px_rgba(34,197,94,.7)] hover:scale-105 active:scale-95 transition-transform" style={{ textShadow: 'none' }}>
            <Play size={22} className="fill-current ml-0.5" />
          </Link>
          <button type="button" aria-label="Yêu thích" onClick={() => toggleFavorite(movie)}
            className="w-11 h-11 rounded-full border border-white/40 bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-white/15 transition-colors">
            <Heart size={18} className={cn(isFav && 'fill-current text-red-500')} />
          </button>
          <Link to={detailPath(movie)} aria-label="Chi tiết"
            className="w-11 h-11 rounded-full border border-white/40 bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-white/15 transition-colors">
            <Info size={18} />
          </Link>
        </div>
      </div>

      {/* TOP 10 hôm nay — dải ảnh thu nhỏ góc phải dưới */}
      <div className="absolute right-[3%] bottom-[7%] flex flex-col items-end gap-2">
        <span className="text-[11px] font-black tracking-wider text-white/70">TOP 10 HÔM NAY</span>
        <div ref={stripRef}
          className="flex items-center gap-2 overflow-x-auto snap-x snap-proximity py-1 px-0.5 w-[clamp(300px,30vw,480px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((m, i) => (
            <button key={m._id} type="button" onClick={() => goTo(i)} aria-label={decodeHtml(m.name)} aria-current={i === idx}
              className={cn('snap-start shrink-0 w-[calc((100%-40px)/6)] aspect-[16/10] rounded-md overflow-hidden border-2 transition-all duration-300',
                i === idx ? 'border-[var(--primary)] opacity-100 scale-105' : 'border-transparent opacity-70 hover:opacity-100')}>
              <PosterImg
                src={movieApi.getImageUrl(m.thumb_url || m.poster_url)}
                fallbackSrc={m.thumb_url || m.poster_url}
                movieSlug={m.slug}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const n = items.length;
  const stageH = 'clamp(340px, 98vw, 560px)';
  // Vị trí tương đối (có phần lẻ khi đang kéo) của từng poster so với poster giữa
  const offsetOf = (i: number) => {
    let o = i - idx;
    if (o > n / 2) o -= n;
    if (o < -n / 2) o += n;
    return o;
  };
  const ease = 'transform 550ms cubic-bezier(.22,1,.36,1), opacity 550ms ease';

  return (
    <>
    {desktopHero}
    <div className="relative w-full overflow-hidden pt-5 pb-5 md:hidden">
      {/* Nền kính: backdrop poster phim đang chọn, blur rất mạnh + chuyển mờ dần khi đổi slide */}
      <div className="absolute inset-0 -z-10 bg-slate-950">
        {items.map((m, i) => (
          <img
            key={m._id}
            src={movieApi.getImageUrl(m.thumb_url || m.poster_url)}
            alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl saturate-150 transition-opacity duration-700"
            style={{ opacity: i === idx ? 0.55 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950" />
      </div>

      {/* Coverflow: poster giữa lớn, 2 bên nghiêng + thu nhỏ + mờ — vuốt trái/phải mượt */}
      <div
        ref={stageRef}
        className="relative mx-auto select-none"
        style={{ height: stageH, maxWidth: 820, touchAction: 'pan-y', perspective: 1100 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Vầng sáng theo màu poster, nằm sau poster giữa */}
        <img key={`aura-${movie._id}`} aria-hidden="true"
          src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)} alt=""
          className="absolute left-1/2 top-1/2 h-[92%] -translate-x-1/2 -translate-y-[44%] scale-105 blur-2xl saturate-200 opacity-60 pointer-events-none"
          style={{ aspectRatio: '2/3', animation: 'bn-rise .6s ease-out both' }} />
        {items.map((m, i) => {
          const base = offsetOf(i);
          if (Math.abs(base) > 2.6) return null;
          const stepPx = (stageRef.current?.clientHeight || 360) * (2 / 3) * 0.96;
          const f = base + (dragging ? dragX / stepPx : 0); // vị trí thực tế theo ngón tay
          const af = Math.min(Math.abs(f), 2);
          const isCenter = base === 0;
          return (
            <Link
              key={m._id}
              to={detailPath(m)}
              draggable={false}
              onClick={(e) => {
                if (wasDraggedRef.current) { e.preventDefault(); return; }
                if (!isCenter) { e.preventDefault(); goTo(i); }
              }}
              aria-label={decodeHtml(m.name)}
              className="absolute left-1/2 top-1/2 block h-[92%] rounded-2xl overflow-hidden border border-white/25 shadow-2xl shadow-black/60 bg-slate-800"
              style={{
                aspectRatio: '2/3',
                transform: `translate(-50%, -50%) translateX(${f * 104}%) rotateY(${-f * 12}deg) rotateZ(${f * 7}deg) scale(${1 - af * 0.1})`,
                opacity: Math.max(0, 1 - af * 0.35),
                zIndex: 20 - Math.round(af * 5),
                transition: dragging ? 'none' : ease,
                willChange: 'transform, opacity',
                borderColor: isCenter ? 'rgba(255,255,255,0.9)' : undefined,
                borderWidth: isCenter ? 2 : 1,
                boxShadow: isCenter ? '0 28px 60px -14px rgba(0,0,0,.75), 0 0 46px -8px rgba(34,197,94,.4)' : undefined,
              }}
            >
              <PosterImg
                src={movieApi.getImageUrl(m.poster_url || m.thumb_url)}
                fallbackSrc={m.poster_url || m.thumb_url}
                movieSlug={m.slug}
                alt={m.name}
                loading={Math.abs(base) <= 1 ? 'eager' : 'lazy'}
                className="w-full h-full object-cover pointer-events-none"
              />
              {!isCenter && <div className="absolute inset-0 bg-slate-950/35" />}
              {isCenter && (
                <>
                  {/* Vệt sáng quét chéo qua poster */}
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    style={{ animation: 'bn-shine 4.8s ease-in-out infinite' }} />
                  {rating && (
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-sm pl-0.5 pr-1.5 py-0.5 text-[12px] font-extrabold text-white">
                      <span className="bg-[#F5C518] text-black text-[10px] font-black px-1 py-px rounded">IMDb</span>{rating}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* Thông tin phim — chữ đặt thẳng lên nền mờ, giống ảnh mẫu */}
      <div className="max-w-xl mx-auto px-5 pt-5 text-center">
        <h1 key={`t-${movie._id}`} className="banner-title text-[26px] sm:text-3xl md:text-4xl text-white leading-[1.2] mb-2 line-clamp-2" style={{ animation: 'bn-rise .55s ease-out both' }}>
          {decodeHtml(movie.name)}
        </h1>
        {movie.origin_name && (
          <p key={`o-${movie._id}`} className="text-slate-400 text-[13px] sm:text-sm font-semibold uppercase tracking-[0.18em] mb-5 line-clamp-2" style={{ animation: 'bn-rise .55s .08s ease-out both' }}>
            {decodeHtml(movie.origin_name)}
          </p>
        )}

        {/* Nút: "Xem Phim" dài + 1 viên liền chia đôi (yêu thích | chi tiết) */}
        <div className="flex items-stretch gap-3 mb-5">
          <Link
            to={detailPath(movie)}
            className="relative overflow-hidden flex-1 h-12 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-slate-950 font-extrabold text-[15px] flex items-center justify-center gap-2 active:scale-95 hover:brightness-110 transition-all"
            style={{ animation: 'bn-glow 2.4s ease-in-out infinite' }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              style={{ animation: 'bn-shine 3s ease-in-out infinite' }} />
            <Play size={18} className="fill-current relative" style={{ animation: 'bn-pulse 1.6s ease-in-out infinite' }} />
            <span className="relative">Xem Phim</span>
          </Link>
          <div className="flex-1 h-12 rounded-full border border-white/15 bg-black/30 backdrop-blur flex items-center overflow-hidden">
            <button
              type="button" aria-label="Yêu thích" onClick={() => toggleFavorite(movie)}
              className="flex-1 h-full flex items-center justify-center text-white active:bg-white/10"
            >
              <Heart size={20} className={cn('fill-current', isFav && 'text-red-500')} />
            </button>
            <span className="w-px h-6 bg-white/15" />
            <Link
              to={detailPath(movie)} aria-label="Chi tiết"
              className="flex-1 h-full flex items-center justify-center text-white active:bg-white/10"
            >
              <Info size={20} className="fill-current text-white [&_circle]:fill-white [&_path]:stroke-slate-900" />
            </Link>
          </div>
        </div>

        {/* Badge 1 hàng: điểm · năm · chất lượng · tập */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
          {imdbBadge}
          {movie.year ? <span className={chip}>{movie.year}</span> : null}
          {movie.quality && <span className={chip}>{decodeHtml(movie.quality)}</span>}
          {movie.episode_current && <span className={chip}>{decodeHtml(movie.episode_current)}</span>}
        </div>

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {items.map((m, i) => (
              <button
                key={m._id} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === idx ? 'w-8 bg-slate-100' : 'w-2 bg-slate-500 hover:bg-slate-400'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
