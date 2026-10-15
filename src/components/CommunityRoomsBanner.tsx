import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Radio } from 'lucide-react';
import { subscribeActiveWatchRooms, WatchRoom } from '../lib/watchRoom';
import { useCommunityConfig } from '../lib/communityRoom';

// Phòng cộng đồng do admin tạo — hiện ưu tiên ở đầu trang chủ khi admin bật.
export default function CommunityRoomsBanner() {
  const cfg = useCommunityConfig();
  const [rooms, setRooms] = useState<WatchRoom[]>([]);

  useEffect(() => subscribeActiveWatchRooms(r => setRooms(r.filter(x => (x as any).isCommunity))), []);

  if (!cfg.roomCreateEnabled || rooms.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-black text-white">
        <Radio size={15} className="text-red-400" /> Phòng cộng đồng đang mở
      </h2>
      {rooms.map(r => {
        const n = r.members?.length || 0;
        const unlimited = r.maxMembers === 0;
        const full = !unlimited && n >= (r.maxMembers || 2);
        return (
          <Link key={r.id} to={`/watch-room/${r.id}`}
            className="flex gap-3 rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent p-3 active:scale-[0.99] transition-transform">
            <img src={r.movieThumb} alt="" loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              className="w-14 h-20 rounded-xl object-cover bg-slate-800 shrink-0" />
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <p className="font-bold text-white text-sm line-clamp-2">{r.movieName}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.episodeName} · Chủ phòng: {r.hostName}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400"><Users size={13} /> {n}/{unlimited ? '∞' : r.maxMembers}</span>
                <span className={full ? 'font-bold text-slate-500' : 'font-bold text-green-400'}>{full ? 'Đã đầy' : 'Vào phòng →'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
