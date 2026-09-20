import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Share2, Plus, MessageCircle, Star, ChevronRight, Clock, Calendar, Globe, Film, ChevronDown, ChevronUp, Users, Search, ArrowUpDown } from 'lucide-react';
import { movieApi, getNguonCDetail, mergeNguonCEpisodes, nguonCToMovie, getOPhimDetail, mergeOPhimEpisodes } from '../services/api';
import { Movie, Episode } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import PopupAd from '../components/PopupAd';
import CommentSection from '../components/CommentSection';
import AdBanner from '../components/AdBanner';
import DiscordBanner from '../components/DiscordBanner';
import { getMovieOverride, mergeOverride, mergeCustomServers } from '../lib/movieOverrides';
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
  const [epSearch, setEpSearch] = useState('');
  const [epSortDesc, setEpSortDesc] = useState(false);
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
        setEpisodes(mergeCustomServers(mergeOPhimEpisodes(baseEpisodes, ophim), override));
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
  const filteredEpisodes = (() => {
    let list = currentServer?.server_data || [];
    if (epSearch.trim()) {
      const q = epSearch.trim().toLowerCase();
      list = list.filter(ep => ep.name.toLowerCase().includes(q));
    }
    if (epSortDesc) list = [...list].reverse();
    return list;
  })();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'episodes', label: 'Tập phim' },
    { key: 'info', label: 'Thông tin' },
    { key: 'actors', label: 'Diễn viên' },
    { key: 'suggest', label: 'Đề xuất' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <PopupAd movieKey={slug || ''} />

      {/* Banner QC ngay dưới logo/header, trên cùng trang — trước cả banner hero.
          Layout chung (App.tsx) đã paddingTop = header height cho toàn trang rồi,
          nên banner này tự nằm ngay dưới header, không cần bù thêm. */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* lg:max-w-2xl giới hạn bề ngang banner trên PC để không bị quá to/tràn hết màn hình */}
        <div className="lg:max-w-2xl lg:mx-auto">
          <AdBanner position="top" className="rounded-xl overflow-hidden pt-3" />
        </div>
      </div>

      {/* ══ HERO BANNER – full width giống RoPhim ══ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(300px, 48vw, 580px)' }}
      >
        <img src={thumbUrl} alt={movie.name} referrerPolicy="no-referrer"
          onError={(e) => {
            const fallback = movieApi.getImageUrl(movie.thumb_url || movie.poster_url);
            if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
            else e.currentTarget.src = '/assets/logo-daophim.png';
          }}
          className="w-full h-full object-cover object-top" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* Poster + info — poster nổi giữa (mobile) / bên trái (PC), viền trắng giống ảnh mẫu */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-row md:gap-8 -mt-28 sm:-mt-32 md:-mt-20 relative z-10">

          <div className="w-40 sm:w-48 md:w-52 shrink-0 rounded-2xl overflow-hidden border-2 border-white/90 shadow-2xl shadow-black/60" style={{ aspectRatio: '2/3' }}>
            <img src={posterUrl} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
              onError={(e) => {
                const fallback = movieApi.getImageUrl(movie.poster_url || movie.thumb_url);
                if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                else e.currentTarget.src = '/assets/logo-daophim.png';
              }} />
          </div>

          <div className="mt-4 md:mt-24 flex-1 min-w-0 flex flex-col items-center text-center md:items-start md:text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">{movie.name}</h1>
            {movie.origin_name && movie.origin_name !== movie.name && (
              <p className="text-slate-400 text-sm md:text-base font-semibold mt-1">{movie.origin_name}</p>
            )}
            <button onClick={() => setActiveTab('info')}
              className="flex items-center gap-1 text-[var(--primary-light)] hover:text-white text-sm font-bold mt-2 transition-colors">
              Thông tin phim <ChevronRight size={15} />
            </button>

            {/* Xem Chung — outline pill */}
            {firstEpisode && (
              <Link
                to={`/watch/${movie.slug}/${firstEpisode.slug}?server=${encodeURIComponent(episodes[0]?.server_name || '')}&openRoom=1`}
                className="w-full sm:w-auto mt-5 flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors"
              >
                <Users size={16} /> Xem Chung
              </Link>
            )}

            {/* Xem Ngay — nút chính, to, nổi bật */}
            <div className="w-full sm:w-auto mt-3">
              {firstEpisode ? (
                <Link
                  to={`/watch/${movie.slug}/${firstEpisode.slug}?server=${encodeURIComponent(episodes[0]?.server_name || '')}`}
                  className="btn-primary w-full sm:w-auto justify-center !text-base !py-3.5 !px-10"
                >
                  <Play className="fill-current" size={18} /> Xem Ngay
                </Link>
              ) : (
                <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 text-slate-400 font-black px-10 py-3.5 rounded-xl text-base cursor-not-allowed">
                  <Play size={18} /> Chưa Có
                </div>
              )}
            </div>

            {/* Icon row: Yêu thích / Thêm vào / Chia sẻ + rating */}
            <div className="flex items-center gap-6 mt-5">
              <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
                <Heart size={22} className={cn('transition-colors', isFavorite ? 'fill-current text-red-500' : 'text-slate-300 group-hover:text-red-400')} />
                <span className="text-[10px] text-slate-500">Yêu thích</span>
              </button>
              <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
                <Plus size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                <span className="text-[10px] text-slate-500">Thêm vào</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                <Share2 size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                <span className="text-[10px] text-slate-500">Chia sẻ</span>
              </button>
              <div className="flex items-center gap-1.5 ml-2 bg-[var(--primary)]/15 border border-[var(--primary)]/40 text-[var(--primary-light)] text-xs font-black px-3 py-2 rounded-full">
                <Star size={14} className="fill-current" />
                <span>9</span>
              </div>
            </div>

            {/* Mời vào nhóm Discord */}
            <DiscordBanner className="mt-4 w-full" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-6 mb-5">
          {movie.quality && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--primary)]/50 text-[var(--primary-light)]">{movie.quality}</span>
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

                      {/* Đếm số tập + tìm tập + sắp xếp */}
                      {(currentServer?.server_data.length ?? 0) > 0 && (
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-bold text-white">
                            Danh sách tập <span className="text-slate-500 font-semibold">({filteredEpisodes.length}/{currentServer?.server_data.length})</span>
                          </p>
                          <button onClick={() => setEpSortDesc(s => !s)}
                            className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            aria-label="Đổi thứ tự tập" title="Đổi thứ tự tập">
                            <ArrowUpDown size={14} />
                          </button>
                        </div>
                      )}
                      {(currentServer?.server_data.length ?? 0) > 6 && (
                        <div className="relative mb-4">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            value={epSearch}
                            onChange={e => setEpSearch(e.target.value)}
                            placeholder="Tìm tập..."
                            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-green-500/60 transition-colors"
                          />
                        </div>
                      )}

                      {/* Tập đầy đủ — hiện nổi bật khi phim lẻ chỉ có đúng 1 tập */}
                      {currentServer?.server_data.length === 1 && (
                        <Link
                          to={`/watch/${movie.slug}/${currentServer.server_data[0].slug}?server=${encodeURIComponent(currentServer.server_name)}`}
                          className="flex items-center gap-2 bg-green-500/10 border border-green-500/50 hover:bg-green-500/20 text-green-400 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors mb-1"
                        >
                          <Play size={15} className="fill-current" /> Tập đầy đủ
                        </Link>
                      )}

                      {(currentServer?.server_data.length ?? 0) > 1 && (
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-60 overflow-y-auto pr-1">
                          {filteredEpisodes.map((ep, eIdx) => (
                            <Link key={eIdx}
                              to={`/watch/${movie.slug}/${ep.slug}?server=${encodeURIComponent(currentServer!.server_name)}`}
                              className="bg-slate-800 border border-slate-700 hover:border-green-500 hover:bg-green-500/10 text-slate-400 hover:text-green-400 py-2 rounded-lg text-center text-[11px] font-bold transition-all">
                              {ep.name}
                            </Link>
                          ))}
                          {filteredEpisodes.length === 0 && (
                            <p className="col-span-full text-center text-slate-500 text-xs py-4">Không tìm thấy tập phù hợp</p>
                          )}
                        </div>
                      )}
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
