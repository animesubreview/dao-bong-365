import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, ChevronRight, ChevronLeft, ChevronDown, Heart, SkipForward, List, Server, Info, BookmarkPlus, Image as ImageIcon, Users, Copy, Check, X, Loader2, ArrowRightCircle } from 'lucide-react';
import { movieApi, getNguonCDetail, mergeNguonCEpisodes, nguonCToMovie, getOPhimDetail, mergeOPhimEpisodes } from '../services/api';
import { Movie, Episode } from '../types';
import { cn, usePageTitle } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import CommentSection from '../components/CommentSection';
import DaoPhimPlayer from '../components/DaoPhimPlayer';
import { getMovieOverride, mergeOverride } from '../lib/movieOverrides';
import { createWatchRoom } from '../lib/watchRoom';
import { getCurrentUser, getUserProfile, onAuthChange } from '../lib/auth';
import type { UserProfile } from '../lib/auth';

export default function Watch() {
  const { slug, episodeSlug } = useParams<{ slug: string; episodeSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverName = searchParams.get('server');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [showThumbs, setShowThumbs] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const navigate = useNavigate();

  // ── SEO cho trang xem phim ─────────────────────────────────────
  const epName = currentEpisode?.name;
  useSEO({
    title: movie
      ? `${movie.name}${epName && epName !== 'Full' ? ` - ${epName}` : ''} Vietsub HD`
      : undefined,
    description: movie
      ? `Xem ${movie.name}${epName && epName !== 'Full' ? ` ${epName}` : ''} Vietsub HD miễn phí tại Đảo Phim.`
      : undefined,
    image: movieApi.getImageUrl(movie?.thumb_url || movie?.poster_url || '') || undefined,
    url: slug && episodeSlug ? `/watch/${slug}/${episodeSlug}` : undefined,
    noIndex: true, // trang watch không cần index, chỉ trang /phim/ mới index
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Watch room state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomMaxMembers, setRoomMaxMembers] = useState<number>(2);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomCreated, setRoomCreated] = useState<string | null>(null);
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);
  const [lastWatchRoom, setLastWatchRoom] = useState<{ roomId: string; movieName: string; episodeName: string } | null>(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setCurrentUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else setProfile(null);
    });
    return unsub;
  }, []);

  // Load saved watch room
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lastWatchRoom');
      if (saved) {
        const data = JSON.parse(saved);
        // Chỉ hiện nếu lưu trong vòng 12 tiếng
        if (Date.now() - data.savedAt < 12 * 60 * 60 * 1000) {
          setLastWatchRoom(data);
        } else {
          localStorage.removeItem('lastWatchRoom');
        }
      }
    } catch {}
  }, []);

  usePageTitle(movie ? (currentEpisode ? `${movie.name} - ${currentEpisode.name}` : movie.name) : undefined);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const [res, override, nguonC, ophim] = await Promise.all([
          movieApi.getMovieDetail(slug),
          getMovieOverride(slug),
          getNguonCDetail(slug),
          getOPhimDetail(slug),
        ]);
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

        // Merge NguonC: phim đã có tập → chỉ thêm server NguonC; chưa có → dùng hẳn NguonC
        const mergedEpisodes = mergeOPhimEpisodes(baseEpisodes, ophim);
        setEpisodes(mergedEpisodes);

        let ep = null;
        let activeServerName = serverName;
        let foundIdx = 0;

        if (activeServerName) {
          const serverIdx = mergedEpisodes.findIndex(s => s.server_name === activeServerName);
          if (serverIdx !== -1) {
            foundIdx = serverIdx;
            ep = mergedEpisodes[serverIdx].server_data.find(e => e.slug === episodeSlug) || null;
          }
        }

        if (!ep) {
          for (let i = 0; i < mergedEpisodes.length; i++) {
            const found = mergedEpisodes[i].server_data.find(e => e.slug === episodeSlug);
            if (found) { ep = found; activeServerName = mergedEpisodes[i].server_name; foundIdx = i; break; }
          }
        }

        if (!ep) {
          ep = mergedEpisodes[0]?.server_data[0];
          activeServerName = mergedEpisodes[0]?.server_name;
          foundIdx = 0;
        }

        setCurrentEpisode(ep);
        setActiveServerIdx(foundIdx);

        if (activeServerName && activeServerName !== serverName) {
          setSearchParams({ server: activeServerName }, { replace: true });
        }

        // Save history
        const history = JSON.parse(localStorage.getItem('watchHistory') || '[]');
        const newHistory = history.filter((h: any) => h.slug !== slug);
        newHistory.unshift({
          id: movieData._id, name: movieData.name, slug: movieData.slug,
          thumb_url: movieData.thumb_url,
          poster_url: movieData.poster_url,
          episodeName: ep?.name || '1',
          episodeSlug: ep?.slug || '', updatedAt: Date.now()
        });
        localStorage.setItem('watchHistory', JSON.stringify(newHistory.slice(0, 20)));

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
  }, [slug, episodeSlug, serverName]);

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

  const getPrevEpisode = () => {
    if (!currentEpisode || episodes.length === 0) return null;
    const server = episodes[activeServerIdx] || episodes[0];
    const currentIndex = server.server_data.findIndex(e => e.slug === episodeSlug);
    if (currentIndex > 0) return { ...server.server_data[currentIndex - 1], server_name: server.server_name };
    return null;
  };

  const getNextEpisode = () => {
    if (!currentEpisode || episodes.length === 0) return null;
    const server = episodes[activeServerIdx] || episodes[0];
    const currentIndex = server.server_data.findIndex(e => e.slug === episodeSlug);
    if (currentIndex !== -1 && currentIndex < server.server_data.length - 1) {
      return { ...server.server_data[currentIndex + 1], server_name: server.server_name };
    }
    return null;
  };

  const prevEpisode = getPrevEpisode();
  const nextEpisode = getNextEpisode();
  const currentServer = episodes[activeServerIdx] || episodes[0];
  const cleanedServer = movieApi.cleanServerName(currentServer?.server_name || '');
  const isFullMovie = episodes[0]?.server_data?.length === 1;

  const handleServerChange = (idx: number) => {
    setActiveServerIdx(idx);
    const server = episodes[idx];
    const firstEp = server.server_data[0];
    setSearchParams({ server: server.server_name });
    navigate(`/watch/${slug}/${firstEp.slug}?server=${encodeURIComponent(server.server_name)}`);
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

  if (!movie || !currentEpisode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <p className="text-slate-400">Không tìm thấy tập phim</p>
        <Link to="/" className="text-green-400 font-bold">← Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">

      {/* ── Rejoin banner ── */}
      <AnimatePresence>
        {lastWatchRoom && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="sticky top-0 z-40 bg-green-600/95 backdrop-blur border-b border-indigo-500/50 px-4 py-2.5 flex items-center gap-3"
          >
            <ArrowRightCircle size={16} className="text-white shrink-0" />
            <span className="text-white text-sm flex-1 truncate">
              Bạn đang có phòng xem chung: <strong>{lastWatchRoom.movieName}</strong> – Tập {lastWatchRoom.episodeName}
            </span>
            <Link
              to={`/watch-room/${lastWatchRoom.roomId}`}
              className="shrink-0 bg-white text-indigo-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Vào lại phòng
            </Link>
            <button
              onClick={() => { localStorage.removeItem('lastWatchRoom'); setLastWatchRoom(null); }}
              className="shrink-0 text-indigo-200 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Video Player ── iframe + logo overlay ── */}
      <DaoPhimPlayer
        src={currentEpisode.link_embed}
        title={`${movie.name} - Tập ${currentEpisode.name}`}
        className="w-full"
        onEnded={() => {
          if (autoNext && nextEpisode) {
            navigate(`/watch/${movie.slug}/${nextEpisode.slug}?server=${encodeURIComponent(nextEpisode.server_name)}`);
          }
        }}
      />

      {/* ── Content area ── */}
      <div className="max-w-2xl mx-auto px-3 pt-3 flex flex-col gap-3">

        {/* ── Movie info card (KhoiPhim style) ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-[#181818] rounded-xl p-4">

          {/* Title + nav arrows */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base leading-snug line-clamp-2">
                {movie.name}
              </h1>
              <p className="text-green-400 text-sm font-medium mt-0.5">
                {isFullMovie ? 'Tập Full' : `Tập ${currentEpisode.name}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => prevEpisode && navigate(`/watch/${movie.slug}/${prevEpisode.slug}?server=${encodeURIComponent(prevEpisode.server_name)}`)}
                disabled={!prevEpisode}
                className="w-9 h-9 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-[#333] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => nextEpisode && navigate(`/watch/${movie.slug}/${nextEpisode.slug}?server=${encodeURIComponent(nextEpisode.server_name)}`)}
                disabled={!nextEpisode}
                className="w-9 h-9 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-[#333] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 border-t border-white/5 pt-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={toggleFavorite}
              className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors',
                isFavorite ? 'text-red-400' : 'text-slate-400 hover:text-white')}
            >
              <Heart size={20} className={cn(isFavorite && 'fill-current')} />
              <span className="text-[10px] font-semibold">Yêu thích</span>
            </button>

            <button
              onClick={() => setAutoNext(v => !v)}
              className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors',
                autoNext ? 'text-green-400' : 'text-slate-400 hover:text-white')}
            >
              <SkipForward size={20} />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold">Chuyển tập</span>
                <span className={cn('text-[9px] font-black px-1 rounded', autoNext ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400')}>
                  {autoNext ? 'ON' : 'OFF'}
                </span>
              </div>
            </button>

            {nextEpisode && (
              <Link
                to={`/watch/${movie.slug}/${nextEpisode.slug}?server=${encodeURIComponent(nextEpisode.server_name)}`}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] text-slate-400 hover:text-white transition-colors"
              >
                <Play size={20} />
                <span className="text-[10px] font-semibold">Bỏ qua</span>
              </Link>
            )}

            {/* Xem chung button */}
            <button
              onClick={() => setShowRoomModal(true)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] text-slate-400 hover:text-green-400 transition-colors"
            >
              <Users size={20} />
              <span className="text-[10px] font-semibold">Xem chung</span>
            </button>
          </div>

          {/* Underline nav indicator */}
          <div className="h-[2px] bg-green-500 rounded-full mt-2 w-16" />
        </motion.div>

        {/* ── Movie detail mini card ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="bg-[#181818] rounded-xl p-4 flex gap-3">
          {movie.thumb_url && (
            <img
              src={movieApi.getImageUrl(movie.thumb_url)}
              alt={movie.name}
              className="w-16 h-[86px] object-cover rounded-lg shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-snug line-clamp-2">{movie.name}</p>
            {movie.origin_name && <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{movie.origin_name}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {movie.year && <span className="text-xs text-slate-300">• {movie.year}</span>}
              {movie.quality && (
                <span className="text-[10px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">
                  {movie.quality}
                </span>
              )}
              {movie.time && <span className="text-xs text-slate-400">• {movie.time}</span>}
            </div>
            {movie.category && movie.category.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {movie.category.slice(0, 3).map((c: any) => (
                  <span key={c.id} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Danh sách tập ── */}
        {currentServer && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}
            className="bg-[#181818] rounded-xl overflow-hidden">

            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full block" />
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full block" />
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full block" />
                </div>
                <span className="text-white font-black text-base">Phần 1</span>
                <ChevronDown size={16} className="text-slate-400 mt-0.5" />
              </div>
            </div>

            {/* Movie name row with back btn */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e1e]">
              <Link to={`/phim/${movie.slug}`} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">
                <ChevronLeft size={14} className="text-white" />
              </Link>
              <span className="text-slate-300 text-sm font-semibold line-clamp-1">{movie.name}</span>
            </div>

            {/* Server tabs */}
            {episodes.length > 1 && (
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Server size={12} className="text-slate-500" />
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Máy chủ:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {episodes.map((server, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleServerChange(idx)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border',
                        activeServerIdx === idx
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-[#2a2a2a] border-slate-700 text-slate-400 hover:text-white'
                      )}
                    >
                      {movieApi.cleanServerName(server.server_name)} | {server.server_data.length}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub dropdown row */}
            <div className="px-4 py-3 flex items-center gap-3">
              <button className="flex items-center gap-2 bg-[#2a2a2a] border border-slate-700/80 rounded-xl px-3 py-2 hover:border-slate-600 transition-colors">
                <span className="text-white text-xs font-bold">Phụ đề #1</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Episode count + Rút gọn toggle row */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-medium">
                {currentServer.server_data.length} tập
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-semibold">Rút gọn</span>
                <button
                  onClick={() => setShowThumbs(v => !v)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-all relative border',
                    showThumbs ? 'bg-amber-400 border-amber-400' : 'bg-slate-700 border-slate-600'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full transition-transform shadow-sm',
                    showThumbs ? 'bg-white translate-x-5' : 'bg-slate-400 translate-x-0.5'
                  )} />
                </button>
              </div>
            </div>



            {/* Episode grid */}
            <div className="px-4 pb-4">
              <div className={cn(
                'gap-2 max-h-56 overflow-y-auto pr-1',
                showThumbs ? 'flex flex-col' : 'grid grid-cols-4 sm:grid-cols-6'
              )}>
                {currentServer.server_data.map((ep, idx) => (
                  <Link
                    key={idx}
                    to={`/watch/${movie.slug}/${ep.slug}?server=${encodeURIComponent(currentServer.server_name)}`}
                    className={cn(
                      'transition-all rounded-lg border text-center text-xs font-bold',
                      showThumbs
                        ? 'flex items-center gap-3 px-3 py-2.5 text-left'
                        : 'py-2.5',
                      ep.slug === episodeSlug
                        ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                        : 'bg-[#2a2a2a] border-slate-700/50 text-slate-400 hover:border-amber-400/40 hover:text-amber-300'
                    )}
                  >
                    {showThumbs && (
                      <div className="w-3 h-3 rounded-full border-2 shrink-0"
                        style={{ borderColor: ep.slug === episodeSlug ? '#22c55e' : '#475569' }} />
                    )}
                    <span>{/^tập\s/i.test(ep.name) ? ep.name : `Tập ${ep.name}`}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Phụ đề / Nội dung section ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-[#181818] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <Info size={15} className="text-green-400" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">Nội dung</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {movie.year && (
                <span className="text-xs text-slate-300 bg-[#2a2a2a] border border-slate-700 px-3 py-1 rounded-full">
                  Năm: {movie.year}
                </span>
              )}
              {movie.quality && (
                <span className="text-xs text-slate-300 bg-[#2a2a2a] border border-slate-700 px-3 py-1 rounded-full">
                  Chất lượng: {movie.quality}
                </span>
              )}
              {movie.time && (
                <span className="text-xs text-slate-300 bg-[#2a2a2a] border border-slate-700 px-3 py-1 rounded-full">
                  Thời lượng: {movie.time}
                </span>
              )}
              {movie.lang && (
                <span className="text-xs text-slate-300 bg-[#2a2a2a] border border-slate-700 px-3 py-1 rounded-full">
                  Ngôn ngữ: {movie.lang}
                </span>
              )}
            </div>

            {/* Actors */}
            {movie.actor && movie.actor.length > 0 && (
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Diễn viên</p>
                <div className="flex flex-wrap gap-1.5">
                  {movie.actor.map((a: string, i: number) => (
                    <span key={i} className="text-xs text-slate-300 bg-[#2a2a2a] border border-slate-700/60 px-2.5 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Bình luận ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
          <CommentSection movieSlug={slug || ''} />
        </motion.div>

      </div>

      {/* ── Modal tạo phòng xem chung ── */}
      <AnimatePresence>
        {showRoomModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
            onClick={() => { setShowRoomModal(false); setRoomCreated(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">

              {!roomCreated ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                        <Users size={18} className="text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">Tạo phòng xem chung</h3>
                        <p className="text-slate-500 text-[11px]">Mời bạn bè cùng xem & chat</p>
                      </div>
                    </div>
                    <button onClick={() => setShowRoomModal(false)}
                      className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Movie preview */}
                  <div className="flex items-center gap-3 bg-[#0d0d0d] rounded-xl p-3 mb-4 border border-white/5">
                    {movie?.thumb_url && (
                      <img src={movieApi.getImageUrl(movie.thumb_url)} alt={movie?.name}
                        className="w-10 h-14 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-xs font-bold line-clamp-1">{movie?.name}</p>
                      <p className="text-green-400 text-[11px] mt-0.5">Tập {currentEpisode?.name}</p>
                    </div>
                  </div>

                  {/* Số người */}
                  <div className="mb-5">
                    <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Số người tối đa</p>
                    <div className="grid grid-cols-4 gap-2">
                      {([2, 3, 4, 5, 6, 8, 10, 12] as const).map(n => (
                        <button key={n} onClick={() => setRoomMaxMembers(n)}
                          className={cn(
                            'py-2.5 rounded-xl border-2 text-sm font-black transition-all flex flex-col items-center gap-0.5',
                            roomMaxMembers === n
                              ? 'bg-green-500/15 border-green-500 text-green-400'
                              : 'bg-[#2a2a2a] border-transparent text-slate-400 hover:border-slate-600'
                          )}>
                          <span className="text-base leading-none">
                            {n <= 2 ? '👥' : n <= 4 ? '👨‍👩‍👦' : n <= 6 ? '🧑‍🤝‍🧑' : '🎉'}
                          </span>
                          <span className="text-xs">{n}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Not logged in warning */}
                  {!currentUser && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <p className="text-yellow-400 text-xs font-medium">⚠️ Bạn cần đăng nhập để tạo phòng xem.</p>
                    </div>
                  )}

                  <button
                    disabled={!currentUser || !profile || creatingRoom}
                    onClick={async () => {
                      if (!movie || !currentEpisode || !currentUser || !profile) return;
                      setCreatingRoom(true);
                      try {
                        const currentServer = episodes[activeServerIdx];
                        const roomId = await createWatchRoom({
                          movieSlug: movie.slug,
                          movieName: movie.name,
                          movieThumb: movie.thumb_url || '',
                          episodeSlug: currentEpisode.slug,
                          episodeName: currentEpisode.name,
                          embedUrl: currentEpisode.link_embed,
                          m3u8Url: currentEpisode.link_m3u8 || '',
                          serverName: currentServer?.server_name || '',
                          hostUid: currentUser.uid,
                          hostName: profile.username,
                          hostAvatar: profile.avatar,
                          maxMembers: roomMaxMembers,
                        });
                        setRoomCreated(roomId);
                      } finally {
                        setCreatingRoom(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {creatingRoom ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    {creatingRoom ? 'Đang tạo phòng...' : 'Tạo phòng xem'}
                  </button>
                </>
              ) : (
                <>
                  {/* Room created success */}
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                      <Check size={26} className="text-green-400" />
                    </div>
                    <h3 className="text-white font-bold text-base">Phòng đã được tạo!</h3>
                    <p className="text-slate-400 text-xs mt-1">Chia sẻ link bên dưới cho bạn bè</p>
                  </div>

                  {/* Link box */}
                  <div className="bg-[#0d0d0d] rounded-xl p-3 flex items-center gap-2 mb-4 border border-green-500/20">
                    <p className="flex-1 text-green-300 text-xs font-mono truncate">
                      {window.location.origin}/watch-room/{roomCreated}
                    </p>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/watch-room/${roomCreated}`);
                      setRoomLinkCopied(true);
                      setTimeout(() => setRoomLinkCopied(false), 2000);
                    }}
                      className={cn(
                        'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        roomLinkCopied ? 'bg-green-500 text-white' : 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333]'
                      )}>
                      {roomLinkCopied ? <Check size={12} /> : <Copy size={12} />}
                      {roomLinkCopied ? 'Đã copy!' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setShowRoomModal(false); setRoomCreated(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] text-slate-300 font-bold text-sm hover:bg-[#333] transition-colors">
                      Đóng
                    </button>
                    <button onClick={() => navigate(`/watch-room/${roomCreated}`)}
                      className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5">
                      <Users size={14} />
                      Vào phòng
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
