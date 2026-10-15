import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mic, Pin, Users } from 'lucide-react';
import { useCommunityConfig, countVoiceUsers } from '../lib/communityRoom';

// Phòng cộng đồng (chat + mic + yêu cầu phim, trang /chat) — admin bật trong
// Admin → Chat cộng đồng thì thẻ này được ghim nổi bật ở đầu trang chủ.
export default function CommunityRoomsBanner() {
  const cfg = useCommunityConfig();
  const [voiceCount, setVoiceCount] = useState(0);

  useEffect(() => {
    if (!cfg.pinEnabled || !cfg.micEnabled) return;
    let alive = true;
    const load = () => countVoiceUsers().then(n => { if (alive) setVoiceCount(n); });
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [cfg.pinEnabled, cfg.micEnabled]);

  if (!cfg.pinEnabled) return null;

  return (
    <Link to="/chat"
      className="relative flex items-center gap-3 rounded-2xl border border-green-500/40 bg-gradient-to-r from-green-500/20 via-green-500/10 to-transparent p-3.5 shadow-lg shadow-green-500/10 active:scale-[0.99] transition-transform">
      <span className="absolute top-2 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-green-300/80"><Pin size={11} /> Ghim</span>
      <div className="w-12 h-12 shrink-0 rounded-2xl bg-green-500 text-slate-950 flex items-center justify-center shadow-lg shadow-green-500/30">
        <MessageCircle size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-white text-sm sm:text-base line-clamp-1">{cfg.pinTitle || 'Phòng cộng đồng'}</p>
        <p className="text-xs text-slate-300/80 mt-0.5 line-clamp-2">{cfg.notice || cfg.pinDesc}</p>
        {cfg.micEnabled && voiceCount > 0 && (
          <p className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 mt-1">
            <Mic size={12} /> <Users size={12} /> {voiceCount} người đang nói chuyện
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs font-black text-green-400 pr-1 pt-4">Vào →</span>
    </Link>
  );
}
