import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, MicOff, Users, PhoneOff, MessageCircle, Tv, X, Send, GripHorizontal, Loader2, Sparkles } from 'lucide-react';
import type { RoomMessage } from '../lib/watchRoom';
import { cn } from '../lib/utils';

interface Props {
  fullscreen: boolean;
  toggleFullscreen: () => void;
  title: string;
  hostName: string;
  memberCount: number;
  selfUid: string;
  messages: RoomMessage[];
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  voiceOn: boolean;
  voiceBusy: boolean;
  micMuted: boolean;
  voiceCount: number;
  onToggleVoice: () => void;
  onToggleMute: () => void;
}

interface Flying { id: string; text: string; name: string; top: number }

// Lớp điều khiển nổi khi xem toàn màn hình trong phòng xem chung: mic, chat, tin nhắn bay
export default function RoomOverlay(p: Props) {
  const [visible, setVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [fly, setFly] = useState(true);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [inputFocus, setInputFocus] = useState(false);
  const hideTimer = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef<string | null>(p.messages[p.messages.length - 1]?.id ?? null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // Tự ẩn thanh điều khiển sau 4s không chạm / di chuột
  const wake = () => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 4000);
  };
  useEffect(() => {
    if (!p.fullscreen) return;
    wake();
    const ev = ['pointermove', 'touchstart', 'keydown'];
    ev.forEach(e => document.addEventListener(e, wake, { passive: true }));
    return () => { ev.forEach(e => document.removeEventListener(e, wake)); clearTimeout(hideTimer.current); };
  }, [p.fullscreen]);

  // Cuộn chat xuống cuối khi có tin mới
  useEffect(() => {
    if (chatOpen) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [p.messages.length, chatOpen, p.fullscreen]);

  // Tin nhắn bay ngang màn hình (chỉ tin MỚI, không phát lại lịch sử)
  useEffect(() => {
    const msgs = p.messages;
    if (!msgs.length) return;
    const idx = lastSeen.current ? msgs.findIndex(m => m.id === lastSeen.current) : -1;
    const fresh = idx >= 0 ? msgs.slice(idx + 1) : (lastSeen.current === null ? msgs : []);
    lastSeen.current = msgs[msgs.length - 1].id;
    if (!p.fullscreen || !fly || fresh.length === 0) return;
    const items = fresh.slice(-5).map((m, i) => ({
      id: `${m.id}-${i}`, text: m.text, name: m.username, top: 12 + Math.floor(Math.random() * 5) * 9,
    }));
    setFlying(f => [...f, ...items]);
    items.forEach(it => setTimeout(() => setFlying(f => f.filter(x => x.id !== it.id)), 9500));
  }, [p.messages]);

  // Kéo khung chat
  const onDragStart = (e: React.PointerEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: drag.current.ox + e.clientX - drag.current.sx, y: drag.current.oy + e.clientY - drag.current.sy });
  };
  const onDragEnd = () => { drag.current = null; };

  if (!p.fullscreen) return null;

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const round = 'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all active:scale-90';
  const show = visible || inputFocus;

  return (
    <div className="absolute inset-0 pointer-events-none z-30" onClick={stop}>
      {/* Tin nhắn bay */}
      <div className="absolute inset-0 overflow-hidden">
        {flying.map(f => (
          <span key={f.id} className="absolute whitespace-nowrap text-white font-bold text-base sm:text-xl"
            style={{ top: `${f.top}%`, left: '100%', textShadow: '0 2px 6px rgba(0,0,0,.9)', animation: 'room-fly 9s linear forwards' }}>
            <span className="text-green-300">{f.name}: </span>{f.text}
          </span>
        ))}
      </div>

      {/* Thanh trên: quay lại + tên phim | mic, người, bay, rời voice | chat */}
      <div className={cn('absolute top-0 inset-x-0 p-3 sm:p-4 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
          <button onClick={p.toggleFullscreen} aria-label="Thoát toàn màn hình"
            className={cn(round, 'bg-black/40 border-white/30 text-white backdrop-blur')}><ArrowLeft size={20} /></button>
          <h2 className="text-white font-extrabold text-sm sm:text-lg truncate" style={{ textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{p.title}</h2>
        </div>

        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <div className="flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 p-1">
            {/* Mic: chưa vào voice → bấm để vào; đang trong voice → bấm để tắt/bật tiếng */}
            <button onClick={p.voiceOn ? p.onToggleMute : p.onToggleVoice} disabled={p.voiceBusy}
              aria-label={p.voiceOn ? (p.micMuted ? 'Bật mic' : 'Tắt mic') : 'Vào voice'}
              className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-60',
                !p.voiceOn ? 'bg-white/10 text-slate-200'
                  : p.micMuted ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400/60')}>
              {p.voiceBusy ? <Loader2 size={17} className="animate-spin" /> : p.voiceOn && p.micMuted ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <span className="flex items-center gap-1 px-1.5 text-white text-sm font-bold"><Users size={15} className="text-emerald-300" />{p.memberCount}</span>
            <button onClick={() => setFly(v => !v)} aria-label="Tin nhắn bay"
              className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90', fly ? 'text-emerald-300' : 'text-slate-400')}>
              <Sparkles size={17} />
            </button>
            {p.voiceOn && (
              <button onClick={p.onToggleVoice} aria-label="Rời voice"
                className="w-9 h-9 rounded-full flex items-center justify-center text-red-300 hover:bg-red-500/20 active:scale-90 transition-all">
                <PhoneOff size={17} />
              </button>
            )}
          </div>
          <button onClick={() => setChatOpen(v => !v)} aria-label="Chat"
            className={cn(round, chatOpen ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-300' : 'bg-black/40 border-white/20 text-white backdrop-blur')}>
            <MessageCircle size={19} />
          </button>
        </div>
      </div>

      {/* Khung chat nổi (kéo bằng thanh trên cùng) */}
      {chatOpen && (
        <div className="absolute right-3 sm:right-5 top-16 sm:top-20 w-[min(340px,64vw)] max-h-[62%] flex flex-col rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/60 overflow-hidden pointer-events-auto"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
          onClick={stop}>
          <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
            className="flex items-center gap-2 px-3 py-2 border-b border-white/10 cursor-grab active:cursor-grabbing touch-none select-none">
            <GripHorizontal size={14} className="text-slate-400 shrink-0" />
            <MessageCircle size={15} className="text-emerald-300 shrink-0" />
            <span className="text-white text-sm font-bold flex-1 truncate">Chat xem chung</span>
            <button onPointerDown={stop} onClick={() => setFly(v => !v)}
              className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border', fly ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'border-white/20 text-slate-400')}>
              <Tv size={11} />Bay: {fly ? 'Bật' : 'Tắt'}
            </button>
            <button onPointerDown={stop} onClick={() => setChatOpen(false)} aria-label="Đóng chat" className="text-slate-300 hover:text-white"><X size={16} /></button>
          </div>

          <div ref={listRef} className="flex-1 min-h-[96px] overflow-y-auto px-3 py-2 flex flex-col gap-2 glass-scroll">
            <div className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-center">
              Phòng xem chung của <b>{p.hostName}</b>. Chúc mọi người xem phim vui vẻ!
            </div>
            {p.messages.slice(-60).map(m => {
              const mine = m.uid === p.selfUid;
              return (
                <div key={m.id} className={cn('flex flex-col max-w-[88%]', mine ? 'self-end items-end' : 'self-start items-start')}>
                  {!mine && <span className="text-[10px] text-slate-400 mb-0.5 px-1">{m.username}</span>}
                  <span className={cn('text-sm px-3 py-1.5 rounded-2xl break-words', mine ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-white/15 text-white rounded-bl-md')}>{m.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 p-2 border-t border-white/10">
            <input value={p.text} onChange={e => p.setText(e.target.value)} placeholder="Nhắn tin..."
              onFocus={() => setInputFocus(true)} onBlur={() => setInputFocus(false)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onSend(); } }}
              className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-400/60" />
            <button onClick={p.onSend} disabled={!p.text.trim() || p.sending} aria-label="Gửi"
              className="w-9 h-9 shrink-0 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all">
              {p.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
