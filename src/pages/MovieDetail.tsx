import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Plus, MessageCircle, ChevronDown, ChevronUp, Users, Search, ArrowUpDown } from 'lucide-react';
import { movieApi, getNguonCDetail, mergeNguonCEpisodes, nguonCToMovie, getOPhimDetail, mergeOPhimEpisodes, getXinkDetail, mergeXinkEpisodes, getExtraServers, mergeExtraEpisodes, dedupeEpisodes } from '../services/api';
import { Movie, Episode } from '../types';
import { cn, withTimeout } from '../lib/utils';
import PopupAd from '../components/PopupAd';
import CommentSection from '../components/CommentSection';
import AdBanner from '../components/AdBanner';
import MovieCard from '../components/MovieCard';
import { getMovieOverride, mergeOverride, mergeCustomServers } from '../lib/movieOverrides';
import { useSEO } from '../hooks/useSEO';

type Tab = 'episodes' | 'gallery' | 'actors' | 'suggest';

export default function MovieDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedServer, setSelectedServer] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('episodes');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [related, setRelated] = useState<Movie[] | null>(null);
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
        const [res, override, nguonC, ophim, xink, extra, tmdbImgs] = await Promise.all([
          movieApi.getMovieDetail(slug).catch((err) => { console.warn('[KKPhim] lỗi lấy chi tiết phim:', err); return { status: false, movie: null, episodes: [] } as any; }),
          getMovieOverride(slug).catch((err) => { console.warn('[Override] lỗi:', err); return null; }),
          getNguonCDetail(slug).catch((err) => { console.warn('[NguonC] lỗi lấy chi tiết phim:', err); return null; }),
          // OPhim (bổ sung server) và ảnh TMDB (chỉ để đẹp hơn, đã có ảnh KKPhim làm nền) đều
          // là nguồn PHỤ → giới hạn thời gian chờ, chậm/die thì bỏ qua, không kéo chậm trang chi tiết phim
          withTimeout(getOPhimDetail(slug).catch((err) => { console.warn('[OPhim] lỗi lấy chi tiết phim:', err); return null; }), 6000, null),
          withTimeout(getXinkDetail(slug), 6000, null),
          withTimeout(getExtraServers(slug), 6000, [] as Episode[]),
          withTimeout(movieApi.getMovieImagesV1(slug).catch(() => ({ posters: [], backdrops: [] })), 4000, { posters: [], backdrops: [] }),
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
        setEpisodes(mergeCustomServers(dedupeEpisodes(mergeExtraEpisodes(mergeXinkEpisodes(mergeOPhimEpisodes(baseEpisodes, ophim), xink), extra)), override));
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

  useEffect(() => {
    if (activeTab !== 'suggest' || related || !movie) return;
    const cat = movie.category?.[0]?.slug;
    movieApi.filterMovies({ type: movie.type === 'single' ? 'phim-le' : 'phim-bo', category: cat, limit: 12 })
      .then(r => setRelated((r.items || []).filter(m => m.slug !== movie.slug)))
      .catch(() => setRelated([]));
  }, [activeTab, movie, related]);

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
    { key: 'episodes', label: 'Bản chiếu' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'actors', label: 'Diễn viên' },
    { key: 'suggest', label: 'Đề xuất' },
  ];

  const directors = (movie.director || []).filter(d => d && d !== 'Đang cập nhật');
  const lang = movieApi.cleanLang(movie.lang || '');
  const trailer = (movie as any).trailer_url as string | undefined;
  const watchBase = firstEpisode ? `/watch/${movie.slug}/${firstEpisode.slug}?server=${encodeURIComponent(episodes[0]?.server_name || '')}` : '';
  const infoRows: [string, string | undefined][] = [
    ['Trạng thái', movie.episode_current],
    ['Năm', movie.year ? String(movie.year) : undefined],
    ['Thể loại', movie.category?.map(c => c.name).join(', ')],
    ['Đạo diễn', directors.join(', ')],
    ['Loại', movie.type === 'single' ? 'Phim Lẻ' : movie.type === 'hoathinh' ? 'Hoạt Hình' : movie.type ? 'Phim Bộ' : undefined],
    ['Thời lượng', movie.time],
    ['Quốc gia', movie.country?.map(c => c.name).join(', ')],
  ];
  const chip = 'text-[11px] font-bold px-2 py-0.5 rounded border';
  const panel = 'bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5';

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <PopupAd movieKey={slug || ''} />

      <div className="max-w-[1100px] mx-auto px-4 md:px-8">
        <div className="lg:max-w-2xl lg:mx-auto">
          <AdBanner position="top" className="rounded-xl overflow-hidden pt-3" />
        </div>
      </div>

      <div className="relative">
        {/* Nền mờ phía sau */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: 'clamp(300px, 46vw, 520px)' }}>
          <img src={thumbUrl} alt="" className="w-full h-full object-cover object-top opacity-40"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        </div>

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 md:px-8 pt-[clamp(90px,18vw,220px)]">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Cột trái: poster + nội dung */}
            <div className="md:w-[200px] shrink-0 flex flex-col items-center md:items-stretch">
              <div className="w-40 md:w-full rounded-xl overflow-hidden border border-white/20 shadow-2xl shadow-black/60" style={{ aspectRatio: '2/3' }}>
                <img src={posterUrl} alt={movie.name} className="w-full h-full object-cover"
                  onError={(e) => {
                    const fb = movieApi.getImageUrl(movie.poster_url || movie.thumb_url);
                    if (fb && e.currentTarget.src !== fb) e.currentTarget.src = fb;
                    else e.currentTarget.src = '/assets/logo-daophim.png';
                  }} />
              </div>
              {movie.content && (
                <div className="hidden md:block mt-5">
                  <h3 className="text-sm font-black text-white mb-2">Nội dung phim</h3>
                  <div className={cn('text-slate-400 text-xs leading-relaxed', !showFullDesc && 'line-clamp-6')}
                    dangerouslySetInnerHTML={{ __html: movie.content }} />
                  <button onClick={() => setShowFullDesc(v => !v)}
                    className="mt-1.5 text-xs text-[var(--primary-light)] font-bold flex items-center gap-1">
                    {showFullDesc ? <><ChevronUp size={13} />Thu gọn</> : <><ChevronDown size={13} />Xem thêm</>}
                  </button>
                </div>
              )}
            </div>

            {/* Cột phải: thông tin */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{movie.name}</h1>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <p className="text-slate-400 text-sm font-semibold mt-1">{movie.origin_name}</p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                {movie.quality && <span className={cn(chip, 'bg-amber-300 border-amber-300 text-slate-900')}>{movie.quality}</span>}
                {lang && <span className={cn(chip, 'border-slate-600 text-slate-200')}>{lang}</span>}
                {movie.episode_current && <span className={cn(chip, 'border-slate-600 text-slate-200')}>{movie.episode_current}</span>}
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mt-4 text-sm text-left">
                {infoRows.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-3 min-w-0">
                    <dt className="w-24 shrink-0 text-slate-500">{k}</dt>
                    <dd className="text-slate-200 min-w-0 break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* Nút hành động */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-5">
                {firstEpisode ? (
                  <Link to={watchBase} className="btn-primary !rounded-full !px-7 !py-3 !text-sm">
                    <Play className="fill-current" size={17} /> Xem Ngay
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-700 text-slate-400 font-black px-7 py-3 rounded-full text-sm cursor-not-allowed">
                    <Play size={17} /> Chưa Có
                  </div>
                )}
                {trailer && (
                  <a href={trailer} target="_blank" rel="noopener"
                    className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-colors">Trailer</a>
                )}
                {firstEpisode && (
                  <Link to={`${watchBase}&openRoom=1`}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-full border border-slate-600 hover:border-slate-400 text-white text-sm font-bold transition-colors">
                    <Users size={16} /> Xem Chung
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
                  <Heart size={20} className={cn('transition-colors', isFavorite ? 'fill-current text-red-500' : 'text-slate-300 group-hover:text-red-400')} />
                  <span className="text-[10px] text-slate-500">Yêu thích</span>
                </button>
                <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
                  <Plus size={20} className="text-slate-300 group-hover:text-white" />
                  <span className="text-[10px] text-slate-500">Thêm vào</span>
                </button>
                <button onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center gap-1 group">
                  <MessageCircle size={20} className="text-slate-300 group-hover:text-white" />
                  <span className="text-[10px] text-slate-500">Bình luận</span>
                </button>
              </div>

              {/* Nội dung (mobile) */}
              {movie.content && (
                <div className="md:hidden mt-5 text-left">
                  <h3 className="text-sm font-black text-white mb-2">Nội dung phim</h3>
                  <div className={cn('text-slate-400 text-xs leading-relaxed', !showFullDesc && 'line-clamp-4')}
                    dangerouslySetInnerHTML={{ __html: movie.content }} />
                  <button onClick={() => setShowFullDesc(v => !v)}
                    className="mt-1.5 text-xs text-[var(--primary-light)] font-bold flex items-center gap-1">
                    {showFullDesc ? <><ChevronUp size={13} />Thu gọn</> : <><ChevronDown size={13} />Xem thêm</>}
                  </button>
                </div>
              )}

              {/* TABS */}
              <div className="border-b border-slate-800 mt-6 mb-4 flex">
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={cn('px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors',
                      activeTab === tab.key ? 'border-[var(--primary)] text-[var(--primary-light)]' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'episodes' && (
                <div className={cn(panel, 'text-left')}>
                  <h3 className="text-lg font-black text-white mb-3">Các bản chiếu</h3>
                  {episodes.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">Chưa có tập phim nào</p>
                  ) : (
                    <>
                      {episodes.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {episodes.map((ep, idx) => (
                            <button key={idx} onClick={() => setSelectedServer(idx)}
                              className={cn('text-[11px] font-black px-3 py-1.5 rounded-lg border transition-all',
                                selectedServer === idx ? 'bg-[var(--primary)]/10 border-[var(--primary)]/60 text-[var(--primary-light)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500')}>
                              {movieApi.cleanServerName(ep.server_name)}
                            </button>
                          ))}
                        </div>
                      )}
                      {(currentServer?.server_data.length ?? 0) > 1 && (
                        <div className="flex items-center gap-2 mb-3">
                          {(currentServer?.server_data.length ?? 0) > 6 && (
                            <div className="relative flex-1">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input value={epSearch} onChange={e => setEpSearch(e.target.value)} placeholder="Tìm tập..."
                                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[var(--primary)]/60" />
                            </div>
                          )}
                          <button onClick={() => setEpSortDesc(v => !v)} aria-label="Đổi thứ tự tập"
                            className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center ml-auto">
                            <ArrowUpDown size={14} />
                          </button>
                        </div>
                      )}
                      {currentServer?.server_data.length === 1 ? (
                        <Link to={`/watch/${movie.slug}/${currentServer.server_data[0].slug}?server=${encodeURIComponent(currentServer.server_name)}`}
                          className="flex items-center gap-2 bg-[var(--primary)]/10 border border-[var(--primary)]/50 hover:bg-[var(--primary)]/20 text-[var(--primary-light)] font-bold px-4 py-2.5 rounded-xl text-sm">
                          <Play size={15} className="fill-current" /> Tập đầy đủ
                        </Link>
                      ) : (
                        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto pr-1">
                          {filteredEpisodes.map((ep, i) => (
                            <Link key={i} to={`/watch/${movie.slug}/${ep.slug}?server=${encodeURIComponent(currentServer!.server_name)}`}
                              className="bg-slate-800 border border-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary-light)] text-slate-400 py-2 rounded-lg text-center text-[11px] font-bold transition-colors">
                              {ep.name}
                            </Link>
                          ))}
                          {filteredEpisodes.length === 0 && <p className="col-span-full text-center text-slate-500 text-xs py-4">Không tìm thấy tập phù hợp</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && (
                <div className={panel}>
                  {tmdbImages.backdrops.length + tmdbImages.posters.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">Chưa có hình ảnh</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[...tmdbImages.backdrops, ...tmdbImages.posters].slice(0, 12).map((src, i) => (
                        <img key={i} src={src} alt="" loading="lazy" className="w-full aspect-video object-cover rounded-lg bg-slate-800" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'actors' && (
                <div className={cn(panel, 'text-left')}>
                  {(movie.actor?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {movie.actor!.map((a, i) => (
                        <span key={i} className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300">{a}</span>
                      ))}
                    </div>
                  ) : <p className="text-slate-500 text-sm text-center py-4">Chưa có thông tin diễn viên</p>}
                </div>
              )}

              {activeTab === 'suggest' && (
                related === null ? <p className="text-slate-500 text-sm text-center py-6">Đang tải đề xuất...</p>
                : related.length === 0 ? <p className="text-slate-500 text-sm text-center py-6">Chưa có đề xuất</p>
                : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-left">
                    {related.slice(0, 8).map(m => <MovieCard key={m._id} movie={m} />)}
                  </div>
                )
              )}
            </div>
          </div>

          <div id="comments" className="mt-10 scroll-mt-24">
            <CommentSection movieSlug={movie.slug} />
          </div>
          <div className="mt-6"><AdBanner position="bottom" /></div>
        </div>
      </div>
    </div>
  );
}
