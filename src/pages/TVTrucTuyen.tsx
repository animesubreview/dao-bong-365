import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Tv, Loader2, RadioTower } from 'lucide-react';
import { subscribeTVChannels, TVChannel, TV_CATEGORIES } from '../lib/liveTV';
import { buildLiveEmbed } from '../lib/livestream';
import { usePageTitle } from '../lib/utils';

/* ─── Player — tự nhận diện m3u8 (hls.js) hoặc iframe (youtube/facebook/nhúng khác) ── */
function TVPlayer({ url }: { url: string }) {
  const { url: embedUrl, kind } = buildLiveEmbed(url);
  const isHls = kind === 'mux' || /\.m3u8($|\?)/i.test(embedUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setLoading(true);
    setOffline(false);
    if (!isHls) return;
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 20 });
      hlsRef.current = hls;
      hls.loadSource(embedUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) { setOffline(true); setLoading(false); } });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = embedUrl;
      video.addEventListener('loadedmetadata', () => { setLoading(false); video.play().catch(() => {}); });
      video.addEventListener('error', () => { setOffline(true); setLoading(false); });
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl, isHls]);

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-500">
        <RadioTower size={28} />
        <p className="text-sm font-semibold">Kênh chưa có link phát</p>
      </div>
    );
  }

  if (isHls) {
    return (
      <div className="relative w-full h-full bg-black">
        <video ref={videoRef} className="w-full h-full object-contain" playsInline autoPlay controls />
        {loading && !offline && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 size={28} className="animate-spin text-green-400" />
          </div>
        )}
        {offline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-slate-400">
            <RadioTower size={26} />
            <p className="text-sm font-semibold">Kênh tạm ngưng phát, vui lòng thử Link khác</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <iframe
      key={embedUrl}
      src={embedUrl}
      className="w-full h-full"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="no-referrer"
    />
  );
}

export default function TVTrucTuyen() {
  usePageTitle('TV Trực Tuyến - Xem Truyền Hình Trực Tiếp Miễn Phí');
  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState(TV_CATEGORIES[0].value);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [linkIdx, setLinkIdx] = useState(0);

  useEffect(() => {
    const unsub = subscribeTVChannels(list => { setChannels(list); setLoaded(true); });
    return unsub;
  }, []);

  // Danh mục nào có kênh mới hiện tab (tránh tab trống)
  const categoriesWithChannels = useMemo(() => {
    const set = new Set(channels.filter(c => c.active).map(c => c.category));
    return TV_CATEGORIES.filter(c => set.has(c.value));
  }, [channels]);

  useEffect(() => {
    if (categoriesWithChannels.length && !categoriesWithChannels.some(c => c.value === category)) {
      setCategory(categoriesWithChannels[0].value);
    }
  }, [categoriesWithChannels, category]);

  const channelsInCat = useMemo(
    () => channels.filter(c => c.active && c.category === category).sort((a, b) => a.order - b.order),
    [channels, category]
  );

  useEffect(() => {
    if (channelsInCat.length && !channelsInCat.some(c => c.id === activeId)) {
      setActiveId(channelsInCat[0].id);
      setLinkIdx(0);
    }
    if (!channelsInCat.length) setActiveId(null);
  }, [channelsInCat, activeId]);

  const activeChannel = channelsInCat.find(c => c.id === activeId) || null;
  const activeUrl = activeChannel?.embedUrls?.[linkIdx] || activeChannel?.embedUrls?.[0] || '';

  return (
    <div className="min-h-screen bg-slate-950 pb-24" style={{ paddingTop: '72px' }}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <Tv size={20} className="text-green-400" />
          <h1 className="text-lg md:text-xl font-black text-white">TV Trực Tuyến</h1>
        </div>

        {/* Player */}
        <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/70" style={{ aspectRatio: '16/9' }}>
          {activeChannel ? (
            <TVPlayer key={activeChannel.id + linkIdx} url={activeUrl} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600">
              <Tv size={32} />
              <p className="text-sm font-semibold">{loaded ? 'Chưa có kênh nào trong danh mục này' : 'Đang tải...'}</p>
            </div>
          )}
        </div>

        {activeChannel && (
          <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-white font-bold text-sm md:text-base">{activeChannel.name}</h2>
            {activeChannel.embedUrls.length > 1 && (
              <div className="flex items-center gap-1.5">
                {activeChannel.embedUrls.map((_, i) => (
                  <button key={i} onClick={() => setLinkIdx(i)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                      i === linkIdx ? 'bg-green-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}>
                    LINK {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-slate-500 text-[11px] mt-3">
          Nhấn vào kênh bên dưới để xem. Nếu bị đứng hình, vui lòng thử các Link khác phía trên.
        </p>

        {/* Tabs danh mục */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(categoriesWithChannels.length ? categoriesWithChannels : TV_CATEGORIES).map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`shrink-0 text-xs md:text-sm font-bold px-4 py-2 rounded-full border transition-all ${
                category === c.value
                  ? 'bg-white text-slate-950 border-white'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Lưới kênh */}
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {channelsInCat.map(c => (
            <button key={c.id} onClick={() => { setActiveId(c.id); setLinkIdx(0); }}
              className={`relative rounded-xl overflow-hidden bg-slate-900 border-2 transition-colors flex items-center justify-center ${
                c.id === activeId ? 'border-green-400' : 'border-slate-800 hover:border-slate-600'
              }`}
              style={{ aspectRatio: '16/10' }}>
              {c.logoUrl ? (
                <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[11px] font-bold text-slate-300 px-1.5 text-center line-clamp-2">{c.name}</span>
              )}
              {c.id === activeId && (
                <span className="absolute bottom-1 right-1 flex items-center gap-1 bg-green-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 bg-slate-950 rounded-full animate-pulse" /> ON
                </span>
              )}
            </button>
          ))}
          {loaded && !channelsInCat.length && (
            <div className="col-span-full text-center text-slate-600 text-sm py-8">
              Chưa có kênh nào trong danh mục này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
