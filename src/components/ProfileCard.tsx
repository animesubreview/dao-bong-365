import React, { useEffect, useState } from 'react';
import { AtSign, Calendar, Clock, Film, Flame, MessageSquare, Trophy, X } from 'lucide-react';
import { getUserProfile, UserProfile } from '../lib/auth';
import { getProfileExtras, getUserStats, levelOf, levelProgress, titleOf, ProfileExtras, UserStats } from '../lib/userStats';
import ProfileBanner from './ProfileBanner';

interface Props { uid: string; fallbackName: string; fallbackAvatar: string; onClose: () => void; onMention: (name: string) => void }

const fmtDate = (t: number) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

/** Số chạy tăng dần từ 0 */
function useCount(target: number, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(target * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function ProfileCard({ uid, fallbackName, fallbackAvatar, onClose, onMention }: Props) {
  const [p, setP] = useState<UserProfile | null>(null);
  const [s, setS] = useState<UserStats | null>(null);
  const [x, setX] = useState<ProfileExtras | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [pr, st] = await Promise.all([getUserProfile(uid), getUserStats(uid)]);
      if (!alive) return; setP(pr); setS(st);
      getProfileExtras(uid, st.exp).then(e => alive && setX(e));
    })();
    return () => { alive = false; };
  }, [uid]);

  const isAdmin = p?.role === 'admin';
  const exp = s?.exp ?? 0;
  const lvl = levelOf(exp);
  const title = titleOf(lvl, isAdmin);
  const prog = levelProgress(exp);
  const name = p?.username || fallbackName;
  const days = p?.createdAt ? Math.max(1, Math.floor((Date.now() - p.createdAt) / 86400000)) : null;
  const hours = useCount((s?.watchSeconds ?? 0) / 3600);
  const expN = useCount(exp);
  const slugs = useCount(s?.slugs.length ?? 0, 700);
  const cm = useCount(x?.comments ?? 0, 700);
  const topRank = x?.rank != null && x.rank <= 3;
  const ring = isAdmin ? 'conic-gradient(from 0deg,#f59e0b,#fde68a,#c084fc,#38bdf8,#f59e0b)'
    : topRank ? 'conic-gradient(from 0deg,#fde047,#fb923c,#f472b6,#fde047)'
    : 'conic-gradient(from 0deg,var(--primary-light),#fbbf24,#38bdf8,var(--primary-light))';

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/75 backdrop-blur-[3px] pc-fade" onClick={onClose}>
      <style>{`
        @keyframes pc-in { from { opacity:0; transform: translateY(24px) scale(.94) } to { opacity:1; transform:none } }
        @keyframes pc-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes pc-spin { to { transform: rotate(360deg) } }
        @keyframes pc-shim { from { transform: translateX(-120%) } to { transform: translateX(260%) } }
        @keyframes pc-glow { 0%,100% { opacity:.55 } 50% { opacity:1 } }
        .pc-fade { animation: pc-fade .2s ease }
        .pc-card { animation: pc-in .38s cubic-bezier(.2,.9,.3,1.1) }
        .pc-spin { animation: pc-spin 4.5s linear infinite }
        .pc-spin-slow { animation: pc-spin 9s linear infinite }
        .pc-shim { animation: pc-shim 2.4s ease-in-out infinite }
        .pc-glow { animation: pc-glow 2.4s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .pc-card,.pc-spin,.pc-spin-slow,.pc-shim,.pc-glow { animation: none } }
      `}</style>

      {/* Viền sáng xoay quanh thẻ */}
      <div className="pc-card relative w-full max-w-[420px] rounded-[30px] p-[2px] overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Hồ sơ ${name}`}>
        <span aria-hidden className="pc-spin-slow absolute -inset-[70%]" style={{ background: isAdmin
          ? 'conic-gradient(from 0deg,transparent 0 55%,#f59e0b 72%,#fde68a 80%,#c084fc 90%,transparent 100%)'
          : 'conic-gradient(from 0deg,transparent 0 55%,var(--primary) 75%,#38bdf8 90%,transparent 100%)' }} />
        <div className="relative rounded-[28px] overflow-hidden bg-[#0c0f1a]">
          {/* Banner động */}
          <div className="relative h-[168px]">
            <ProfileBanner theme={p?.bannerTheme || (isAdmin ? 'cosmic' : 'aurora')} image={p?.banner} className="absolute inset-0" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 backdrop-blur px-3.5 py-1.5 text-sm font-bold text-white">
                <i className={`w-2.5 h-2.5 rounded-full ${x?.online ? 'bg-emerald-400 pc-glow shadow-[0_0_8px_#34d399]' : 'bg-slate-400'}`} />{x?.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </span>
              <button onClick={onClose} aria-label="Đóng" className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur text-white active:scale-90 transition"><X size={20} /></button>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0c0f1a] to-transparent" />
          </div>

          {/* Avatar đè lên banner */}
          <div className="relative px-5 -mt-[52px]">
            <div className="flex items-end gap-3">
              <span className="relative w-[96px] h-[96px] shrink-0">
                <span className="pc-spin absolute -inset-[3px] rounded-full" style={{ background: ring, filter: 'blur(.3px)' }} />
                <span className="absolute inset-0 rounded-full bg-[#0c0f1a]" />
                <img src={p?.avatar || fallbackAvatar} alt="" className="absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover bg-slate-800" />
              </span>
              <div className="min-w-0 pb-1">
                <p className="text-[22px] font-black leading-tight text-white truncate flex items-center gap-2">
                  <span className="truncate">{name}</span>
                  {isAdmin && <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-900 rounded-full px-2 py-[3px]" style={{ background: 'linear-gradient(110deg,#f59e0b,#fde68a)' }}>Admin</span>}
                </p>
                <p className="text-[15px] font-bold text-amber-200 mt-0.5 truncate">{title.icon} {title.name} · Cấp {title.level}</p>
              </div>
            </div>
            {p?.createdAt && <p className="text-[13px] mt-2 flex items-center gap-1.5 text-slate-400"><Calendar size={14} />Tham gia {fmtDate(p.createdAt)}{days ? ` · Đồng hành ${days} ngày` : ''}</p>}

            {/* EXP */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-[13px] font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">{Math.round(expN)} EXP <span className="text-slate-500">·</span> <Flame size={14} className="text-orange-400" />Chuỗi {s?.streak ?? 0} ngày</span>
                  <span className="text-slate-400">{prog.cur}/{prog.max}</span>
                </div>
                <div className="relative mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-[width] duration-1000" style={{ width: `${(prog.cur / prog.max) * 100}%`, background: 'linear-gradient(90deg,#d946ef,#38bdf8,#facc15)' }}>
                    <i className="pc-shim absolute inset-y-0 w-1/3 bg-white/50 blur-[3px]" />
                  </div>
                </div>
              </div>
              {x?.rank != null && (
                <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[15px] font-black ${topRank ? 'border-amber-300/60 bg-amber-300/15 text-amber-200' : 'border-white/15 bg-white/[0.06] text-slate-100'}`}>
                  <Trophy size={17} className="text-amber-400" />Top #{x.rank}
                </span>
              )}
            </div>
          </div>

          {/* Thống kê */}
          <div className="p-5 pt-4">
            <div className="grid grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-center">
              <Stat color="text-emerald-400" v={`${hours.toFixed(1)} giờ`} icon={<Clock size={13} />} label="Giờ xem" />
              <Stat color="text-sky-300" v={x ? String(Math.round(cm)) : '–'} icon={<MessageSquare size={13} />} label="Bình luận" />
              <Stat color="text-purple-300" v={String(Math.round(slugs))} icon={<Film size={13} />} label="Đã xem" />
              <Stat color="text-amber-300" v={x?.rank != null ? `#${x.rank}` : '–'} icon={<Trophy size={13} />} label="Xếp hạng" />
            </div>
            <button onClick={() => { onMention(name); onClose(); }}
              className="relative overflow-hidden mt-3.5 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[17px] font-black text-slate-950 active:scale-[.98] transition"
              style={{ background: 'linear-gradient(135deg,var(--primary-light),var(--primary))', boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 35%, transparent)' }}>
              <i className="pc-shim absolute inset-y-0 w-1/4 bg-white/40 blur-[6px] -skew-x-12" />
              <AtSign size={19} className="relative" /><span className="relative">Nhắc tên / Phản hồi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, label, icon, color }: { v: string; label: string; icon: React.ReactNode; color: string }) {
  return (
    <div><p className={`text-[19px] font-black ${color}`}>{v}</p><p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">{icon}{label}</p></div>
  );
}
