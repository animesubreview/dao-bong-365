import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Film, ChevronRight, ChevronLeft, List, ExternalLink, Info, Server } from 'lucide-react';
import { cn, usePageTitle } from '../lib/utils';
import { motion } from 'motion/react';
import CommentSection from '../components/CommentSection';
import { getManualMovie, ManualMovie, ManualEpisode } from '../lib/manualMovies';

function buildEmbedUrl(raw: string): { url: string; isDrive: boolean; isM3u8: boolean } {
  const trimmed = raw.trim();
  const isM3u8 = /\.m3u8($|\?)/i.test(trimmed);
  if (isM3u8) return { url: trimmed, isDrive: false, isM3u8: true };
  const isDrive = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
  if (!isDrive) return { url: trimmed, isDrive: false, isM3u8: false };
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { url: `https://drive.google.com/file/d/${fileMatch[1]}/preview`, isDrive: true, isM3u8: false };
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return { url: `https://drive.google.com/file/d/${idMatch[1]}/preview`, isDrive: true, isM3u8: false };
  if (trimmed.includes('/preview')) return { url: trimmed, isDrive: true, isM3u8: false };
  return { url: trimmed.replace(/\/(view|edit)(\?.*)?$/, '/preview'), isDrive: true, isM3u8: false };
}

