import React, { useState, useEffect, useRef } from 'react';
import { MonitorPlay, Users, Play, Lock, Clock, Calendar, Ticket, CheckCircle2, X, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscribeCinemaRooms, joinCinemaRoom, leaveCinemaRoom, bookSeat, unbookSeat, CinemaRoom } from '../lib/cinema';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&controls=0&disablekb=1&modestbranding=1`;
  return url;
}

function formatSchedule(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function isShowingNow(room: CinemaRoom): boolean {
  if (room.isActive) return true;
  if (!room.scheduledAt) return false;
  const now = Date.now();
  const scheduled = new Date(room.scheduledAt).getTime();
  return now >= scheduled;
}

// ── Seat Map ──────────────────────────────────────────────────────────────
function SeatMap({ room, mySeats, onBook, onUnbook }: {
  room: CinemaRoom;
  mySeats: string[];
  onBook: (id: string) => void;
  onUnbook: (id: string) => void;
}) {
  const total = room.totalSeats || 40;
  const cols = 8;
  const rows = Math.ceil(total / cols);
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
      {/* Screen */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-green-500/60 to-transparent rounded-full mb-1" />
        <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Màn hình</span>
      </div>

      <div className="flex flex-col gap-2 items-center">
        {Array.from({ length: rows }).map((_, rIdx) => {
          const label = rowLabels[rIdx] || String(rIdx + 1);
          return (
            <div key={rIdx} className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 w-4 text-center font-bold">{label}</span>
              <div className="flex gap-1.5">
                {Array.from({ length: cols }).map((_, cIdx) => {
                  const seatNum = rIdx * cols + cIdx + 1;
                  if (seatNum > total) return null;
                  const seatId = `${label}${cIdx + 1}`;
                  const isBooked = room.bookedSeats?.includes(seatId);
                  const isMine = mySeats.includes(seatId);
                  return (
                    <button
                      key={seatId}
                      disabled={isBooked && !isMine}
                      onClick={() => isMine ? onUnbook(seatId) : onBook(seatId)}
                      title={seatId}
                      className={`w-8 h-7 rounded-t-lg text-[10px] font-bold transition-all border-b-2 ${
                        isMine
                          ? 'bg-sky-500 border-green-700 text-slate-900 scale-105'
                          : isBooked
                          ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed opacity-60'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-sky-500/20 hover:border-sky-500/50 hover:text-sky-300'
                      }`}
                    >
                      {cIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-4 bg-slate-800 border-b-2 border-slate-600 rounded-t" />
          <span>Trống</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-4 bg-sky-500 border-b-2 border-green-700 rounded-t" />
          <span>Ghế bạn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-4 bg-slate-700 border-b-2 border-slate-600 rounded-t opacity-60" />
          <span>Đã đặt</span>
        </div>
      </div>
    </div>
  );
}

// ── Watching View ─────────────────────────────────────────────────────────
function WatchingView({ room, mySeats, onBack }: { room: CinemaRoom; mySeats: string[]; onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Block seek via keyboard and context menu on iframe
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight','j','l','J','L'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', block);
    return () => window.removeEventListener('keydown', block);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm font-bold transition-colors">
        ← Quay lại phòng chiếu
      </button>

      <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 mb-4 relative select-none" ref={containerRef}>
        {/* Overlay to block right-click and seeking */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          onContextMenu={e => e.preventDefault()}
        />
        <div style={{ aspectRatio: '16/9' }}>
          <iframe
            src={getEmbedUrl(room.embedUrl)}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            style={{ border: 'none', pointerEvents: 'auto' }}
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-white font-black text-xl">{room.title}</h2>
          {room.description && <p className="text-slate-400 text-sm mt-1">{room.description}</p>}
          {mySeats.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Ticket size={14} className="text-sky-400" />
              <span className="text-sky-400 text-sm font-bold">Ghế của bạn: {mySeats.join(', ')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
          <Users size={16} className="text-sky-400" />
          <span className="text-white font-bold text-sm">{room.viewerCount} đang xem</span>
        </div>
      </div>

      <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
        <Lock size={12} />
        Phim đang được phát trực tuyến. Không thể tua hoặc bỏ qua nội dung.
      </div>
    </div>
  );
}

// ── Seat Selection View ───────────────────────────────────────────────────
function SeatSelectionView({ room, onConfirm, onBack }: {
  room: CinemaRoom;
  onConfirm: (seats: string[]) => void;
  onBack: () => void;
}) {
  const [mySeats, setMySeats] = useState<string[]>([]);
  const [booking, setBooking] = useState(false);

  const handleBook = async (seatId: string) => {
    if (mySeats.length >= 2) { alert('Bạn chỉ có thể đặt tối đa 2 ghế.'); return; }
    setBooking(true);
    const ok = await bookSeat(room.id, seatId);
    if (ok) setMySeats(prev => [...prev, seatId]);
    setBooking(false);
  };

  const handleUnbook = async (seatId: string) => {
    await unbookSeat(room.id, seatId);
    setMySeats(prev => prev.filter(s => s !== seatId));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-5 text-sm font-bold">
        ← Quay lại
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center justify-center">
          <Ticket size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-white font-black text-xl">Chọn ghế ngồi</h1>
          <p className="text-slate-400 text-sm">{room.title}</p>
        </div>
      </div>

      {/* Live room info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        {room.scheduledAt && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={15} className="text-sky-400" />
            <span className="text-slate-300">{formatSchedule(room.scheduledAt)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users size={15} className="text-sky-400" />
          <span className="text-slate-300">
            {(room.bookedSeats?.length || 0)}/{room.totalSeats || 40} ghế đã đặt
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
          <span className="text-sky-400 font-bold">{room.viewerCount} đang xem</span>
        </div>
      </div>

      <SeatMap room={room} mySeats={mySeats} onBook={handleBook} onUnbook={handleUnbook} />

      <button
        disabled={mySeats.length === 0 || booking}
        onClick={() => onConfirm(mySeats)}
        className="mt-5 w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 text-base transition-all shadow-lg shadow-sky-500/25"
      >
        <Play size={18} className="fill-current" />
        {mySeats.length > 0 ? `Xem phim (Ghế: ${mySeats.join(', ')})` : 'Chọn ít nhất 1 ghế'}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function CinemaPage() {
  const [rooms, setRooms] = useState<CinemaRoom[]>([]);
  const [selected, setSelected] = useState<CinemaRoom | null>(null);
  const [mySeats, setMySeats] = useState<string[]>([]);
  const [phase, setPhase] = useState<'list' | 'seats' | 'watch'>('list');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthChange(async u => {
      if (u) { const p = await getUserProfile(u.uid); setUser(p); }
      else setUser(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeCinemaRooms(data => {
      setRooms(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (phase !== 'watch' || !selected) return;
    joinCinemaRoom(selected.id);
    return () => { leaveCinemaRoom(selected.id); };
  }, [phase, selected?.id]);

  if (user === undefined || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-t-transparent rounded-full animate-spin border-sky-500" style={{ borderWidth: 3, borderStyle: 'solid' }} />
      </div>
    );
  }

  // Must be logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center justify-center">
          <Lock size={36} className="text-sky-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Chỉ dành cho thành viên</h2>
          <p className="text-slate-400 text-sm max-w-xs">Bạn cần đăng nhập để vào xem phim tại Rạp Chiếu của Đảo Phim.</p>
        </div>
        <Link to="/auth"
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-3 rounded-2xl transition-all shadow-lg shadow-sky-500/25">
          <LogIn size={18} />
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (phase === 'watch' && selected) {
    return (
      <WatchingView
        room={selected}
        mySeats={mySeats}
        onBack={() => { setPhase('list'); setSelected(null); setMySeats([]); }}
      />
    );
  }

  if (phase === 'seats' && selected) {
    return (
      <SeatSelectionView
        room={selected}
        onConfirm={seats => { setMySeats(seats); setPhase('watch'); }}
        onBack={() => { setPhase('list'); setSelected(null); }}
      />
    );
  }

  // Room list
  const activeRooms = rooms.filter(r => r.isActive || (r.scheduledAt));
  const scheduledRooms = activeRooms.filter(r => r.scheduledAt && !r.isActive);
  const liveRooms = activeRooms.filter(r => r.isActive);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-center">
          <MonitorPlay size={24} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Rạp Chiếu Phim</h1>
          <p className="text-slate-400 text-sm">Cùng nhau xem phim – đặt ghế & xem trực tuyến</p>
        </div>
      </div>

      {liveRooms.length === 0 && scheduledRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <MonitorPlay size={48} className="text-slate-600" />
          <h2 className="text-xl font-black text-white">Chưa có phòng chiếu nào</h2>
          <p className="text-slate-400 text-sm">Admin sẽ sớm mở phòng chiếu, hãy quay lại sau!</p>
        </div>
      ) : (
        <>
          {liveRooms.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
                <h2 className="text-white font-black text-lg">Đang Chiếu</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveRooms.map(room => <RoomCard key={room.id} room={room} onEnter={() => { setSelected(room); setPhase('seats'); }} />)}
              </div>
            </section>
          )}
          {scheduledRooms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-slate-400" />
                <h2 className="text-white font-black text-lg">Lịch Chiếu</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {scheduledRooms.map(room => <RoomCard key={room.id} room={room} onEnter={() => { setSelected(room); setPhase('seats'); }} scheduled />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RoomCard({ room, onEnter, scheduled }: { room: CinemaRoom; onEnter: () => void; scheduled?: boolean }) {
  const booked = room.bookedSeats?.length || 0;
  const total = room.totalSeats || 40;
  const pct = Math.round((booked / total) * 100);

  return (
    <button onClick={onEnter}
      className="group text-left rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-sky-500/60 transition-all hover:scale-[1.02]">
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        {room.thumbnail ? (
          <img src={room.thumbnail} alt={room.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Play size={40} className="text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        {scheduled ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500/90 backdrop-blur px-2.5 py-1 rounded-full">
            <Clock size={12} className="text-white" />
            <span className="text-white text-xs font-bold">Sắp chiếu</span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-sky-500/90 backdrop-blur px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">Đang chiếu</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-full">
          <Users size={12} className="text-sky-400" />
          <span className="text-white text-xs font-bold">{room.viewerCount}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 bg-sky-500 rounded-full flex items-center justify-center shadow-xl">
            <Ticket size={22} className="text-slate-950" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-black text-base line-clamp-1 group-hover:text-sky-400 transition-colors">{room.title}</h3>
        {room.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{room.description}</p>}
        {room.scheduledAt && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <Calendar size={12} />
            <span>{formatSchedule(room.scheduledAt)}</span>
          </div>
        )}
        {/* Seat bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1"><Ticket size={11} /> Ghế: {booked}/{total}</span>
            <span>{pct}% đã đặt</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
