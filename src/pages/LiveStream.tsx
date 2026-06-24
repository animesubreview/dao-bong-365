import React, { useState, useEffect } from 'react';
import { Radio, Play, Eye, Calendar } from 'lucide-react';
import { subscribeLiveStreams, LiveStream } from '../lib/cinema';

function getEmbedUrl(url: string): string {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  // Already embed
  return url;
}

export default function LiveStreamPage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selected, setSelected] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeLiveStreams(data => {
      setStreams(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-t-transparent rounded-full animate-spin border-green-500" style={{ borderWidth: 3, borderStyle: 'solid' }} />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Radio size={48} className="text-slate-600" />
        <h2 className="text-xl font-black text-white">Chưa có livestream nào</h2>
        <p className="text-slate-400 text-sm">Admin sẽ sớm phát trực tiếp, hãy quay lại sau!</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <h1 className="text-2xl font-black text-white">Phát Trực Tiếp</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main player */}
        <div className="lg:col-span-2">
          {selected && (
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              <div className="relative" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={getEmbedUrl(selected.embedUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  style={{ border: 'none' }}
                />
                {selected.isLive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-white font-black text-lg">{selected.title}</h2>
                {selected.description && <p className="text-slate-400 text-sm mt-1">{selected.description}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Stream list */}
        <div className="flex flex-col gap-3">
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Danh sách phát</h3>
          {streams.map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              className={`flex gap-3 p-3 rounded-xl border text-left transition-all ${selected?.id === s.id ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}>
              {s.thumbnail ? (
                <img src={s.thumbnail} alt={s.title} className="w-20 h-14 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-20 h-14 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Play size={20} className="text-slate-600" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-white font-bold text-sm line-clamp-2">{s.title}</div>
                {s.isLive && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-xs font-bold">LIVE</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
