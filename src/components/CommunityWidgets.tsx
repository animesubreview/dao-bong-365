import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Heart, Shield, TrendingUp, ArrowUp, ArrowDown, Minus, Flame } from 'lucide-react';
import { getRecentComments, getCommentCountsSince, getCommentLikesSince } from '../lib/comments';
import { movieApi } from '../services/api';
import type { Comment } from '../types';

function dec(s: string) {
  return (s || '').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

/** Tra cứu tên phim + ảnh thumb theo slug (dùng chung cho cả 2 widget bên dưới, có cache) */
function useMovieLookup(slugs: string[]) {
  const [map, setMap] = useState<Record<string, { name: string; thumb_url: string }>>({});
  useEffect(() => {
    const missing = [...new Set(slugs)].filter(s => s && !map[s]);
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(slug =>
      movieApi.getMovieDetail(slug).then(r => ({ slug, movie: r?.movie })).catch(() => null)
    )).then(results => {
      if (cancelled) return;
      setMap(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r?.movie) next[r.slug] = { name: r.movie.name, thumb_url: r.movie.thumb_url || r.movie.poster_url }; });
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(',')]);
  return map;
}

/* ═══════════════ BÌNH LUẬN MỚI ═══════════════ */
export function RecentCommentsSection() {
  const [comments, setComments] = useState<Comment[] | null>(null);

  useEffect(() => {
    getRecentComments(9).then(setComments);
  }, []);

  const movieMap = useMovieLookup((comments || []).map(c => c.movieSlug));

  if (comments && comments.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />
        <h2 className="text-base md:text-lg font-black text-white tracking-tight">Bình Luận Mới</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0 pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {comments === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 rounded-2xl bg-slate-800/40 animate-pulse" style={{ width: 280, height: 140 }} />
            ))
          : comments.map(c => {
              const movie = movieMap[c.movieSlug];
              return (
                <div key={c.id} className="shrink-0 rounded-2xl bg-slate-900/70 border border-slate-800/60 p-3.5"
                  style={{ width: 280, scrollSnapAlign: 'start' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <img src={c.avatar} alt={c.username} className="w-9 h-9 rounded-full bg-slate-700" />
                        {c.isAdminReply && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow">
                            <Shield size={9} className="text-white fill-current" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.isAdminReply && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">ADMIN</span>
                          )}
                          <span className={`text-[13px] font-bold truncate ${c.isAdminReply ? 'text-amber-300' : 'text-white'}`}>{c.username}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                    {movie && (
                      <Link to={`/phim/${c.movieSlug}`} className="shrink-0 w-9 h-12 rounded-md overflow-hidden bg-slate-800 border border-slate-700">
                        <img src={movieApi.getImageUrl(movie.thumb_url)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </Link>
                    )}
                  </div>
                  <p className="text-[12.5px] text-slate-300 leading-relaxed mt-2.5 line-clamp-2">
                    {c.replyToUsername && <span className="text-green-400 font-bold mr-1">@{c.replyToUsername}</span>}
                    {c.content}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Heart size={12} className={c.likes.length > 0 ? 'text-red-400 fill-current' : ''} /> {c.likes.length}
                    </span>
                    {movie && (
                      <Link to={`/phim/${c.movieSlug}`} className="text-[11px] font-semibold text-slate-500 truncate max-w-[150px] hover:text-green-400 transition-colors">
                        {dec(movie.name)}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}

/* ═══════════════ SÔI NỔI NHẤT — xếp hạng theo lượng bình luận thật ═══════════════ */
export function TrendingMoviesSection() {
  const [rows, setRows] = useState<{ slug: string; count: number; trend: 'up' | 'down' | 'same' | 'new' }[] | null>(null);

  useEffect(() => {
    const day = 86400000;
    const now = Date.now();
    Promise.all([
      getCommentCountsSince(now - 7 * day),   // 7 ngày gần nhất
      getCommentCountsSince(now - 14 * day),  // gộp 14 ngày gần nhất (để suy ra 7 ngày trước đó)
    ]).then(([current, cumulative14]) => {
      const previous: Record<string, number> = {};
      Object.keys(cumulative14).forEach(slug => { previous[slug] = (cumulative14[slug] || 0) - (current[slug] || 0); });

      const currentTop = Object.entries(current).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const previousRank = Object.entries(previous).sort((a, b) => b[1] - a[1]).map(([slug]) => slug);

      setRows(currentTop.map(([slug, count], currentIdx) => {
        const prevIdx = previousRank.indexOf(slug);
        const trend: 'up' | 'down' | 'same' | 'new' =
          prevIdx === -1 ? 'new'
          : prevIdx === currentIdx ? 'same'
          : prevIdx > currentIdx ? 'up'
          : 'down';
        return { slug, count, trend };
      }));
    }).catch(() => setRows([]));
  }, []);

  const movieMap = useMovieLookup((rows || []).map(r => r.slug));

  if (rows && rows.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />
        <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
          <TrendingUp size={20} className="text-orange-400" /> Sôi Nổi Nhất
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2 mb-3">Xếp hạng theo lượng bình luận trong 7 ngày qua</p>
      <div className="flex flex-col gap-1.5">
        {rows === null
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)
          : rows.map((r, i) => {
              const movie = movieMap[r.slug];
              return (
                <Link key={r.slug} to={`/phim/${r.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors">
                  <span className={`text-lg font-black w-5 text-center shrink-0 ${i < 3 ? 'text-orange-400' : 'text-slate-600'}`}>{i + 1}</span>
                  <span className="shrink-0">
                    {r.trend === 'up' && <ArrowUp size={14} className="text-green-400" />}
                    {r.trend === 'down' && <ArrowDown size={14} className="text-red-400" />}
                    {r.trend === 'same' && <Minus size={14} className="text-slate-600" />}
                    {r.trend === 'new' && <span className="text-[9px] font-black text-green-400">MỚI</span>}
                  </span>
                  {movie ? (
                    <img src={movieApi.getImageUrl(movie.thumb_url)} alt="" referrerPolicy="no-referrer"
                      className="w-9 h-12 rounded-md object-cover bg-slate-800 shrink-0" />
                  ) : <div className="w-9 h-12 rounded-md bg-slate-800 shrink-0" />}
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-200 truncate">{movie ? dec(movie.name) : r.slug}</span>
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <MessageSquareText size={12} /> {r.count}
                  </span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}

/* ═══════════════ YÊU THÍCH NHẤT — xếp hạng theo lượt thích bình luận thật ═══════════════ */
export function FavoriteMoviesSection() {
  const [rows, setRows] = useState<{ slug: string; likes: number }[] | null>(null);

  useEffect(() => {
    const day = 86400000;
    getCommentLikesSince(Date.now() - 30 * day)
      .then(map => {
        const top = Object.entries(map)
          .filter(([, n]) => n > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([slug, likes]) => ({ slug, likes }));
        setRows(top);
      })
      .catch(() => setRows([]));
  }, []);

  const movieMap = useMovieLookup((rows || []).map(r => r.slug));

  if (rows && rows.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />
        <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Heart size={18} className="text-pink-400" /> Yêu Thích Nhất
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2 mb-3">Xếp hạng theo lượt thích bình luận trong 30 ngày qua</p>
      <div className="flex flex-col gap-1.5">
        {rows === null
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)
          : rows.map((r, i) => {
              const movie = movieMap[r.slug];
              return (
                <Link key={r.slug} to={`/phim/${r.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors">
                  <span className={`text-lg font-black w-5 text-center shrink-0 ${i < 3 ? 'text-pink-400' : 'text-slate-600'}`}>{i + 1}</span>
                  {movie ? (
                    <img src={movieApi.getImageUrl(movie.thumb_url)} alt="" referrerPolicy="no-referrer"
                      className="w-9 h-12 rounded-md object-cover bg-slate-800 shrink-0" />
                  ) : <div className="w-9 h-12 rounded-md bg-slate-800 shrink-0" />}
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-200 truncate">{movie ? dec(movie.name) : r.slug}</span>
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Heart size={12} className="text-pink-400" /> {r.likes}
                  </span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}

/* ═══════════════ THỂ LOẠI HOT — xếp hạng thể loại theo số lượng phim hiện có ═══════════════ */
const HOT_GENRE_CANDIDATES = [
  { label: 'Hành Động', value: 'hanh-dong' },
  { label: 'Tình Cảm',  value: 'tinh-cam' },
  { label: 'Kinh Dị',   value: 'kinh-di' },
  { label: 'Hài Hước',  value: 'hai-huoc' },
  { label: 'Cổ Trang',  value: 'co-trang' },
  { label: 'Hình Sự',   value: 'hinh-su' },
  { label: 'Viễn Tưởng',value: 'vien-tuong' },
];

export function HotGenresSection() {
  const [rows, setRows] = useState<{ label: string; value: string; count: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(HOT_GENRE_CANDIDATES.map(g =>
      movieApi.filterMovies({ type: 'phim-bo', category: g.value, page: 1, limit: 1 })
        .then(r => ({ ...g, count: r.pagination?.totalItems || 0 }))
        .catch(() => ({ ...g, count: 0 }))
    )).then(results => {
      if (cancelled) return;
      setRows(results.sort((a, b) => b.count - a.count).slice(0, 5));
    });
    return () => { cancelled = true; };
  }, []);

  if (rows && rows.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-4 md:h-5 rounded-full inline-block shrink-0 bg-white" />
        <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Flame size={18} className="text-amber-400" /> Thể Loại Hot
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2 mb-3">Thể loại có nhiều phim nhất hiện nay</p>
      <div className="flex flex-col gap-1.5">
        {rows === null
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-800/40 animate-pulse" />)
          : rows.map((g, i) => (
              <Link key={g.value} to={`/type/phim-bo?category=${g.value}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors">
                <span className={`text-lg font-black w-5 text-center shrink-0 ${i < 3 ? 'text-amber-400' : 'text-slate-600'}`}>{i + 1}</span>
                <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-200 truncate">{g.label}</span>
                <span className="shrink-0 text-[11px] font-semibold text-slate-500">{g.count.toLocaleString('vi-VN')} phim</span>
              </Link>
            ))}
      </div>
    </section>
  );
}
