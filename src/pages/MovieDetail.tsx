import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Share2, Plus, MessageCircle, Star, ChevronRight, Clock, Calendar, Globe, Film, ChevronDown, ChevronUp } from 'lucide-react';
import { movieApi, getNguonCDetail, mergeNguonCEpisodes, nguonCToMovie, getOPhimDetail, mergeOPhimEpisodes } from '../services/api';
import { Movie, Episode } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import PopupAd from '../components/PopupAd';
import CommentSection from '../components/CommentSection';
import AdBanner from '../components/AdBanner';
import { getMovieOverride, mergeOverride } from '../lib/movieOverrides';
import { useSEO } from '../hooks/useSEO';

type Tab = 'episodes' | 'info' | 'actors' | 'suggest';

export default function MovieDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedServer, setSelectedServer] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('episodes');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [tmdbImages, setTmdbImages] = useState<{ posters: string[]; backdrops: string[] }>({ posters: [], backdrops: [] });
  const navigate = useNavigate();

  // ── Dynamic SEO cho trang phim ──────────────────────────────────
  const isTV = episodes.length > 0 && (episodes[0]?.server_data?.length ?? 0) > 1;
  const seoImage = movieApi.getImageUrl(movie?.poster_url || movie?.thumb_url || '');
  const seoDesc = movie
    ? `Xem ${movie.name}${movie.origin_name ? ` (${movie.origin_name})` : ''} ${movie.year || ''} Vietsub HD miễn phí tại Đảo Phim. ${movie.content?.replace(/<[^>]*>/g, '').slice(0, 120) || ''}`
    : '';

  useSEO({
    title:       movie ? `${movie.name}${movie.origin_name && movie.origin_name !== movie.name ? ` - ${movie.origin_name}` : ''} (${movie.year || ''}) Vietsub HD` : undefined,
    description: seoDesc || undefined,
    image:       seoImage || undefined,
    url:         slug ? `/phim/${slug}` : undefined,
    type:        isTV ? 'video.tv_show' : 'movie',
    movie:       movie as any,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const [res, override, nguonC, ophim, tmdbImgs] = await Promise.all([
          movieApi.getMovieDetail(slug).catch((err) => { console.warn('[KKPhim] lỗi lấy chi tiết phim:', err); return { status: false, movie: null, episodes: [] } as any; }),
          getMovieOverride(slug).catch((err) => { console.warn('[Override] lỗi:', err); return null; }),
          getNguonCDetail(slug).catch((err) => { console.warn('[NguonC] lỗi lấy chi tiết phim:', err); return null; }),
          getOPhimDetail(slug).catch((err) => { console.warn('[OPhim] lỗi lấy chi tiết phim:', err); return null; }),
          movieApi.getMovieImagesV1(slug).catch(() => ({ posters: [], backdrops: [] })),
        ]);
        setTmdbImages(tmdbImgs);
        // Merge override vào movie data - override field nào thì hiện field đó
        // Nếu KKPhim không có phim này nhưng NguonC có → dùng NguonC làm nguồn chính
        let movieData = res.movie;
        let baseEpisodes = res.episodes || [];

        if (!movieData && nguonC) {
          movieData = nguonCToMovie(nguonC);
          baseEpisodes = mergeNguonCEpisodes([], nguonC);
        } else {
          baseEpisodes = mergeNguonCEpisodes(baseEpisodes, nguonC);
        }

        setMovie(mergeOverride(movieData, override));
        // Merge OPhim vào cuối
        setEpisodes(mergeOPhimEpisodes(baseEpisodes, ophim));
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        setIsFavorite(favorites.some((f: any) => f.slug === slug));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [slug]);

  const toggleFavorite = () => {
    if (!movie) return;
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      localStorage.setItem('favorites', JSON.stringify(favorites.filter((f: any) => f.slug !== slug)));
    } else {
      favorites.push({ id: movie._id, name: movie.name, slug: movie.slug, thumb_url: movie.thumb_url, poster_url: movie.poster_url, year: movie.year, quality: movie.quality, lang: movie.lang });
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    setIsFavorite(!isFavorite);
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: movie?.name, url: window.location.href });
    else navigator.clipboard?.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-green-400 font-bold text-sm">Đang tải phim...</p>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <p className="text-slate-400">Phim không tồn tại</p>
        <Link to="/" className="text-green-400 font-bold">← Về trang chủ</Link>
      </div>
    );
  }

  const posterUrl = tmdbImages.posters[0] || movieApi.getImageUrl(movie.poster_url || movie.thumb_url) || '/assets/logo-daophim.png';
  const thumbUrl = tmdbImages.backdrops[0] || movieApi.getImageUrl(movie.thumb_url || movie.poster_url) || '/assets/logo-daophim.png';
  const firstEpisode = episodes[0]?.server_data[0];
  const currentServer = episodes[selectedServer];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'episodes', label: 'Tập phim' },
    { key: 'info', label: 'Thông tin' },
    { key: 'actors', label: 'Diễn viên' },
    { key: 'suggest', label: 'Đề xuất' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <PopupAd movieKey={slug || ''} />

      {/* ══ HERO BANNER – full width giống RoPhim ══ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(300px, 48vw, 580px)', marginTop: '-56px', paddingTop: '56px' }}
      >
        <img src={thumbUrl} alt={movie.name} referrerPolicy="no-referrer"
          onError={(e) => {
            const fallback = movieApi.getImageUrl(movie.thumb_url || movie.poster_url);
            if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
            else e.currentTarget.src = '/assets/logo-daophim.png';
          }}
          className="w-full h-full object-cover object-top" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent" />
        {/* dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[0,1,2,3].map(i => (
            <span key={i} className={cn('h-0.5 rounded-full', i === 0 ? 'w-8 bg-green-500' : 'w-4 bg-slate-600')} />
          ))}
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* Poster + Action bar row */}
        <div className="flex flex-col md:flex-row gap-0 -mt-10 md:-mt-16 relative z-10">

          {/* Poster – PC only left column */}
          <div className="hidden md:block shrink-0 w-44 lg:w-52">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-800/60" style={{ aspectRatio: '2/3' }}>
              <img src={posterUrl} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
                onError={(e) => {
                  const fallback = movieApi.getImageUrl(movie.poster_url || movie.thumb_url);
                  if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                  else e.currentTarget.src = '/assets/logo-daophim.png';
                }} />
            </div>
          </div>

          {/* Right column: actions + ad */}
          <div className="flex-1 md:pl-6 flex flex-col justify-end">

            {/* Mobile: small poster + title */}
            <div className="flex md:hidden items-end gap-4 mb-4">
              <div className="w-24 shrink-0 rounded-xl overflow-hidden shadow-xl border border-slate-800/60" style={{ aspectRatio: '2/3' }}>
                <img src={posterUrl} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
                onError={(e) => {
                  const fallback = movieApi.getImageUrl(movie.poster_url || movie.thumb_url);
                  if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                  else e.currentTarget.src = '/assets/logo-daophim.png';
                }} />
              </div>
              <div className="pb-1">
                <h1 className="text-lg font-black text-white leading-tight line-clamp-2">{movie.name}</h1>
                {movie.origin_name && movie.origin_name !== movie.name && (
                  <p className="text-green-400 text-xs font-semibold mt-0.5">{movie.origin_name}</p>
                )}
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-4 md:gap-6 mb-4">
              {firstEpisode ? (
                <Link
                  to={`/watch/${movie.slug}/${firstEpisode.slug}?server=${encodeURIComponent(episodes[0]?.server_name || '')}`}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-slate-950 font-black px-7 py-3 rounded-full text-sm shadow-lg shadow-green-500/25 transition-all active:scale-95 shrink-0"
                >
                  <Play className="fill-current" size={16} /> Xem Ngay
                </Link>
              ) : (
                <div className="flex items-center gap-2 bg-slate-700 text-slate-400 font-black px-7 py-3 rounded-full text-sm cursor-not-allowed shrink-0">
                  <Play size={16} /> Chưa Có
                </div>
              )}

              <div className="flex items-center gap-5 md:gap-6">
                <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
                  <Heart size={22} className={cn('transition-colors', isFavorite ? 'fill-current text-red-500' : 'text-slate-300 group-hover:text-red-400')} />
                  <span className="text-[10px] text-slate-500 hidden md:block">Yêu thích</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <Plus size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                  <span className="text-[10px] text-slate-500 hidden md:block">Thêm vào</span>
                </button>
                <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                  <Share2 size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                  <span className="text-[10px] text-slate-500 hidden md:block">Chia sẻ</span>
                </button>
                <button onClick={() => setActiveTab('episodes')} className="flex flex-col items-center gap-1 group">
                  <MessageCircle size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                  <span className="text-[10px] text-slate-500 hidden md:block">Bình luận</span>
                </button>
              </div>

              {/* Rating chip – PC right */}
              <div className="hidden md:flex items-center gap-2 ml-auto bg-indigo-600/80 border border-indigo-500/50 text-white text-xs font-black px-3 py-2 rounded-xl">
                <Star size={14} className="fill-current text-green-400" />
                <span>0</span>
                <span className="font-normal text-indigo-300">Đánh giá</span>
              </div>
            </div>

            {/* Ad Banner */}
            <AdBanner position="top" className="rounded-xl overflow-hidden" />
          </div>
        </div>

        {/* Title (PC) + Badges */}
        <div className="mt-5 md:mt-6">
          <div className="hidden md:block mb-3">
            <p className="text-2xl lg:text-3xl font-black text-white leading-tight">{movie.name}</p>
            {movie.origin_name && movie.origin_name !== movie.name && (
              <p className="text-green-400 text-sm font-semibold mt-1">{movie.origin_name}</p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {movie.quality && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-green-500 text-slate-950">IMDb</span>
            )}
            {movie.quality && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.quality}</span>
            )}
            {movie.year && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.year}</span>
            )}
            {movie.episode_current && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.episode_current}</span>
            )}
            {movieApi.cleanLang(movie.lang || '') && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movieApi.cleanLang(movie.lang || '')}</span>
            )}
          </div>

          {/* TABS */}
          <div className="border-b border-slate-800 mb-5">
            <div className="flex gap-0">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-3 text-sm font-bold border-b-2 transition-all -mb-px',
                    activeTab === tab.key
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Tập phim */}
              {activeTab === 'episodes' && (
                <div>
                  {episodes.length > 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
                      {episodes.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {episodes.map((ep, idx) => (
                            <button key={idx} onClick={() => setSelectedServer(idx)}
                              className={cn(
                                'text-[11px] font-black px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5',
                                selectedServer === idx
                                  ? 'bg-green-500/10 border-green-500/60 text-green-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                              )}>
                              {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                              {movieApi.cleanServerName(ep.server_name)}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-60 overflow-y-auto pr-1">
                        {currentServer?.server_data.map((ep, eIdx) => (
                          <Link key={eIdx}
                            to={`/watch/${movie.slug}/${ep.slug}?server=${encodeURIComponent(currentServer.server_name)}`}
                            className="bg-slate-800 border border-slate-700 hover:border-green-500 hover:bg-green-500/10 text-slate-400 hover:text-green-400 py-2 rounded-lg text-center text-[11px] font-bold transition-all">
                            {ep.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
                      Chưa có tập phim nào
                    </div>
                  )}
                  <div className="mt-6">
                    <CommentSection movieSlug={movie.slug} />
                  </div>
                </div>
              )}

              {/* Thông tin */}
              {activeTab === 'info' && (
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: <Calendar size={15} />, label: 'Năm', value: String(movie.year || 'N/A') },
                      { icon: <Clock size={15} />, label: 'Thời lượng', value: movie.time || 'N/A' },
                      { icon: <Globe size={15} />, label: 'Quốc gia', value: movie.country?.[0]?.name || 'N/A' },
                      { icon: <Film size={15} />, label: 'Chất lượng', value: movie.quality || 'N/A' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-3">
                        <div className="text-green-400 shrink-0">{icon}</div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase">{label}</div>
                          <div className="text-xs font-bold text-white mt-0.5 line-clamp-1">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(movie.category?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-green-500 rounded-full shrink-0" />Thể loại
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.category!.map(cat => (
                          <Link key={cat.id} to={`/type/${cat.slug}`}
                            className="text-[11px] bg-slate-800 border border-slate-700 hover:border-green-500/50 hover:text-green-400 px-2.5 py-1 rounded-lg text-slate-300 transition-all">
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {movie.content && (
                    <div>
                      <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-indigo-400 rounded-full shrink-0" />Nội dung
                      </h3>
                      <div className={cn('text-slate-400 text-sm leading-relaxed', !showFullDesc && 'line-clamp-4')}
                        dangerouslySetInnerHTML={{ __html: movie.content }} />
                      <button onClick={() => setShowFullDesc(!showFullDesc)}
                        className="mt-2 text-xs text-green-400 font-bold flex items-center gap-1 hover:text-green-300 transition-colors">
                        {showFullDesc ? <><ChevronUp size={13} />Thu gọn</> : <><ChevronDown size={13} />Xem thêm</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Diễn viên */}
              {activeTab === 'actors' && (
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
                  {(movie.actor?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-green-500 rounded-full shrink-0" />Diễn viên
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movie.actor!.map((a, i) => (
                          <span key={i} className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {movie.director?.filter(d => d && d !== 'Đang cập nhật').length! > 0 && (
                    <div>
                      <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full shrink-0" />Đạo diễn
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {movie.director!.filter(d => d && d !== 'Đang cập nhật').map((d, i) => (
                          <span key={i} className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!(movie.actor?.length) && !movie.director?.filter(d => d && d !== 'Đang cập nhật').length && (
                    <p className="text-slate-500 text-sm text-center py-4">Chưa có thông tin diễn viên</p>
                  )}
                </div>
              )}

              {/* Đề xuất */}
              {activeTab === 'suggest' && (
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
                  Đang tải đề xuất...
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6">
            <AdBanner position="bottom" />
          </div>
        </div>
      </div>
    </div>
  );
}