// ── HLS / M3U8 Player ────────────────────────────────────────────────────────
function HlsPlayer({ src, movie }: { src: string; movie: ManualMovie }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [marqueePos, setMarqueePos] = useState<'top' | 'bottom'>('bottom');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setStatus('loading');
    setErrMsg('');
    let hlsInstance: any;

    const init = (Hls: any) => {
      if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(vid);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          setStatus('ready');
          vid.play().catch(() => {});
        });
        hlsInstance.on(Hls.Events.ERROR, (_: any, d: any) => {
          if (d.fatal) { setStatus('error'); setErrMsg(d.details || 'Lỗi stream'); }
        });
      } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
        vid.src = src;
        vid.onloadedmetadata = () => { setStatus('ready'); vid.play().catch(() => {}); };
        vid.onerror = () => { setStatus('error'); setErrMsg('Không phát được'); };
      } else {
        setStatus('error'); setErrMsg('Trình duyệt không hỗ trợ HLS');
      }
    };

    if ((window as any).Hls) {
      init((window as any).Hls);
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
      s.onload = () => init((window as any).Hls);
      s.onerror = () => { setStatus('error'); setErrMsg('Không tải được HLS.js'); };
      document.head.appendChild(s);
    }
    return () => { hlsInstance?.destroy(); };
  }, [src]);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  useEffect(() => {
    if (movie.watermarkPosition !== 'random') return;
    const t = setInterval(() => setMarqueePos(p => p === 'top' ? 'bottom' : 'top'), 8000);
    return () => clearInterval(t);
  }, [movie.watermarkPosition]);

  const wEnabled = movie.watermarkEnabled;
  const wType = movie.watermarkType || 'marquee';
  const wText = movie.watermarkText?.trim() || `Chỉ xem tại ĐảoPhim • ${movie.name} • Không reup!`;
  const logoSrc = movie.watermarkLogoUrl?.trim() || null;
  const effectivePos = movie.watermarkPosition === 'random' ? marqueePos : (movie.watermarkPosition || 'bottom');

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', background: '#000', aspectRatio: isFullscreen ? undefined : '16/9', ...(isFullscreen ? { width: '100vw', height: '100vh' } : {}) }}>
      <style>{`@keyframes wm-marquee{0%{transform:translateX(0)}100%{transform:translateX(-66.666%)}}`}</style>

      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Đang tải stream M3U8...</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <span style={{ fontSize: 13, color: '#f87171' }}>{errMsg}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Link M3U8 có thể hết hạn hoặc bị chặn CORS</span>
        </div>
      )}

      <video ref={videoRef} controls playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', opacity: status === 'ready' ? 1 : 0, transition: 'opacity 0.3s' }} />

      {wEnabled && (
        <>
          {(wType === 'marquee' || wType === 'both') && (
            <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 2147483647, pointerEvents: 'none', ...(effectivePos === 'top' ? { top: 0 } : { bottom: 0 }) }}>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', background: 'linear-gradient(90deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.35) 50%,rgba(0,0,0,0.6) 100%)', backdropFilter: 'blur(2px)', padding: '5px 0' }}>
                <span style={{ display: 'inline-block', paddingLeft: '100%', animation: 'wm-marquee 22s linear infinite', fontFamily: "'Nunito',system-ui,sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.95)', userSelect: 'none' }}>
                  🛡️&nbsp;{wText}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;🛡️&nbsp;{wText}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;🛡️&nbsp;{wText}
                </span>
              </div>
            </div>
          )}
          {(wType === 'logo' || wType === 'both') && (
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2147483647, pointerEvents: 'none', opacity: 0.8 }}>
              {logoSrc ? <img src={logoSrc} alt="wm" style={{ maxHeight: 36, maxWidth: 110, filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.9))' }} /> : <div style={{ fontFamily: "'Nunito',system-ui,sans-serif", fontWeight: 900, fontSize: 16, textShadow: '0 1px 8px rgba(0,0,0,1)', userSelect: 'none', color: '#fff' }}><span style={{ color: '#4ade80' }}>Đảo</span>Phim</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Watermark Overlay Component ──────────────────────────────────────────────
// ── Watermark + Fullscreen-aware Player ──────────────────────────────────────
// Kỹ thuật: bắt nút fullscreen của iframe trước khi nó tự fullscreen,
// thay bằng requestFullscreen trên wrapper → watermark luôn nằm trong
// fullscreen element nên vẫn hiện.

interface WatermarkPlayerProps {
  src: string;
  title?: string;
  movie: ManualMovie;
}

function WatermarkPlayer({ src, title, movie }: WatermarkPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [marqueePos, setMarqueePos] = useState<'top' | 'bottom'>('bottom');

  // Theo dõi trạng thái fullscreen
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Chặn iframe tự fullscreen, thay bằng fullscreen wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onFsRequest = (e: Event) => {
      // Nếu iframe đang cố fullscreen → cancel và fullscreen wrapper thay thế
      if (e.target !== wrapper) {
        e.stopImmediatePropagation();
        if (document.fullscreenElement === wrapper) {
          document.exitFullscreen().catch(() => {});
        } else {
          wrapper.requestFullscreen?.().catch(() => {});
        }
      }
    };
    wrapper.addEventListener('fullscreenchange', onFsRequest, true);
    return () => wrapper.removeEventListener('fullscreenchange', onFsRequest, true);
  }, []);

  // Random position mỗi 8 giây
  useEffect(() => {
    if (movie.watermarkPosition !== 'random') return;
    const t = setInterval(() => {
      setMarqueePos(p => p === 'top' ? 'bottom' : 'top');
    }, 8000);
    return () => clearInterval(t);
  }, [movie.watermarkPosition]);

  const wEnabled = movie.watermarkEnabled;
  const wType = movie.watermarkType || 'marquee';
  const wText = movie.watermarkText?.trim()
    || `Chỉ xem tại ĐảoPhim • ${movie.name} • Không reup!`;
  const logoSrc = movie.watermarkLogoUrl?.trim() || null;

  const effectivePos = movie.watermarkPosition === 'random'
    ? marqueePos
    : (movie.watermarkPosition || 'bottom');

  const marqStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2147483647,
    pointerEvents: 'none',
    ...(effectivePos === 'top' ? { top: 0 } : { bottom: 0 }),
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isFullscreen ? undefined : '16/9',
        background: '#000',
        // Khi fullscreen: chiếm toàn màn hình
        ...(isFullscreen ? { width: '100vw', height: '100vh' } : {}),
      }}
    >
      {/* CSS fullscreen: đảm bảo wrapper và nội dung fill toàn màn hình */}
      <style>{`
        @keyframes wm-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-66.666%); }
        }
        /* Khi wrapper là fullscreen element */
        :fullscreen > iframe,
        :-webkit-full-screen > iframe {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        :fullscreen,
        :-webkit-full-screen {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      {/* iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
        allowFullScreen
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        title={title || 'Video'}
        referrerPolicy="no-referrer"
      />

      {/* ── Watermark ── */}
      {wEnabled && (
        <>
          {/* Dòng chữ chạy ngang */}
          {(wType === 'marquee' || wType === 'both') && (
            <div style={marqStyle}>
              <div style={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(90deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.35) 50%,rgba(0,0,0,0.6) 100%)',
                backdropFilter: 'blur(2px)',
                padding: '5px 0',
              }}>
                <span style={{
                  display: 'inline-block',
                  paddingLeft: '100%',
                  animation: 'wm-marquee 22s linear infinite',
                  fontFamily: "'Nunito', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.85)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                  letterSpacing: '0.3px',
                  userSelect: 'none',
                }}>
                  🛡️&nbsp;{wText}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;🛡️&nbsp;{wText}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;🛡️&nbsp;{wText}
                </span>
              </div>
            </div>
          )}

          {/* Logo góc trên phải */}
          {(wType === 'logo' || wType === 'both') && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2147483647,
              pointerEvents: 'none',
              opacity: 0.8,
            }}>
              {logoSrc ? (
                <img src={logoSrc} alt="watermark" style={{ maxHeight: 36, maxWidth: 110, filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.9))' }} />
              ) : (
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 900, fontSize: 16, textShadow: '0 1px 8px rgba(0,0,0,1)', userSelect: 'none', color: '#fff' }}>
                  <span style={{ color: '#4ade80' }}>Đảo</span>Phim
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WatchManual() {
  const { id, ep } = useParams<{ id: string; ep: string }>();
  const [movie, setMovie] = useState<ManualMovie | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embedError, setEmbedError] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const navigate = useNavigate();

  usePageTitle(movie ? movie.name : undefined);

  // Compute the episode list and current episode index
  const getEpisodes = (m: ManualMovie): ManualEpisode[] => {
    if (m.episodes && m.episodes.length > 0) return m.episodes;
    return [{ label: 'Full', embedUrl: m.embedUrl || '' }];
  };

  const getEpIndex = (episodes: ManualEpisode[]): number => {
    if (!ep) return 0;
    if (ep === 'full') return 0;
    const n = parseInt(ep, 10);
    if (!isNaN(n) && n >= 0 && n < episodes.length) return n;
    return 0;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setEmbedError(false);
    const fetchData = async () => {
      if (!id) return;
      const found = await getManualMovie(id);
      if (found) {
        setMovie(found);
        const favs = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
        setIsFavorite(favs.includes(id));

        const episodes = getEpisodes(found);
        const epIdx = getEpIndex(episodes);
        const currentEp = episodes[epIdx];

        const history = JSON.parse(localStorage.getItem('watchHistory') || '[]');
        const newHistory = history.filter((h: any) => h.id !== found.id);
        newHistory.unshift({
          id: found.id, name: found.name, slug: `__manual__${found.id}`,
          thumb_url: found.posterUrl, episodeName: currentEp?.label || 'Full', episodeSlug: String(epIdx),
          isManual: true, updatedAt: Date.now(),
        });
        localStorage.setItem('watchHistory', JSON.stringify(newHistory.slice(0, 20)));
      }
      setLoading(false);
    };
    fetchData();
  }, [id, ep]);

  const toggleFavorite = () => {
    const favs: string[] = JSON.parse(localStorage.getItem('manual_favorites') || '[]');
    const newFavs = isFavorite ? favs.filter(f => f !== id) : [...favs, id!];
    localStorage.setItem('manual_favorites', JSON.stringify(newFavs));
    setIsFavorite(!isFavorite);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!movie) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
      <p className="text-slate-400">Không tìm thấy phim</p>
      <Link to="/" className="text-sky-400 font-bold">← Về trang chủ</Link>
    </div>
  );

  const episodes = getEpisodes(movie);
  const epIdx = getEpIndex(episodes);
  const currentEp = episodes[epIdx];

  const serverLabel = movie.lang === 'Vietsub' ? 'VIETSUB VIP'
    : movie.lang === 'Lồng Tiếng' ? 'LỒNG TIẾNG VIP'
    : movie.lang === 'Thuyết Minh' ? 'THUYẾT MINH VIP'
    : 'SERVER VIP';

  const { url: embedSrc, isDrive, isM3u8 } = buildEmbedUrl(currentEp?.embedUrl || movie.embedUrl || '');

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">

      {/* ── Video Player + Watermark (fullscreen-safe) ── */}
      {isM3u8 ? (
        <HlsPlayer src={embedSrc} movie={movie} />
      ) : (
        <WatermarkPlayer
          src={embedSrc}
          title={movie.name}
          movie={movie}
        />
      )}

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-3 pt-3 flex flex-col gap-3">

        {/* ── Title card ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-[#181818] rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base leading-snug line-clamp-2">{movie.name}</h1>
              <p className="text-sky-400 text-sm font-medium mt-0.5">{currentEp?.label || 'Full'}</p>
            </div>
          </div>
          {/* Action bar */}
          <div className="flex items-center gap-2 border-t border-white/5 pt-3">
            <button
              onClick={toggleFavorite}
              className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors',
                isFavorite ? 'text-red-400' : 'text-slate-400 hover:text-white')}
            >
              <Heart size={20} className={cn(isFavorite && 'fill-current')} />
              <span className="text-[10px] font-semibold">Yêu thích</span>
            </button>
            {isDrive && (
              <a href={currentEp?.embedUrl || movie.embedUrl} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] text-slate-400 hover:text-white transition-colors">
                <ExternalLink size={20} />
                <span className="text-[10px] font-semibold">Mở Drive</span>
              </a>
            )}
          </div>
          <div className="h-[2px] bg-sky-500 rounded-full mt-2 w-16" />
        </motion.div>

        {/* ── Movie detail mini card ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="bg-[#181818] rounded-xl p-4 flex gap-3">
          {movie.posterUrl && (
            <img src={movie.posterUrl} alt={movie.name}
              className="w-16 h-[86px] object-cover rounded-lg shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-snug line-clamp-2">{movie.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {movie.year && <span className="text-xs text-slate-300">• {movie.year}</span>}
              {movie.quality && (
                <span className="text-[10px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded">
                  {movie.quality}
                </span>
              )}
            </div>
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {movie.genres.map((g: string, i: number) => (
                  <span key={i} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{g}</span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Danh sách tập ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}
          className="bg-[#181818] rounded-xl overflow-hidden">

          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <List size={15} className="text-slate-400" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">Danh sách tập</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e1e]">
            <Link to={`/manual/${movie.id}`} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">
              <ChevronLeft size={14} className="text-white" />
            </Link>
            <span className="text-slate-300 text-sm font-semibold line-clamp-1">{movie.name}</span>
          </div>

          {/* Server tab */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Server size={12} className="text-slate-500" />
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Máy chủ:</span>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-sky-500/20 border border-sky-500/50 text-sky-400">
              {serverLabel} | 1
            </button>
          </div>

          <div className="px-4 py-2.5 flex items-center justify-between">
            <button className="flex items-center gap-1.5 text-sky-400 border-b-2 border-sky-500 pb-1 text-xs font-bold uppercase tracking-wide">
              Phụ đề
            </button>
            <span className="text-slate-500 text-xs">Danh sách tập ({epIdx + 1} / {episodes.length})</span>
          </div>

          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              onClick={() => setShowThumbs(v => !v)}
              className={cn('w-9 h-5 rounded-full transition-colors relative', showThumbs ? 'bg-sky-500' : 'bg-slate-700')}
            >
              <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow', showThumbs ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
            <span className="text-slate-400 text-xs">Hiện ảnh</span>
          </div>

          {/* Episode buttons */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {episodes.map((episode, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/watch-manual/${movie.id}/${i}`)}
                  className={cn(
                    'py-2 px-1 rounded-lg text-center text-[11px] font-bold transition-all border truncate',
                    i === epIdx
                      ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                  )}
                >
                  {episode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prev / Next navigation */}
          {episodes.length > 1 && (
            <div className="flex items-center gap-2 px-4 pb-4 border-t border-white/5 pt-3">
              <button
                onClick={() => epIdx > 0 && navigate(`/watch-manual/${movie.id}/${epIdx - 1}`)}
                disabled={epIdx === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Tập trước
              </button>
              <button
                onClick={() => epIdx < episodes.length - 1 && navigate(`/watch-manual/${movie.id}/${epIdx + 1}`)}
                disabled={epIdx === episodes.length - 1}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Tập sau <ChevronRight size={14} />
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Nội dung ── */}
        {isDrive && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-[#181818] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Info size={15} className="text-sky-400" />
              <span className="text-white font-bold text-sm uppercase tracking-wide">Lưu ý</span>
            </div>
            <div className="p-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Nếu video không phát được, nhấn <strong className="text-white">Mở Drive</strong> để xem trực tiếp trên Google Drive.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Bình luận ── */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
          <CommentSection movieSlug={`manual-${movie.id || ''}`} />
        </motion.div>

      </div>
    </div>
  );
}
