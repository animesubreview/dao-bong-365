import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';
import { subscribePlayerConfig, PlayerConfig, DEFAULT_CONFIG } from '../lib/playerConfig';

interface DaoPhimPlayerProps {
  src: string;       // link_embed (iframe) - dùng làm fallback
  m3u8?: string;      // link_m3u8 - ưu tiên dùng nếu có
  title?: string;
  className?: string;
  onEnded?: () => void;
}

export default function DaoPhimPlayer({ src, m3u8, title, className = '', onEnded }: DaoPhimPlayerProps) {
  const [config, setConfig] = useState<PlayerConfig>(DEFAULT_CONFIG);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [m3u8Failed, setM3u8Failed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore config - realtime updates for all users
  useEffect(() => {
    const unsub = subscribePlayerConfig(setConfig);
    return unsub;
  }, []);

  // mode: 'direct' = gọi thẳng URL gốc | 'proxy' = qua Netlify function (bypass Referer/CORS của KKPhim)
  const [mode, setMode] = useState<'direct' | 'proxy'>('direct');

  // Reset trạng thái mỗi khi đổi tập / đổi nguồn m3u8
  useEffect(() => {
    setM3u8Failed(false);
    setLoading(true);
    setMode('direct');
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
      hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(playUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (mode === 'direct') {
            // KKPhim (và một số nguồn) chặn Referer ngoài domain của họ → thử lại qua proxy
            console.warn('DaoPhimPlayer: gọi trực tiếp m3u8 lỗi (có thể do Referer/CORS), chuyển sang proxy', data);
            setMode('proxy');
          } else {
            console.warn('DaoPhimPlayer: proxy cũng lỗi, chuyển sang iframe dự phòng', data);
            setM3u8Failed(true);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari hỗ trợ HLS gốc
      video.src = playUrl;
    } else {
      // Trình duyệt không hỗ trợ HLS -> fallback iframe
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

  const useM3u8 = !!m3u8 && !m3u8Failed;

  if (!src && !m3u8) return null;

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
    <div className={`relative bg-black ${className}`} style={{ aspectRatio: '16/9' }}>
      {useM3u8 ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            style={{ display: 'block' }}
            controls
            playsInline
            autoPlay
            onEnded={onEnded}
            title={title || 'Video'}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
              <Loader2 size={36} className="text-green-400 animate-spin" />
            </div>
          )}
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
