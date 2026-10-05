import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Share2, Plus, Film, ChevronRight, ChevronDown, ChevronUp, Star, Clock, Globe, Layers, Bell, Users, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import CommentSection from '../components/CommentSection';
import AdBanner from '../components/AdBanner';
import DiscordBanner from '../components/DiscordBanner';
import { getManualMovie, getAllManualMovies, ManualMovie } from '../lib/manualMovies';
import { useSEO } from '../hooks/useSEO';

const TYPE_LABEL: Record<string, string> = {
  'phim-le': 'Phim lẻ', 'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Hoạt hình', 'phim-chieu-rap': 'Chiếu rạp',
};

type Tab = 'episodes' | 'comments' | 'info' | 'actors' | 'suggest';

export default function ManualMovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<ManualMovie | null>(null);
  const [related, setRelated] = useState<ManualMovie[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('episodes');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [epSearch, setEpSearch] = useState('');
  const [epSortDesc, setEpSortDesc] = useState(false);
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
    // Người dùng bấm Hủy trong khung chia sẻ sẽ làm promise bị reject (AbortError) — phải bắt lại, đó không phải lỗi.
    if (navigator.share) navigator.share({ title: movie?.name, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href).catch(() => {});
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

  const LOGO = '/assets/logo-daophim.png';
  const poster = movie.posterUrl || LOGO;
  const epList = movie.episodes && movie.episodes.length > 0
    ? movie.episodes
    : [{ label: 'Full', embedUrl: movie.embedUrl }];
  // giữ nguyên chỉ số gốc (idx) để link xem đúng tập dù đã lọc / đảo thứ tự
  const filteredEps = (() => {
    let list = epList.map((ep, idx) => ({ ep, idx }));
    const q = epSearch.trim().toLowerCase();
    if (q) list = list.filter(({ ep }) => String(ep.label).toLowerCase().includes(q));
    if (epSortDesc) list = [...list].reverse();
    return list;
  })();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'episodes', label: 'Tập phim' },
    { key: 'comments', label: 'Bình luận' },
    { key: 'actors', label: 'Diễn viên' },
    { key: 'suggest', label: 'Đề xuất' },
  ];
  // "info" không nằm trên thanh tab (giống trang phim API) — xem qua link "Thông tin phim >" dưới tên phim.

  const badge = 'text-[11px] font-bold px-2.5 py-1 rounded-md border border-slate-600 text-slate-300';

  return (
    <div className="min-h-screen bg-slate-950 pb-20">

      {/* Banner QC trên cùng — giống trang phim API */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="lg:max-w-2xl lg:mx-auto">
          <AdBanner position="top" className="rounded-xl overflow-hidden pt-3" />
        </div>
      </div>

      {/* ══ HERO BANNER – full width ══ */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(300px, 48vw, 580px)' }}>
        <img src={poster} alt={movie.name} referrerPolicy="no-referrer"
          onError={(e) => { if (!e.currentTarget.src.endsWith(LOGO)) e.currentTarget.src = LOGO; }}
          className="w-full h-full object-cover object-top" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* Poster nổi giữa (mobile) / bên trái (PC), viền trắng */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-row md:gap-8 -mt-28 sm:-mt-32 md:-mt-20 relative z-10">

          <div className="w-40 sm:w-48 md:w-52 shrink-0 rounded-2xl overflow-hidden border-2 border-white/90 shadow-2xl shadow-black/60" style={{ aspectRatio: '2/3' }}>
            <img src={poster} alt={movie.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
              onError={(e) => { if (!e.currentTarget.src.endsWith(LOGO)) e.currentTarget.src = LOGO; }} />
          </div>

          <div className="mt-4 md:mt-24 flex-1 min-w-0 flex flex-col items-center text-center md:items-start md:text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">{movie.name}</h1>
            {movie.originName && movie.originName !== movie.name && (
              <p className="text-slate-400 text-sm md:text-base font-semibold mt-1">{movie.originName}</p>
            )}
            <button onClick={() => setActiveTab('info')}
              className="flex items-center gap-1 text-[var(--primary-light)] hover:text-white text-sm font-bold mt-2 transition-colors">
              Thông tin phim <ChevronRight size={15} />
            </button>

            {/* Xem Ngay + Xem Chung — 1 hàng ngang */}
            <div className="w-full flex items-center gap-2.5 mt-5">
              <button onClick={() => navigate(`/watch-manual/${movie.id}/full`)}
                className="btn-primary flex-1 justify-center !text-sm !py-3 !px-4">
                <Play className="fill-current" size={17} /> Xem Ngay
              </button>
              <button onClick={() => navigate('/xem-chung')}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                <Users size={16} /> Xem Chung
              </button>
            </div>

            {/* Yêu thích / Thêm vào / Chia sẻ */}
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
            </div>

            <DiscordBanner className="mt-4 w-full" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-6 mb-5">
          {movie.quality && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--primary)]/50 text-[var(--primary-light)]">{movie.quality}</span>}
          {movie.year && <span className={badge}>{movie.year}</span>}
          {movie.status && <span className={badge}>{movie.status}</span>}
          {movie.lang && <span className={badge}>{movie.lang}</span>}
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
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all -mb-px',
                  activeTab === tab.key ? 'border-green-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                )}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}>

            {/* Tập phim */}
            {activeTab === 'episodes' && (
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                  <button className="text-[11px] font-black px-3 py-1.5 rounded-lg border flex items-center gap-1.5 bg-green-500/10 border-green-500/60 text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    {serverLabel}
                  </button>
                </div>

                {epList.length > 1 && (
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-bold text-white">
                      Danh sách tập <span className="text-slate-500 font-semibold">({filteredEps.length}/{epList.length})</span>
                    </p>
                    <button onClick={() => setEpSortDesc(v => !v)}
                      className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Đổi thứ tự tập" title="Đổi thứ tự tập">
                      <ArrowUpDown size={14} />
                    </button>
                  </div>
                )}
                {epList.length > 6 && (
                  <div className="relative mb-4">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={epSearch} onChange={e => setEpSearch(e.target.value)} placeholder="Tìm tập..."
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-green-500/60 transition-colors" />
                  </div>
                )}

                {epList.length === 1 ? (
                  <button onClick={() => navigate(`/watch-manual/${movie.id}/0`)}
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/50 hover:bg-green-500/20 text-green-400 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors mb-1">
                    <Play size={15} className="fill-current" /> Tập đầy đủ
                  </button>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredEps.map(({ ep, idx }) => (
                      <button key={idx} onClick={() => navigate(`/watch-manual/${movie.id}/${idx}`)}
                        className="bg-slate-800 border border-slate-700 hover:border-green-500 hover:bg-green-500/10 text-slate-400 hover:text-green-400 py-2 rounded-lg text-center text-[11px] font-bold transition-all truncate px-1">
                        {ep.label}
                      </button>
                    ))}
                    {filteredEps.length === 0 && (
                      <p className="col-span-full text-center text-slate-500 text-xs py-4">Không tìm thấy tập phù hợp</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bình luận */}
            {activeTab === 'comments' && <CommentSection movieSlug={`manual-${movie.id}`} />}

            {/* Thông tin */}
            {activeTab === 'info' && (
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: <Globe size={15} />, label: 'Loại phim', value: TYPE_LABEL[movie.type] || movie.type },
                    { icon: <Clock size={15} />, label: 'Năm', value: movie.year || 'N/A' },
                    { icon: <Layers size={15} />, label: 'Chất lượng', value: movie.quality || 'N/A' },
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
                    <p className={cn('text-slate-400 text-sm leading-relaxed', !showFullDesc && 'line-clamp-4')}>{movie.description}</p>
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
              related.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {related.map(m => (
                    <Link key={m.id} to={`/manual/${m.id}`} className="group block">
                      <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700/40 group-hover:border-green-500/40 transition-all" style={{ aspectRatio: '2/3' }}>
                        {m.posterUrl
                          ? <img src={m.posterUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                          : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-slate-600" /></div>}
                      </div>
                      <div className="mt-1.5 px-0.5">
                        <div className="truncate font-bold text-[12px] text-slate-200 group-hover:text-green-400 transition-colors">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.year}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">Không có phim đề xuất</div>
              )
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6">
          <AdBanner position="bottom" />
        </div>
      </div>
    </div>
  );
}
