import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Loader2, Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, ChevronRight, ChevronLeft, Check, SkipForward,
} from 'lucide-react';
import { subscribePlayerConfig, PlayerConfig, DEFAULT_CONFIG } from '../lib/playerConfig';

interface DaoPhimPlayerProps {
  src: string;        // link_embed (iframe) - dùng làm fallback
  m3u8?: string;       // link_m3u8 - ưu tiên dùng nếu có
  title?: string;
  className?: string;
  onEnded?: () => void;
  /** Có tập tiếp theo hay không + hành động khi bấm nút "Tập kế tiếp" trên thanh điều khiển */
  onNext?: () => void;
}

interface QualityLevel {
  index: number;
  height: number;
  label: string;
}

function heightLabel(height: number): string {
  if (height >= 2000) return '4K';
  if (height >= 1350) return '2K';
  if (height >= 1000) return 'FHD';
  if (height >= 700) return 'HD';
  if (height >= 470) return 'SD';
  return `${height}p`;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type SettingsPane = 'main' | 'quality' | 'subtitle';

export default function DaoPhimPlayer({ src, m3u8, title, className = '', onEnded, onNext }: DaoPhimPlayerProps) {
  const [config, setConfig] = useState<PlayerConfig>(DEFAULT_CONFIG);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [m3u8Failed, setM3u8Failed] = useState(false);
  const [loading, setLoading] = useState(true);

  // mode: 'direct' = gọi thẳng URL gốc | 'proxy' = qua Netlify function (bypass Referer/CORS của KKPhim)
  const [mode, setMode] = useState<'direct' | 'proxy'>('direct');

  // ── Trạng thái phát ──────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [usingHlsJs, setUsingHlsJs] = useState(false);

  // ── Chất lượng / Phụ đề (chỉ khả dụng khi dùng hls.js, không phải HLS gốc của Safari) ──
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [manualLevel, setManualLevel] = useState(-1); // -1 = Auto
  const [activeLevel, setActiveLevel] = useState(-1);
  const [subtitles, setSubtitles] = useState<{ index: number; label: string }[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(-1); // -1 = tắt

  const [showSettings, setShowSettings] = useState(false);
  const [settingsPane, setSettingsPane] = useState<SettingsPane>('main');

  useEffect(() => {
    const unsub = subscribePlayerConfig(setConfig);
    return unsub;
  }, []);

  // Reset trạng thái mỗi khi đổi tập / đổi nguồn m3u8
  useEffect(() => {
    setM3u8Failed(false);
    setLoading(true);
    setMode('direct');
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);
    setManualLevel(-1);
    setActiveLevel(-1);
    setSubtitles([]);
    setCurrentSubtitle(-1);
    setShowSettings(false);
    setSettingsPane('main');
  }, [m3u8]);

  // ── Khởi tạo HLS khi có link m3u8 ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !m3u8 || m3u8Failed) return;

    let hls: Hls | null = null;
    const playUrl = mode === 'proxy'
      ? `/.netlify/functions/m3u8-proxy?url=${encodeURIComponent(m3u8)}`
      : m3u8;

    const onCanPlay = () => setLoading(false);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('loadeddata', onCanPlay);

    if (Hls.isSupported()) {
      setUsingHlsJs(true);
      hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(playUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels: QualityLevel[] = (data.levels || [])
          .map((lv, index) => ({ index, height: lv.height || 0, label: heightLabel(lv.height || 0) }))
          .sort((a, b) => b.height - a.height);
        setQualities(levels);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setActiveLevel(data.level));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        setSubtitles((data.subtitleTracks || []).map((t, index) => ({ index, label: t.name || t.lang || `Phụ đề ${index + 1}` })));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (mode === 'direct') {
            console.warn('DaoPhimPlayer: gọi trực tiếp m3u8 lỗi (có thể do Referer/CORS), chuyển sang proxy', data);
            setMode('proxy');
          } else {
            console.warn('DaoPhimPlayer: proxy cũng lỗi, chuyển sang iframe dự phòng', data);
            setM3u8Failed(true);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari hỗ trợ HLS gốc — không can thiệp được chất lượng/phụ đề thủ công
      setUsingHlsJs(false);
      video.src = playUrl;
    } else {
      setM3u8Failed(true);
    }

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('loadeddata', onCanPlay);
      hls?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m3u8, m3u8Failed, mode]);

  // ── Đồng bộ sự kiện thẻ <video> với state UI ─────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => { if (!scrubbing) setCurrentTime(video.currentTime); };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onProgress = () => {
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted); };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [scrubbing]);

  // ── Theo dõi trạng thái fullscreen (đủ tiền tố trình duyệt) ──────────────
  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fsEl && fsEl === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ── Tự ẩn thanh điều khiển sau vài giây không thao tác ───────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!scrubbing && !showSettings) setShowControls(false);
    }, 3000);
  }, [scrubbing, showSettings]);

  const wake = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (playing) scheduleHide();
    else { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); setShowControls(true); }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [playing, scheduleHide]);

  // ── Điều khiển ────────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {}); else video.pause();
    wake();
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min((video.duration || 0), video.currentTime + delta));
    wake();
  };

  const seekTo = (t: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, t));
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
    wake();
  };

  const changeVolume = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
    wake();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current as any;
    if (!container) return;
    const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    } else if (container.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else if ((container as any).webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen();
    } else if (video?.webkitEnterFullscreen) {
      // iOS Safari: chỉ hỗ trợ fullscreen trên chính thẻ <video>
      video.webkitEnterFullscreen();
    }
    wake();
  };

  const selectQuality = (index: number) => {
    setManualLevel(index);
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setSettingsPane('main');
  };

  const selectSubtitle = (index: number) => {
    setCurrentSubtitle(index);
    if (hlsRef.current) hlsRef.current.subtitleTrack = index;
    setSettingsPane('main');
  };

  const useM3u8 = !!m3u8 && !m3u8Failed;
  if (!src && !m3u8) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const currentQualityLabel = manualLevel === -1
    ? `Auto${activeLevel >= 0 ? ` (${heightLabel((qualities.find(q => q.index === activeLevel)?.height) || 0)})` : ''}`
    : (qualities.find(q => q.index === manualLevel)?.label || 'Auto');
  const currentSubtitleLabel = currentSubtitle === -1 ? 'Tắt' : (subtitles.find(s => s.index === currentSubtitle)?.label || 'Tắt');

  // Logo position styles
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    pointerEvents: 'none',
    opacity: config.logoOpacity / 100,
    ...(config.logoPosition === 'top-left'     ? { top: 14, left: 14 }    :
        config.logoPosition === 'top-right'    ? { top: 14, right: 14 }   :
        config.logoPosition === 'bottom-left'  ? { bottom: 14, left: 14 } :
                                                  { bottom: 14, right: 14 }),
  };
  const mid = Math.ceil((config.logoText || '').length / 2);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black select-none ${className}`}
      style={{ aspectRatio: isFullscreen ? undefined : '16/9' }}
      onMouseMove={useM3u8 ? wake : undefined}
      onTouchStart={useM3u8 ? wake : undefined}
    >
      {useM3u8 ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            style={{ display: 'block' }}
            playsInline
            autoPlay
            onEnded={onEnded}
            onClick={togglePlay}
            title={title || 'Video'}
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <Loader2 size={36} className="text-green-400 animate-spin" />
            </div>
          )}

          {/* ── Lớp điều khiển tuỳ biến ── */}
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: showControls ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.45) 100%)' : undefined }}
          >
            {/* Tua lùi / Play-Pause / Tua tới — giữa màn hình */}
            <div className="absolute inset-0 flex items-center justify-center gap-10 sm:gap-16">
              <button onClick={(e) => { e.stopPropagation(); seekBy(-10); }} className="text-white/90 hover:text-white transition-colors flex flex-col items-center" aria-label="Tua lùi 10 giây">
                <RotateCcw size={26} className="sm:w-8 sm:h-8" />
                <span className="text-[10px] font-bold -mt-1.5">10</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all" aria-label={playing ? 'Tạm dừng' : 'Phát'}>
                {playing ? <Pause size={28} className="sm:w-8 sm:h-8" /> : <Play size={28} className="sm:w-8 sm:h-8 ml-1" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); seekBy(10); }} className="text-white/90 hover:text-white transition-colors flex flex-col items-center" aria-label="Tua tới 10 giây">
                <RotateCw size={26} className="sm:w-8 sm:h-8" />
                <span className="text-[10px] font-bold -mt-1.5">10</span>
              </button>
            </div>

            {/* Thanh dưới: seekbar + nút điều khiển */}
            <div className="absolute left-0 right-0 bottom-0 px-2.5 sm:px-4 pb-2 sm:pb-3" onClick={(e) => e.stopPropagation()}>
              {/* Seekbar */}
              <div
                className="relative w-full h-3.5 flex items-center cursor-pointer group/seek mb-1"
                onMouseDown={(e) => {
                  const bar = e.currentTarget;
                  setScrubbing(true);
                  const update = (clientX: number) => {
                    const rect = bar.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                    setCurrentTime(pct * duration);
                  };
                  update(e.clientX);
                  const onMove = (ev: MouseEvent) => update(ev.clientX);
                  const onUp = (ev: MouseEvent) => {
                    update(ev.clientX);
                    seekTo((Math.max(0, Math.min(1, (ev.clientX - bar.getBoundingClientRect().left) / bar.getBoundingClientRect().width))) * duration);
                    setScrubbing(false);
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
                onTouchStart={(e) => {
                  const bar = e.currentTarget;
                  setScrubbing(true);
                  const update = (clientX: number) => {
                    const rect = bar.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                    setCurrentTime(pct * duration);
                  };
                  update(e.touches[0].clientX);
                  const onMove = (ev: TouchEvent) => update(ev.touches[0].clientX);
                  const onEnd = (ev: TouchEvent) => {
                    const t = ev.changedTouches[0];
                    const rect = bar.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width));
                    seekTo(pct * duration);
                    setScrubbing(false);
                    window.removeEventListener('touchmove', onMove);
                    window.removeEventListener('touchend', onEnd);
                  };
                  window.addEventListener('touchmove', onMove);
                  window.addEventListener('touchend', onEnd);
                }}
              >
                <div className="relative w-full h-1 group-hover/seek:h-1.5 bg-white/25 rounded-full transition-all">
                  <div className="absolute inset-y-0 left-0 bg-white/35 rounded-full" style={{ width: `${bufferedPct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full" style={{ width: `${progressPct}%` }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full shadow"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  <button onClick={togglePlay} className="text-white p-1" aria-label={playing ? 'Tạm dừng' : 'Phát'}>
                    {playing ? <Pause size={19} /> : <Play size={19} />}
                  </button>

                  <div className="flex items-center gap-1.5 group/vol">
                    <button onClick={toggleMute} className="text-white p-1" aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}>
                      {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={muted ? 0 : volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="w-0 group-hover/vol:w-16 sm:w-16 transition-all duration-200 accent-green-500 h-1 cursor-pointer"
                    />
                  </div>

                  <span className="text-white/90 text-[11px] sm:text-xs font-medium tabular-nums whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  {onNext && (
                    <button onClick={onNext} className="text-white p-1" aria-label="Tập tiếp theo" title="Tập tiếp theo">
                      <SkipForward size={18} />
                    </button>
                  )}

                  {usingHlsJs && (
                    <div className="relative">
                      <button
                        onClick={() => { setShowSettings(v => !v); setSettingsPane('main'); wake(); }}
                        className="flex flex-col items-center text-white p-1"
                        aria-label="Cài đặt chất lượng / phụ đề"
                      >
                        <Settings size={18} className={showSettings ? 'rotate-45 transition-transform' : 'transition-transform'} />
                      </button>

                      {showSettings && (
                        <div className="absolute bottom-full right-0 mb-3 w-56 max-h-72 overflow-y-auto bg-slate-900/95 backdrop-blur border border-slate-700/60 rounded-xl shadow-2xl text-sm">
                          {settingsPane === 'main' && (
                            <div className="py-1">
                              <div className="px-3 pt-2 pb-1 text-[11px] font-black text-slate-500 uppercase tracking-wide">Cài đặt</div>
                              <button onClick={() => setSettingsPane('quality')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                <span className="text-slate-200">Chất lượng</span>
                                <span className="flex items-center gap-1 text-green-400 font-semibold">{currentQualityLabel} <ChevronRight size={14} /></span>
                              </button>
                              <button
                                onClick={() => subtitles.length > 0 && setSettingsPane('subtitle')}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left disabled:opacity-40"
                                disabled={subtitles.length === 0}
                              >
                                <span className="text-slate-200">Phụ đề</span>
                                <span className="flex items-center gap-1 text-slate-400 font-semibold">
                                  {subtitles.length === 0 ? 'Không có' : currentSubtitleLabel}
                                  {subtitles.length > 0 && <ChevronRight size={14} />}
                                </span>
                              </button>
                            </div>
                          )}

                          {settingsPane === 'quality' && (
                            <div className="py-1">
                              <button onClick={() => setSettingsPane('main')} className="w-full flex items-center gap-1.5 px-3 py-2.5 text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800 font-semibold">
                                <ChevronLeft size={15} /> Chất lượng
                              </button>
                              <button onClick={() => selectQuality(-1)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                <span className={manualLevel === -1 ? 'text-green-400 font-semibold' : 'text-slate-200'}>Auto</span>
                                {manualLevel === -1 && <Check size={15} className="text-green-400" />}
                              </button>
                              {qualities.map(q => (
                                <button key={q.index} onClick={() => selectQuality(q.index)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                  <span className={manualLevel === q.index ? 'text-green-400 font-semibold' : 'text-slate-200'}>{q.label} <span className="text-slate-500 text-xs">({q.height}p)</span></span>
                                  {manualLevel === q.index && <Check size={15} className="text-green-400" />}
                                </button>
                              ))}
                            </div>
                          )}

                          {settingsPane === 'subtitle' && (
                            <div className="py-1">
                              <button onClick={() => setSettingsPane('main')} className="w-full flex items-center gap-1.5 px-3 py-2.5 text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800 font-semibold">
                                <ChevronLeft size={15} /> Phụ đề
                              </button>
                              <button onClick={() => selectSubtitle(-1)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                <span className={currentSubtitle === -1 ? 'text-green-400 font-semibold' : 'text-slate-200'}>Tắt</span>
                                {currentSubtitle === -1 && <Check size={15} className="text-green-400" />}
                              </button>
                              {subtitles.map(s => (
                                <button key={s.index} onClick={() => selectSubtitle(s.index)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                  <span className={currentSubtitle === s.index ? 'text-green-400 font-semibold' : 'text-slate-200'}>{s.label}</span>
                                  {currentSubtitle === s.index && <Check size={15} className="text-green-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={toggleFullscreen} className="text-white p-1" aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* iframe dự phòng (link_embed) khi không có m3u8 hoặc HLS lỗi */
        <iframe
          src={src}
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          title={title || 'Video'}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Logo overlay đè lên player */}
      {config.logoType !== 'none' && (
        <div style={logoStyle}>
          {config.logoType === 'text' && (
            <div style={{
              fontFamily: "'Nunito', 'Space Grotesk', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: config.logoSize,
              textShadow: '0 1px 6px rgba(0,0,0,1), 0 2px 12px rgba(0,0,0,0.8)',
              letterSpacing: '-0.3px',
              lineHeight: 1,
              color: config.logoColor2,
              userSelect: 'none',
            }}>
              <span style={{ color: config.logoColor1 }}>
                {(config.logoText || '').slice(0, mid)}
              </span>
              {(config.logoText || '').slice(mid)}
            </div>
          )}
          {config.logoType === 'image' && config.logoImageUrl && (
            <img
              src={config.logoImageUrl}
              alt="logo"
              style={{
                maxHeight: config.logoSize * 2.5,
                maxWidth: 150,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
