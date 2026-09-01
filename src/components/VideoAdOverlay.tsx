import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Pause, Play, Volume2, VolumeX, SkipForward } from 'lucide-react';

interface VideoAdOverlayProps {
  /** Link video quảng cáo — .mp4 hoặc .m3u8 đều được, tự nhận diện */
  adUrl: string;
  /** Số giây phải xem trước khi được phép bỏ qua (0 = cho bỏ qua ngay) */
  skipAfterSeconds: number;
  /** Gọi khi quảng cáo kết thúc hoặc người dùng bấm "Bỏ qua" */
  onDone: () => void;
  /** (Tuỳ chọn) Link đích khi người xem bấm vào video quảng cáo — mở tab mới, không ảnh hưởng nút play/mute/bỏ qua */
  clickUrl?: string;
}

export default function VideoAdOverlay({ adUrl, skipAfterSeconds, onDone, clickUrl }: VideoAdOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [countdown, setCountdown] = useState(Math.max(0, skipAfterSeconds));
  const isHls = /\.m3u8($|\?)/i.test(adUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(adUrl);
      hls.attachMedia(video);
    } else {
      video.src = adUrl;
    }
    video.play().catch(() => setPlaying(false));

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adUrl]);

  // Đếm ngược cho phép "Bỏ qua quảng cáo"
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); } else { video.pause(); setPlaying(false); }
  };
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        onEnded={onDone}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={onDone}
      />

      {/* Vùng bấm mở link quảng cáo (nếu Admin có cấu hình) — nằm dưới thanh điều khiển nên không chặn play/mute/bỏ qua */}
      {clickUrl && (
        <button
          type="button"
          onClick={() => window.open(clickUrl, '_blank', 'noopener,noreferrer')}
          aria-label="Xem chi tiết quảng cáo"
          className="absolute inset-0 z-0 cursor-pointer"
          title={clickUrl}
        />
      )}

      {/* Nhãn QUẢNG CÁO — góc trên trái */}
      <span className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur text-amber-400 text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3.5 md:py-2 rounded-full border border-amber-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> QUẢNG CÁO
      </span>

      {/* Điều khiển — góc dưới trái: play/pause + âm lượng */}
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2">
        <button onClick={e => { e.stopPropagation(); togglePlay(); }} aria-label={playing ? 'Tạm dừng' : 'Phát'}
          className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur border border-white/15 text-white rounded-full transition-all shrink-0">
          {playing ? <Pause size={14} className="md:hidden" /> : <Play size={14} className="ml-0.5 md:hidden" />}
          {playing ? <Pause size={18} className="hidden md:block" /> : <Play size={18} className="ml-0.5 hidden md:block" />}
        </button>
        <button onClick={e => { e.stopPropagation(); toggleMute(); }} aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
          className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur border border-white/15 text-white rounded-full transition-all shrink-0">
          {muted ? <VolumeX size={14} className="md:hidden" /> : <Volume2 size={14} className="md:hidden" />}
          {muted ? <VolumeX size={18} className="hidden md:block" /> : <Volume2 size={18} className="hidden md:block" />}
        </button>
      </div>

      {/* Bỏ qua — góc dưới phải */}
      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-10">
        {countdown > 0 ? (
          <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur border border-white/15 text-slate-300 text-[11px] md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2.5 rounded-full whitespace-nowrap">
            Trả qua sau {countdown} giây
          </span>
        ) : (
          <button onClick={e => { e.stopPropagation(); onDone(); }}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-200 active:scale-95 text-slate-950 text-[11px] md:text-sm font-black px-3 py-1.5 md:px-4 md:py-2.5 rounded-full transition-all whitespace-nowrap">
            Bỏ qua quảng cáo <SkipForward size={13} className="md:hidden" /><SkipForward size={16} className="hidden md:block" />
          </button>
        )}
      </div>
    </div>
  );
}
