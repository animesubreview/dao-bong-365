import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, Plus, RefreshCw, Tv, Users, Clock } from 'lucide-react';
import { subscribeActiveWatchRooms, WatchRoom } from '../lib/watchRoom';
import { usePageTitle } from '../lib/utils';

function createdMs(r: WatchRoom): number {
  const c: any = r.createdAt;
  return typeof c === 'number' ? c : (c?.toMillis?.() ?? Date.now());
}
function ago(ms: number) {
  const m = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (m < 1) return 'Vừa tạo';
  if (m < 60) return `${m} phút trước`;
  return `${Math.floor(m / 60)} giờ trước`;
}
// Cho phép dán cả link đầy đủ lẫn mã phòng
function parseRoomId(v: string) {
  const t = v.trim();
  const m = t.match(/watch-room\/([^/?#\s]+)/);
  return (m ? m[1] : t).replace(/[^\w-]/g, '');
}

export default function XemChung() {
  usePageTitle('Xem chung trực tuyến');
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [rooms, setRooms] = useState<WatchRoom[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setRooms(null);
    const unsub = subscribeActiveWatchRooms(setRooms, () => setRooms([]));
    return () => unsub();
  }, [tick]);

  const join = () => {
    const id = parseRoomId(code);
    if (id) navigate(`/watch-room/${id}`);
  };
  // Mở khung tạo phòng (chọn phim → chọn tập → tạo) đã có sẵn ở Header
  const createRoom = () => window.dispatchEvent(new Event('open-watch-room-modal'));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-32">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 mb-4 active:scale-95">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 mb-6">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-light)] bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-full px-3 py-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-[var(--primary-light)]" /> Cinema Live
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Xem Chung Trực Tuyến</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Tạo phòng chiếu, tự chọn bộ phim bạn muốn rồi mời bạn bè cùng xem và trò chuyện thời gian thực.
          Phòng tự động đóng sau 2 tiếng.
        </p>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="Dán mã hoặc link phòng để vào xem"
            className="flex-1 min-w-0 bg-transparent text-white text-sm px-3 py-2.5 outline-none placeholder:text-slate-500"
          />
          <button onClick={join} disabled={!parseRoomId(code)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] text-slate-950 font-bold text-sm px-4 py-2.5 disabled:opacity-40 active:scale-95">
            <LogIn size={16} /> Vào phòng
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span className="w-1.5 h-5 rounded-full bg-[var(--primary)]" /> Phòng đang hoạt động
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setTick(t => t + 1)} aria-label="Làm mới"
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 active:scale-95">
            <RefreshCw size={16} />
          </button>
          <button onClick={createRoom}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] text-slate-950 font-bold text-sm px-4 h-10 active:scale-95">
            <Plus size={16} /> Tạo phòng chiếu
          </button>
        </div>
      </div>

      {rooms === null ? (
        <div className="space-y-3">{[0, 1].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary-light)]"><Tv size={28} /></div>
          <h3 className="text-lg font-bold text-white mb-1">Chưa có phòng chiếu nào đang mở</h3>
          <p className="text-sm text-slate-400 mb-5">Hãy là người đầu tiên tạo phòng và chọn phim xem cùng bạn bè nhé!</p>
          <button onClick={createRoom} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] text-slate-950 font-bold px-6 py-3 active:scale-95">
            <Plus size={18} /> Tạo phòng chiếu mới
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => {
            const n = r.members?.length || 0;
            const full = n >= (r.maxMembers || 2);
            return (
              <Link key={r.id} to={`/watch-room/${r.id}`}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 active:scale-[0.99] transition-transform">
                <img src={r.movieThumb} alt="" loading="lazy" referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  className="w-16 h-24 rounded-xl object-cover bg-slate-800 shrink-0" />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-white text-sm line-clamp-2">{r.movieName}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.episodeName} · Chủ phòng: {r.hostName}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-3 text-slate-400">
                      <span className="inline-flex items-center gap-1"><Users size={13} /> {n}/{r.maxMembers || 2}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={13} /> {ago(createdMs(r))}</span>
                    </span>
                    <span className={full ? 'font-bold text-slate-500' : 'font-bold text-[var(--primary-light)]'}>{full ? 'Đã đầy' : 'Vào phòng →'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
