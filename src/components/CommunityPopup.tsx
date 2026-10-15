import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, Users, X, Sparkles, Clapperboard } from 'lucide-react';
import { useCommunityConfig, countVoiceUsers } from '../lib/communityRoom';

// Popup nổi "Phòng cộng đồng" ở trang chủ — admin bật tại Admin → Chat cộng đồng
// (mục "Ghim phòng cộng đồng"). Có poster, tiêu đề, mô tả, nút vào chat.
// Đóng rồi thì không hiện lại trong phiên đó (trừ khi admin đổi nội dung/poster).
const SEEN_KEY = 'dp_community_popup_seen';

export default function CommunityPopup() {
  const cfg = useCommunityConfig();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [voiceCount, setVoiceCount] = useState(0);
  const [posterOk, setPosterOk] = useState(true);

  // Dấu vân tay nội dung: admin đổi tiêu đề/mô tả/poster thì popup hiện lại cho mọi người
  const fingerprint = `${cfg.pinTitle}|${cfg.notice || cfg.pinDesc}|${cfg.pinPoster?.length || 0}|${cfg.updatedAt}`;

  useEffect(() => { setPosterOk(true); }, [cfg.pinPoster]);

  useEffect(() => {
    if (!cfg.pinEnabled) { setOpen(false); return; }
    let seen = '';
    try { seen = sessionStorage.getItem(SEEN_KEY) || ''; } catch {}
    if (seen === fingerprint) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [cfg.pinEnabled, fingerprint]);

  useEffect(() => {
    if (!open || !cfg.micEnabled) return;
    let alive = true;
    countVoiceUsers().then(n => { if (alive) setVoiceCount(n); });
    return () => { alive = false; };
  }, [open, cfg.micEnabled]);

  // Khóa cuộn trang phía sau khi popup mở
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = (after?: () => void) => {
    try { sessionStorage.setItem(SEEN_KEY, fingerprint); } catch {}
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); after?.(); }, 220);
  };

  if (!cfg.pinEnabled || !open) return null;

  const title = cfg.pinTitle || 'Phòng cộng đồng';
  const desc = cfg.notice || cfg.pinDesc;
  const hasPoster = !!cfg.pinPoster && posterOk;

  return (
    <>
      <style>{`
        @keyframes cp-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cp-overlay-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes cp-card-in { from { opacity: 0; transform: translateY(28px) scale(.9) } to { opacity: 1; transform: none } }
        @keyframes cp-card-out { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(12px) scale(.94) } }
        @keyframes cp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.55) } 50% { box-shadow: 0 0 0 10px rgba(34,197,94,0) } }
        @keyframes cp-shine { 0% { transform: translateX(-120%) skewX(-20deg) } 60%,100% { transform: translateX(260%) skewX(-20deg) } }
        .cp-overlay { animation: ${closing ? 'cp-overlay-out' : 'cp-overlay-in'} .22s ease forwards }
        .cp-card { animation: ${closing ? 'cp-card-out' : 'cp-card-in'} .32s cubic-bezier(.17,.67,.35,1.12) forwards }
        .cp-btn { animation: cp-pulse 1.8s ease-in-out infinite }
        .cp-shine::after { content: ''; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: cp-shine 3.2s ease-in-out infinite }
      `}</style>

      <div className="cp-overlay fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-5"
        onClick={() => close()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cp-card relative w-full max-w-[360px] max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-green-500/40 shadow-2xl shadow-green-500/20"
          onClick={e => e.stopPropagation()}>

          <button onClick={() => close()} aria-label="Đóng"
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-950/70 hover:bg-red-500 text-white backdrop-blur transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>

          {/* Poster */}
          <button type="button" onClick={() => close(() => navigate('/chat'))} className="relative block w-full text-left cp-shine overflow-hidden" aria-label={`Vào ${title}`}>
            {hasPoster ? (
              <img src={cfg.pinPoster} alt={title} onError={() => setPosterOk(false)}
                className="w-full block object-cover aspect-[4/5]" loading="eager" />
            ) : (
              <div className="w-full aspect-[16/10] bg-gradient-to-br from-green-500 via-emerald-600 to-teal-900 flex items-center justify-center relative">
                <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 -right-8 w-52 h-52 rounded-full bg-black/10" />
                <div className="relative w-24 h-24 rounded-3xl bg-white/95 text-green-600 flex items-center justify-center shadow-2xl rotate-[-6deg]">
                  <MessageCircle size={52} strokeWidth={2.2} />
                </div>
                <Sparkles className="absolute top-5 left-6 text-white/80" size={22} />
                <Clapperboard className="absolute bottom-5 right-6 text-white/70" size={26} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-slate-950 text-[11px] font-black shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" /> MỚI
            </span>
          </button>

          {/* Nội dung */}
          <div className="px-5 pb-5 -mt-6 relative z-10 flex flex-col gap-3">
            <div>
              <h3 className="text-xl font-black text-white leading-tight">{title}</h3>
              {desc && <p className="text-sm text-slate-300/90 mt-1.5 leading-snug line-clamp-3">{desc}</p>}
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {cfg.chatEnabled && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/30"><MessageCircle size={12} /> Chat</span>}
              {cfg.micEnabled && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/30"><Mic size={12} /> Mic</span>}
              {cfg.requestsEnabled && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/30"><Clapperboard size={12} /> Yêu cầu phim</span>}
              {cfg.micEnabled && voiceCount > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30"><Users size={12} /> {voiceCount} đang nói chuyện</span>}
            </div>

            <button onClick={() => close(() => navigate('/chat'))}
              className="cp-btn w-full py-3 rounded-2xl text-base font-black text-slate-950 bg-gradient-to-r from-green-400 to-emerald-500 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
              <MessageCircle size={18} /> VÀO CHAT NGAY →
            </button>
            <button onClick={() => close()} className="w-full py-1.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
              Để sau
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
