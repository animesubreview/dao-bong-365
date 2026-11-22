import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Crown, Film, LogIn, Send, Trash2, Volume2, VolumeX, X, CornerUpLeft } from 'lucide-react';
import { getCurrentUser, getUserProfile, onAuthChange, UserProfile } from '../lib/auth';
import ProfileCard from './ProfileCard';
import { useCommunityConfig } from '../lib/communityRoom';
import {
  ChatTongMessage, ChatReply, OnlineCounts, deleteChatMessage, fetchOnlineCounts, loadRecentMessages,
  mergeMessage, sendChatMessage, subscribeLive,
} from '../lib/chatTong';

// Mở khung chat từ nơi khác (vd popup cộng đồng): window.dispatchEvent(new Event('open-chat-tong'))
export const OPEN_CHAT_EVENT = 'open-chat-tong';

const SOUND_KEY = 'ct_sound';
const HIDE_ON = ['/watch', '/watch-manual', '/watch-room', '/daophim', '/auth', '/chat', '/truc-tiep'];

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.stop(ctx.currentTime + 0.2); setTimeout(() => ctx.close?.(), 400);
  } catch {}
}

export default function ChatTong() {
  const cfg = useCommunityConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<OnlineCounts | null>(null);
  const [messages, setMessages] = useState<ChatTongMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatReply | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [card, setCard] = useState<{ uid: string; name: string; avatar: string } | null>(null);
  const [user, setUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch { return true; } });
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const soundRef = useRef(sound); soundRef.current = sound;
  const uidRef = useRef<string | null>(null);

  useEffect(() => onAuthChange(async u => { setUser(u); uidRef.current = u?.uid ?? null; setProfile(u ? await getUserProfile(u.uid) : null); }), []);

  // Số online: đếm nhẹ mỗi 60 giây (chỉ khi tab đang hiện)
  useEffect(() => {
    let alive = true;
    const load = () => { if (document.visibilityState === 'hidden') return; fetchOnlineCounts().then(c => { if (alive) setCounts(c); }).catch(() => {}); };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, h);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, h);
  }, []);

  // Chỉ tải tin + mở realtime khi khung đang mở
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    loadRecentMessages().then(l => { if (alive) setMessages(l); }).catch(() => setErr('Không tải được tin nhắn.')).finally(() => alive && setLoading(false));
    const unsub = subscribeLive(m => {
      setMessages(l => mergeMessage(l, m));
      if (soundRef.current && m.uid !== uidRef.current && m.kind !== 'activity') beep();
    });
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { alive = false; unsub(); document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open && stickRef.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, loading]);

  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const toggleSound = () => { const v = !sound; setSound(v); try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch {} };

  const canPost = !!user && !!profile && !profile.isBanned && cfg.chatEnabled;
  const lastSend = useRef(0);
  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || !user || !profile || sending) return;
    if (t.length > 300) { setErr('Tin nhắn tối đa 300 ký tự.'); return; }
    if (Date.now() - lastSend.current < 1500) { setErr('Bạn nhắn nhanh quá, chờ chút nhé.'); return; }
    setSending(true); setErr('');
    try {
      const m = await sendChatMessage({
        uid: user.uid, username: profile.username, avatar: profile.avatar, text: t,
        isAdmin: profile.role === 'admin', createdAt: Date.now(), kind: 'text',
        ...(replyTo ? { replyTo } : {}),
      });
      lastSend.current = Date.now();
      setMessages(l => mergeMessage(l, m));
      stickRef.current = true;
      setText(''); setReplyTo(null);
    } catch { setErr('Gửi thất bại, thử lại sau.'); }
    finally { setSending(false); }
  }, [text, user, profile, sending, replyTo]);

  const hidden = !cfg.chatEnabled || HIDE_ON.some(p => location.pathname.startsWith(p));
  if (hidden && !open) return null;

  const isAdmin = profile?.role === 'admin';
  const goLogin = () => { setOpen(false); navigate('/auth'); };

  return (
    <>
      <style>{`
        @keyframes ct-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes ct-spin { to { transform: rotate(360deg) } }
        @keyframes ct-up { from { transform: translateY(100%) } to { transform: none } }
        @keyframes ct-fade { from { opacity: 0 } to { opacity: 1 } }
        .ct-orb { animation: ct-float 3.2s ease-in-out infinite }
        .ct-ring { animation: ct-spin 6s linear infinite }
        .ct-sheet { animation: ct-up .28s cubic-bezier(.2,.8,.2,1) }
        .ct-back { animation: ct-fade .2s ease }
      `}</style>

      {/* Quả cầu nổi */}
      {!open && !hidden && (
        <button onClick={() => setOpen(true)} aria-label="Mở Kênh Chat Tổng"
          className="ct-orb fixed z-[45] right-3 bottom-[216px] lg:right-[176px] min-[1800px]:right-[216px] lg:bottom-6 w-[60px] h-[60px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), var(--primary-light) 38%, #0b1020 78%)', boxShadow: '0 0 22px color-mix(in srgb, var(--primary) 55%, transparent), inset 0 0 12px rgba(0,0,0,.45)' }}>
          <span className="ct-ring absolute -inset-1.5 rounded-full border-2 border-transparent" style={{ borderTopColor: 'rgba(255,255,255,.85)', borderRightColor: 'rgba(250,204,21,.6)' }} />
          <span className="relative text-white font-black text-[15px] drop-shadow-[0_1px_3px_rgba(0,0,0,.8)]">{counts ? counts.total : '·'}</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-950" />
        </button>
      )}

      {open && (
        <div className="ct-back fixed inset-0 z-[9990] bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div className="ct-sheet absolute inset-x-0 bottom-0 h-[82dvh] md:inset-x-auto md:right-6 md:bottom-6 md:w-[440px] md:h-[640px] md:max-h-[88dvh] flex flex-col rounded-t-[28px] md:rounded-3xl bg-[#07080c] border border-slate-800/80 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()} role="dialog" aria-label="Kênh Chat Tổng">
            <div className="md:hidden mx-auto mt-2.5 mb-1 h-1 w-12 rounded-full bg-slate-700" />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/80 shrink-0">
              <span className="w-11 h-11 rounded-full shrink-0" style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), var(--primary-light) 38%, #0b1020 78%)' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-black text-lg leading-tight">Kênh Chat Tổng</h3>
                  <span className="inline-flex items-center gap-1 text-green-400 font-bold text-sm"><span className="w-2 h-2 rounded-full bg-green-400" />{counts ? `${counts.total} online` : '…'}</span>
                </div>
                {counts && <p className="text-slate-400 text-xs mt-0.5">{counts.members} thành viên · {counts.guests} khách</p>}
              </div>
              <button onClick={toggleSound} aria-label={sound ? 'Tắt âm' : 'Bật âm'} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-800">
                {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Đóng" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-800"><X size={22} /></button>
            </div>

            {cfg.notice && <div className="px-4 py-2 text-xs text-amber-200 bg-amber-500/10 border-b border-amber-500/20 shrink-0">📌 {cfg.notice}</div>}

            {/* Danh sách tin */}
            <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 overscroll-contain">
              {loading && <p className="text-slate-500 text-sm text-center mt-6">Đang tải…</p>}
              {!loading && messages.length === 0 && <p className="text-slate-600 text-sm text-center mt-8">Chưa có tin nhắn. Hãy là người đầu tiên bắt chuyện!</p>}
              {messages.map(m => {
                const mine = !!user && m.uid === user.uid;
                return (
                  <div key={m.id} className="group flex items-end gap-2">
                    <span onClick={() => setCard({ uid: m.uid, name: m.username, avatar: m.avatar })} role="button" aria-label={`Xem hồ sơ ${m.username}`} className="w-9 h-9 rounded-full shrink-0 p-[2px] cursor-pointer" style={{ background: 'conic-gradient(from 0deg, var(--primary-light), #fbbf24, #38bdf8, var(--primary-light))' }}>
                      <img src={m.avatar} alt="" loading="lazy" className="w-full h-full rounded-full object-cover bg-slate-800 border border-black" />
                    </span>
                    <div className="min-w-0 max-w-[82%]">
                      <div className="flex items-center gap-1.5 px-1 mb-0.5">
                        <span onClick={() => setCard({ uid: m.uid, name: m.username, avatar: m.avatar })} className={`cursor-pointer text-[13px] font-bold truncate ${m.isAdmin ? 'text-amber-400' : mine ? 'text-[var(--primary-light)]' : 'text-slate-300'}`}>{m.username}</span>
                        {m.isAdmin && <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400"><Crown size={12} />QTV</span>}
                      </div>

                      {m.kind === 'activity' && m.activity ? (
                        <Link to={m.activity.link} onClick={() => setOpen(false)} className="block rounded-2xl bg-slate-800/60 p-2 active:scale-[.99] transition-transform">
                          <div className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5">
                            <span className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-[var(--primary-light)]"><Film size={20} /></span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-[var(--primary-light)]">Đang xem phim</p>
                              <p className="text-sm font-bold text-white leading-snug line-clamp-2">{m.activity.movieName}</p>
                              {m.activity.episodeName && <p className="text-xs text-slate-400">{/^\d+$/.test(m.activity.episodeName) ? `tập ${m.activity.episodeName}` : m.activity.episodeName}</p>}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className={`rounded-2xl px-3.5 py-2.5 border ${m.isAdmin ? 'border-amber-500/40 bg-slate-900' : 'border-slate-800 bg-slate-900/80'}`}>
                          {m.replyTo && (
                            <div className="mb-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-400 truncate">
                              <span className="font-bold text-teal-300">@{m.replyTo.username}: </span>{m.replyTo.text}
                            </div>
                          )}
                          <p className="text-[15px] text-slate-100 leading-snug break-words whitespace-pre-wrap">{m.text}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 shrink-0">
                      {canPost && m.kind !== 'activity' && (
                        <button onClick={() => setReplyTo({ id: m.id, username: m.username, text: m.text.slice(0, 60) })} aria-label="Trả lời" className="p-1 text-slate-400 hover:text-white"><CornerUpLeft size={14} /></button>
                      )}
                      {isAdmin && (
                        <button onClick={() => deleteChatMessage(m.id).then(() => setMessages(l => l.filter(x => x.id !== m.id))).catch(() => setErr('Xóa thất bại.'))} aria-label="Xóa" className="p-1 text-red-400/80 hover:text-red-400"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {err && <p className="px-4 pb-1 text-xs text-red-400 shrink-0">{err}</p>}

            {/* Ô nhập */}
            <div className="shrink-0 border-t border-slate-800/80 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 rounded-xl bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                  <CornerUpLeft size={13} className="shrink-0 text-teal-300" />
                  <span className="truncate">Trả lời <b className="text-teal-300">@{replyTo.username}</b>: {replyTo.text}</span>
                  <button onClick={() => setReplyTo(null)} aria-label="Hủy trả lời" className="ml-auto shrink-0 text-slate-400"><X size={14} /></button>
                </div>
              )}
              {!cfg.chatEnabled ? (
                <p className="text-center text-slate-500 text-sm py-2">Admin đang tạm tắt trò chuyện.</p>
              ) : !user || !profile ? (
                <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 pl-4 pr-1.5 py-1.5">
                  <span className="text-slate-400 text-sm flex-1 truncate">Khách chỉ xem tin nhắn · Đăng nhập để chat</span>
                  <button onClick={goLogin} className="shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-black text-slate-950" style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}><LogIn size={16} />Đăng nhập</button>
                </div>
              ) : profile.isBanned ? (
                <p className="text-center text-red-400 text-sm py-2">Tài khoản của bạn đã bị khóa chat.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    maxLength={300} placeholder="Nhắn gì đó..." enterKeyHint="send"
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-full px-4 py-3 text-[15px] text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary)]/70" />
                  <button onClick={send} disabled={sending || !text.trim()} aria-label="Gửi"
                    className="w-11 h-11 shrink-0 rounded-full disabled:opacity-40 flex items-center justify-center text-slate-950"
                    style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}><Send size={18} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {open && card && (
        <ProfileCard uid={card.uid} fallbackName={card.name} fallbackAvatar={card.avatar} onClose={() => setCard(null)}
          onMention={n => { setText(t => (t.includes(`@${n} `) ? t : `@${n} ${t}`).slice(0, 300)); }} />
      )}
    </>
  );
}
