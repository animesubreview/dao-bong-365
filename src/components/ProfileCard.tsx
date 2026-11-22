import React, { useEffect, useState } from 'react';
import { AtSign, Calendar, Clock, Film, MessageSquare, Trophy, X } from 'lucide-react';
import { getUserProfile, UserProfile } from '../lib/auth';
import { getProfileExtras, getUserStats, levelOf, levelProgress, titleOf, ProfileExtras, UserStats } from '../lib/userStats';

interface Props { uid: string; fallbackName: string; fallbackAvatar: string; onClose: () => void; onMention: (name: string) => void }

const fmtDate = (t: number) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

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
  const hours = ((s?.watchSeconds ?? 0) / 3600).toFixed(1);
  const bg = isAdmin
    ? 'linear-gradient(160deg,#1b1450,#2d1b69 55%,#150f3a)'
    : lvl >= 3 ? 'linear-gradient(135deg,#f0dcc0,#d2a870)' : 'linear-gradient(135deg,#1e293b,#0f766e)';
  const light = !isAdmin && lvl >= 3; // nền sáng → chữ tối

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-[28px] overflow-hidden border border-slate-700/60 bg-[#141826] shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Hồ sơ ${name}`}>
        <div className="relative px-6 pt-5 pb-5" style={{ background: bg, color: light ? '#1c1917' : '#fff' }}>
          <div className="flex items-start justify-between">
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${light ? 'border-black/20 bg-black/10' : 'border-white/20 bg-black/30'}`}>
              <i className={`w-2.5 h-2.5 rounded-full ${x?.online ? 'bg-emerald-400' : 'bg-slate-400'}`} />{x?.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
            <button onClick={onClose} aria-label="Đóng" className={`w-10 h-10 rounded-full flex items-center justify-center ${light ? 'bg-black/10' : 'bg-black/35'}`}><X size={20} /></button>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="w-[84px] h-[84px] shrink-0 rounded-full p-[3px]" style={{ background: 'conic-gradient(from 0deg,#c084fc,#fbbf24,#38bdf8,#c084fc)' }}>
              <img src={p?.avatar || fallbackAvatar} alt="" className="w-full h-full rounded-full object-cover bg-slate-800 border-2 border-black/60" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-black leading-tight truncate">{name}{isAdmin && <span className="ml-2 text-sm font-bold text-fuchsia-300">· Admin</span>}</p>
              <p className="text-base font-bold mt-1">{title.icon} {title.name} · Cấp {title.level}</p>
              {p?.createdAt && <p className={`text-sm mt-1 flex items-center gap-1.5 ${light ? 'text-stone-700' : 'text-slate-300'}`}><Calendar size={15} />Tham gia: {fmtDate(p.createdAt)}{days ? ` · Đồng hành ${days} ngày` : ''}</p>}
            </div>
          </div>
          <div className={`mt-4 pt-3 border-t ${light ? 'border-black/15' : 'border-white/15'} flex items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-sm font-bold"><span>{exp} EXP · Chuỗi {s?.streak ?? 0} ngày</span><span>{prog.cur}/{prog.max}</span></div>
              <div className={`mt-1.5 h-1.5 rounded-full ${light ? 'bg-black/15' : 'bg-white/15'}`}><div className="h-full rounded-full" style={{ width: `${(prog.cur / prog.max) * 100}%`, background: light ? '#1c1917' : 'linear-gradient(90deg,#d946ef,#38bdf8,#facc15)' }} /></div>
            </div>
            {x?.rank != null && <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-base font-black ${light ? 'border-black/15 bg-black/10' : 'border-white/20 bg-white/10'}`}><Trophy size={18} className="text-amber-500" />Top #{x.rank}</span>}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 py-3 text-center">
            <Stat color="text-emerald-400" v={`${hours} giờ`} icon={<Clock size={14} />} label="Giờ xem" />
            <Stat color="text-sky-300" v={String(x?.comments ?? '–')} icon={<MessageSquare size={14} />} label="Bình luận" />
            <Stat color="text-purple-300" v={String(s?.slugs.length ?? 0)} icon={<Film size={14} />} label="Đã xem" />
            <Stat color="text-amber-300" v={x?.rank != null ? `#${x.rank}` : '–'} icon={<Trophy size={14} />} label="Xếp hạng" />
          </div>
          <button onClick={() => { onMention(name); onClose(); }} className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-teal-500/50 bg-teal-950/60 py-3.5 text-lg font-black text-teal-300 active:scale-[.99]">
            <AtSign size={20} />Nhắc tên / Phản hồi
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, label, icon, color }: { v: string; label: string; icon: React.ReactNode; color: string }) {
  return (
    <div><p className={`text-xl font-black ${color}`}>{v}</p><p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">{icon}{label}</p></div>
  );
}
