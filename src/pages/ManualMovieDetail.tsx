import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Share2, Plus, MessageCircle, Film, ChevronRight, ChevronDown, ChevronUp, Star, Clock, Globe, Layers, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import CommentSection from '../components/CommentSection';
import { getManualMovie, getAllManualMovies, ManualMovie } from '../lib/manualMovies';
import { useSEO } from '../hooks/useSEO';

const TYPE_LABEL: Record<string, string> = {
  'phim-le': 'Phim lẻ', 'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Hoạt hình', 'phim-chieu-rap': 'Chiếu rạp',
};

type Tab = 'episodes' | 'info' | 'actors' | 'suggest';

export default function ManualMovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<ManualMovie | null>(null);
  const [related, setRelated] = useState<ManualMovie[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('episodes');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const navigate = useNavigate();

  // SEO — cập nhật title/meta theo từng phim manual
  useSEO({
    title: movie ? movie.name : undefined,
    description: movie?.description
      ? movie.description.replace(/<[^>]*>/g, '').slice(0, 160)
      : undefined,
    image: movie?.posterUrl || undefined,
    url: movie ? `/manual/${movie.id}` : undefined,
    type: movie?.type === 'phim-bo' || movie?.type === 'hoat-hinh' ? 'video.tv_show' : 'movie',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (!id) return;
      const found = await getManualMovie(id);
      if (found) {
        setMovie(found);
        const all = await getAllManualMovies();
        setRelated(all.filter(m => m.id !== id && m.type === found.type).slice(0, 6));
        const favs = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
        setIsFavorite(favs.includes(id));
      }
    };
    fetchData();
  }, [id]);

  const toggleFavorite = () => {
    const favs: string[] = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
    const newFavs = isFavorite ? favs.filter(f => f !== id) : [...favs, id!];
    localStorage.setItem('manual_favorites', JSON.stringify(newFavs));
    setIsFavorite(!isFavorite);
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: movie?.name, url: window.location.href });
    else navigator.clipboard?.writeText(window.location.href);
  };

  if (!movie) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const serverLabel = movie.lang === 'Vietsub' ? 'VIETSUB VIP'
    : movie.lang === 'Lồng Tiếng' ? 'LỒNG TIẾNG VIP'
    : movie.lang === 'Thuyết Minh' ? 'THUYẾT MINH VIP'
    : 'SERVER VIP';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'episodes', label: 'Tập phim' },
    { key: 'info', label: 'Thông tin' },
    { key: 'actors', label: 'Diễn viên' },
    { key: 'suggest', label: 'Đề xuất' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">

      {/* ══ HERO BANNER – full width ══ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(300px, 48vw, 580px)', marginTop: '-56px', paddingTop: '56px' }}
      >
        {movie.posterUrl
          ? <img src={movie.posterUrl} alt={movie.name} referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
          : <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center"><Film size={64} className="text-slate-700" /></div>
        }
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

          {/* Poster – PC only */}
          <div className="hidden md:block shrink-0 w-44 lg:w-52">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-800/60" style={{ aspectRatio: '2/3' }}>
              {movie.posterUrl
                ? <img src={movie.posterUrl} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Film size={40} className="text-slate-600" /></div>
              }
            </div>
          </div>

          {/* Right column: actions */}
          <div className="flex-1 md:pl-6 flex flex-col justify-end">

            {/* Mobile: small poster + title */}
            <div className="flex md:hidden items-end gap-4 mb-4">
              <div className="w-24 shrink-0 rounded-xl overflow-hidden shadow-xl border border-slate-800/60" style={{ aspectRatio: '2/3' }}>
                {movie.posterUrl
                  ? <img src={movie.posterUrl} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Film size={24} className="text-slate-600" /></div>
                }
              </div>
              <div className="pb-1">
                <h1 className="text-lg font-black text-white leading-tight line-clamp-2">{movie.name}</h1>
                {movie.originName && (
                  <p className="text-green-400 text-xs font-semibold mt-0.5 line-clamp-1">{movie.originName}</p>
                )}
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-4 md:gap-6 mb-4">
              <button
                onClick={() => navigate(`/watch-manual/${movie.id}/full`)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-slate-950 font-black px-7 py-3 rounded-full text-sm shadow-lg shadow-green-500/25 transition-all active:scale-95 shrink-0"
              >
                <Play className="fill-current" size={16} /> Xem Ngay
              </button>

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

              {/* Rating chip PC */}
              <div className="hidden md:flex items-center gap-2 ml-auto bg-indigo-600/80 border border-indigo-500/50 text-white text-xs font-black px-3 py-2 rounded-xl">
                <Star size={14} className="fill-current text-green-400" />
                <span>0</span>
                <span className="font-normal text-indigo-300">Đánh giá</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title (PC) + Badges */}
        <div className="mt-5 md:mt-6">
          <div className="hidden md:block mb-3">
            <p className="text-2xl lg:text-3xl font-black text-white leading-tight">{movie.name}</p>
            {movie.originName && (
              <p className="text-green-400 text-sm font-semibold mt-1">{movie.originName}</p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-green-500 text-slate-950">IMDb</span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.quality}</span>
            {movie.year && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.year}</span>}
            {movie.status && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.status}</span>}
            {movie.lang && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300">{movie.lang}</span>}
          </div>

          {/* Lịch chiếu */}
          {(movie.airingDay || movie.airingTime) && (
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-3.5 mb-5">
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  {movie.airingDay}{movie.airingDay && movie.airingTime ? ' ' : ''}{movie.airingTime ? `(${movie.airingTime})` : ''}
                </span>
              </div>
              <button className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-slate-950 font-black text-xs px-4 py-2 rounded-full transition-all active:scale-95 shadow-lg shadow-green-500/20">
                <Bell size={13} className="fill-current" />
                Lịch chiếu
              </button>
            </div>
          )}

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
                  <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
                    {/* Server */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button className="text-[11px] font-black px-3 py-1.5 rounded-lg border flex items-center gap-1.5 bg-green-500/10 border-green-500/60 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        {serverLabel}
                      </button>
                    </div>
                    {/* Episode grid – multi or single */}
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                      {(movie.episodes && movie.episodes.length > 0
                        ? movie.episodes
                        : [{ label: 'Full', embedUrl: movie.embedUrl }]
                      ).map((ep, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(`/watch-manual/${movie.id}/${idx}`)}
                          className="bg-green-500 border-green-500 text-slate-950 py-2 rounded-lg text-center text-[11px] font-bold transition-all border shadow-md shadow-green-500/30 truncate px-1"
                        >
                          {ep.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <CommentSection movieSlug={`manual-${movie.id}`} />
                  </div>
                </div>
              )}

              {/* Thông tin */}
              {activeTab === 'info' && (
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: <Globe size={15} />, label: 'Loại phim', value: TYPE_LABEL[movie.type] || movie.type },
                      { icon: <Clock size={15} />, label: 'Năm', value: movie.year || 'N/A' },
                      { icon: <Layers size={15} />, label: 'Chất lượng', value: movie.quality },
                      { icon: <Star size={15} />, label: 'Trạng thái', value: movie.status || 'Hoàn thành' },
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
                  {movie.description && (
                    <div>
                      <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-indigo-400 rounded-full shrink-0" />Nội dung
                      </h3>
                      <p className={cn('text-slate-400 text-sm leading-relaxed', !showFullDesc && 'line-clamp-4')}>
                        {movie.description}
                      </p>
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
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
                  Chưa có thông tin diễn viên
                </div>
              )}

              {/* Đề xuất */}
              {activeTab === 'suggest' && (
                <div>
                  {related.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {related.map(m => (
                        <Link key={m.id} to={`/manual/${m.id}`} className="group block">
                          <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700/40 group-hover:border-green-500/40 transition-all" style={{ aspectRatio: '2/3' }}>
                            {m.posterUrl
                              ? <img src={m.posterUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                              : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-slate-600" /></div>
                            }
                          </div>
                          <div className="mt-1.5 px-0.5">
                            <div className="truncate font-bold text-[12px] text-slate-200 group-hover:text-green-400 transition-colors">{m.name}</div>
                            <div className="text-[10px] text-slate-500">{m.year}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
                      Không có phim đề xuất
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
