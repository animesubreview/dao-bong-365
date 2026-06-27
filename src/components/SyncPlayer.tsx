import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, Loader2, Wifi, WifiOff, Crown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { pushSyncState, PlayerSyncState } from '../lib/watchRoom';

interface Props {
  roomId: string;
  m3u8Url: string;
  embedUrl: string;         // fallback nếu không có m3u8
  isHost: boolean;
  sync: PlayerSyncState;    // realtime từ Firebase
  hostName: string;
  proxyBase?: string;       // optional Netlify proxy base
}

// Độ trễ cho phép trước khi seek lại (giây)
const SYNC_TOLERANCE = 2.5;
// Throttle push Firebase (ms)
const PUSH_INTERVAL = 800;

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function SyncPlayer({
  roomId, m3u8Url, embedUrl, isHost, sync, hostName, proxyBase,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushRef = useRef<number>(0);
  const ignoreSyncRef = useRef(false); // tránh vòng lặp sync

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [hlsOk, setHlsOk] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Proxy URL để bypass CORS nếu cần
  const resolveUrl = useCallback((url: string) => {
    if (!url) return '';
    if (!proxyBase) return url;
    if (url.startsWith('http')) return `${proxyBase}?url=${encodeURIComponent(url)}`;
    return url;
  }, [proxyBase]);

  // ── Khởi tạo HLS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !m3u8Url) return;

    const src = resolveUrl(m3u8Url);

    const onReady = () => setReady(true);
    const onDuration = () => setDuration(video.duration);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => { setBuffering(false); setReady(true); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error, falling back to iframe');
          setHlsOk(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
    } else {
      setHlsOk(false);
    }

    video.volume = volume;

    return () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line
  }, [m3u8Url]);

  // ── Nhận sync từ Firebase (guest) ────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready || isHost) return;
    if (ignoreSyncRef.current) return;

    // Tính thời gian thực của host: currentTime + độ trễ network
    const elapsed = (Date.now() - sync.updatedAt) / 1000;
    const targetTime = sync.isPlaying
      ? sync.currentTime + elapsed
      : sync.currentTime;

    const diff = Math.abs(video.currentTime - targetTime);

    // Seek nếu lệch quá ngưỡng
    if (diff > SYNC_TOLERANCE) {
      video.currentTime = targetTime;
      showSyncToast(`⟳ Đồng bộ (±${diff.toFixed(1)}s)`);
    }

    // Play/Pause
    if (sync.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!sync.isPlaying && !video.paused) {
      video.pause();
    }
  // eslint-disable-next-line
  }, [sync.updatedAt, sync.isPlaying, ready]);

  function showSyncToast(msg: string) {
    setSyncMsg(msg);
    setTimeout(() => setSyncMsg(''), 2500);
  }

  // ── Host push Firebase ─────────────────────────────────────────────────────
  const doPush = useCallback((isPlaying: boolean) => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    const now = Date.now();
    if (now - lastPushRef.current < PUSH_INTERVAL) return;
    lastPushRef.current = now;
    pushSyncState(roomId, {
      isPlaying,
      currentTime: video.currentTime,
      updatedBy: '',
    }).catch(() => {});
  }, [isHost, roomId]);

  // ── Host controls ──────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => doPush(true)).catch(() => {});
    } else {
      video.pause();
      doPush(false);
    }
  }, [doPush]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = parseFloat(e.target.value);
    video.currentTime = t;
    doPush(!video.paused);
  }, [doPush]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const skipBack = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    if (isHost) doPush(!video.paused);
  };

  // Auto-hide controls
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  // ── Fallback: iframe ───────────────────────────────────────────────────────
  if (!hlsOk || !m3u8Url) {
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen
          allow="autoplay; fullscreen" style={{ border: 'none' }} />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-full">
          <WifiOff size={11} className="text-yellow-400" />
          <span className="text-yellow-300 text-[10px] font-semibold">Chế độ iframe – không đồng bộ</span>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => setShowControls(false)}
      onClick={isHost ? handlePlayPause : undefined}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        preload="auto"
      />

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 size={48} className="text-white/60 animate-spin" />
        </div>
      )}

      {/* Sync toast */}
      {syncMsg && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur border border-white/10 pointer-events-none z-20">
          {syncMsg}
        </div>
      )}

      {/* Host badge */}
      {isHost && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full z-10 pointer-events-none">
          <Crown size={11} className="text-yellow-400" />
          <span className="text-yellow-300 text-[10px] font-bold">Bạn đang điều khiển</span>
        </div>
      )}

      {/* Guest badge */}
      {!isHost && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full z-10 pointer-events-none">
          <Wifi size={11} className="text-sky-400" />
          <span className="text-sky-300 text-[10px] font-bold">Đồng bộ từ {hostName}</span>
        </div>
      )}

      {/* Controls overlay */}
      <div className={cn(
        'absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-10',
        showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

        <div className="relative px-4 pb-3 flex flex-col gap-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-[11px] font-mono tabular-nums w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative group">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isHost && (
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  onClick={e => e.stopPropagation()}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 -top-2"
                />
              )}
            </div>
            <span className="text-white/70 text-[11px] font-mono tabular-nums w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-1">
            {/* Rewind 10s (host only) */}
            {isHost && (
              <button onClick={e => { e.stopPropagation(); skipBack(); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <RotateCcw size={16} />
              </button>
            )}

            {/* Play/Pause (host only) */}
            {isHost ? (
              <button onClick={e => { e.stopPropagation(); handlePlayPause(); }}
                className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-black hover:scale-105 transition-transform">
                {playing ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
              </button>
            ) : (
              <div className="w-9 h-9 flex items-center justify-center bg-white/20 rounded-full">
                {playing ? <Pause size={16} className="text-white/60" /> : <Play size={16} className="text-white/60 ml-0.5" />}
              </div>
            )}

            {/* Volume */}
            <button onClick={e => { e.stopPropagation(); toggleMute(); }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div onClick={e => e.stopPropagation()} className="w-20 hidden sm:block">
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-green-500 cursor-pointer" />
            </div>

            {/* Guest note */}
            {!isHost && (
              <span className="text-white/40 text-[10px] ml-2 hidden sm:block">
                Chỉ host mới điều khiển được
              </span>
            )}

            <div className="flex-1" />

            {/* Fullscreen */}
            <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Big play button when paused and controls hidden */}
      {!playing && !buffering && !showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}
