import React, { useEffect, useRef, useState } from 'react';

interface FootballPlayerProps {
  src: string;
  isM3u8?: boolean;
  title?: string;
}

export default function FootballPlayer({ src, isM3u8, title }: FootballPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const useHls = isM3u8 ?? /\.m3u8($|\?)/i.test(src);

  useEffect(() => {
    if (!useHls) return;
    const vid = videoRef.current;
    if (!vid) return;
    setStatus('loading');
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
  }, [src, useHls]);

  if (!src) return null;

  if (!useHls) {
    return (
      <div className="relative bg-black w-full" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={src}
          title={title || 'Live'}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          frameBorder={0}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-black w-full" style={{ aspectRatio: '16/9' }}>
      <video ref={videoRef} controls playsInline className="absolute inset-0 w-full h-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-center px-4">
          <p className="text-red-400 font-semibold mb-1">Không phát được luồng trực tiếp</p>
          <p className="text-slate-400 text-sm">{errMsg}</p>
        </div>
      )}
    </div>
  );
}
