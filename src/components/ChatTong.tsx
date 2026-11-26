import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, SmilePlus, Crown, Film, LogIn, Play, Send, Trash2, Volume2, VolumeX, X, CornerUpLeft } from 'lucide-react';
import { getCurrentUser, getUserProfile, onAuthChange, UserProfile } from '../lib/auth';
import ProfileCard from './ProfileCard';
import EmojiPicker from './EmojiPicker';
import { isLiteDevice } from '../lib/perf';
import { useCommunityConfig } from '../lib/communityRoom';
import {
  ChatTongMessage, ChatReply, OnlineCounts, ReactionMap, addReaction, removeReaction, addToReactionMap, removeFromReactionMap,
  deleteChatMessage, fetchOnlineCounts, loadChat, mergeMessage, sendChatMessage, subscribeLive,
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

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Hiển thị nội dung tin, tô màu các @tên thành viên */
function MsgText({ text, names, mine }: { text: string; names: string[]; mine: boolean }) {
  const parts = useMemo(() => {
    if (!names.length || !text.includes('@')) return [text];
    const re = new RegExp('@(' + [...names].sort((a, b) => b.length - a.length).map(esc).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
    const out: (string | { m: string })[] = [];
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push({ m: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [text, names]);
  return (
    <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
      {parts.map((x, i) => typeof x === 'string' ? x : (
        <span key={i} className={`rounded-md px-1 -mx-0.5 font-bold ${mine ? 'bg-black/15 text-slate-950' : 'bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[var(--primary-light)]'}`}>{x.m}</span>
      ))}
    </p>
  );
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
  const lite = isLiteDevice();
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [mention, setMention] = useState<{ anchor: number; query: string } | null>(null);
  const [mAct, setMAct] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Số online: đếm nhẹ mỗi 3 phút (chỉ khi tab đang hiện)
  useEffect(() => {
    let alive = true;
    const load = () => { if (document.visibilityState === 'hidden') return; fetchOnlineCounts().then(c => { if (alive) setCounts(c); }).catch(() => {}); };
    load();
    const t = setInterval(load, 180_000);
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
    loadChat().then(r => { if (alive) { setMessages(r.messages); setReactions(r.reactions); } }).catch(() => setErr('Không tải được tin nhắn.')).finally(() => alive && setLoading(false));
    const unsub = subscribeLive(m => {
      if (m.kind === 'reaction') { setReactions(r => addToReactionMap(r, m as any)); return; }
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

  // Danh sách thành viên gợi ý @: lấy từ những người đã nhắn trong khung chat (không tốn thêm truy vấn)
  const members = useMemo(() => {
    const seen = new Map<string, { uid: string; name: string; avatar: string; isAdmin: boolean }>();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m.username || seen.has(m.uid)) continue;
      seen.set(m.uid, { uid: m.uid, name: m.username, avatar: m.avatar, isAdmin: !!m.isAdmin });
    }
    return [...seen.values()];
  }, [messages]);
  const memberNames = useMemo(() => members.map(x => x.name), [members]);
  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return members
      .filter(x => x.uid !== user?.uid && x.name.toLowerCase().includes(q))
      .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1))
      .slice(0, 6);
  }, [mention, members, user?.uid]);

  const detectMention = (value: string, caret: number) => {
    const m = /(^|\s)@([^\s@]{0,16})$/.exec(value.slice(0, caret));
    if (!m) { setMention(null); return; }
    const anchor = caret - m[2].length - 1;
    setMention(prev => { if (!prev || prev.anchor !== anchor) setMAct(0); return { anchor, query: m[2] }; });
  };
  const pickMention = (name: string) => {
    if (!mention) return;
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const ins = '@' + name + ' ';
    const next = (text.slice(0, mention.anchor) + ins + text.slice(caret)).slice(0, 300);
    setText(next); setMention(null);
    const pos = Math.min(next.length, mention.anchor + ins.length);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos); });
  };
  const insertAt = () => {
    const el = inputRef.current; if (!el) return;
    const s0 = el.selectionStart ?? text.length, e0 = el.selectionEnd ?? s0;
    const pre = text.slice(0, s0);
    const ins = (pre && !/\s$/.test(pre) ? ' ' : '') + '@';
    const next = (pre + ins + text.slice(e0)).slice(0, 300);
    setText(next);
    const pos = s0 + ins.length;
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos); detectMention(next, pos); });
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user || !profile || profile.isBanned) return;
    const uid = user.uid;
    const has = !!reactions[msgId]?.[emoji]?.includes(uid);
    setReactions(r => has ? removeFromReactionMap(r, { targetId: msgId, emoji, uid }) : addToReactionMap(r, { targetId: msgId, emoji, uid }));
    try { if (has) await removeReaction(msgId, uid, emoji); else await addReaction(msgId, uid, emoji); }
    catch {
      setReactions(r => has ? addToReactionMap(r, { targetId: msgId, emoji, uid }) : removeFromReactionMap(r, { targetId: msgId, emoji, uid }));
      setErr('Không thả được cảm xúc, thử lại sau.');
    }
  };

  const hidden = !cfg.chatEnabled || HIDE_ON.some(p => location.pathname.startsWith(p));
  if (hidden && !open) return null;

  const isAdmin = profile?.role === 'admin';
  const goLogin = () => { setOpen(false); navigate('/auth'); };

  return (
    <>
      <style>{`
        @keyframes ct-pop-in { from { opacity: 0; transform: translateY(6px) scale(.94) } }
        .ct-pop { animation: ct-pop-in .28s cubic-bezier(.3,1.45,.5,1) both; transform-origin: 20px 100% }
        .ct-soft { -webkit-mask-image: radial-gradient(closest-side,#000 0,rgba(0,0,0,.55) 45%,transparent 100%); mask-image: radial-gradient(closest-side,#000 0,rgba(0,0,0,.55) 45%,transparent 100%) }
        ${lite ? '.ct-orb,.ct-ring,.ct-ring2,.ct-wave,.ct-blob1,.ct-blob2,.ct-gold,.ct-dot { animation: none !important }' : ''}
        ${card ? '.ct-back *, .ct-orb, .ct-orb * { animation-play-state: paused !important }' : ''}
        @keyframes ct-rx-pop { 0% { transform: scale(0) } 60% { transform: scale(1.18) } 100% { transform: none } }
        .ct-rx { animation: ct-rx-pop .5s cubic-bezier(.34,1.9,.5,1) both }
        @keyframes ct-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes ct-spin { to { transform: rotate(360deg) } }
        @keyframes ct-spin-r { to { transform: rotate(-360deg) } }
        @keyframes ct-up { from { transform: translateY(100%) } to { transform: none } }
        @keyframes ct-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ct-pop { from { opacity: 0; transform: translateY(10px) scale(.96) } to { opacity: 1; transform: none } }
        @keyframes ct-wave { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes ct-blob1 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(40px,30px) scale(1.25) } }
        @keyframes ct-blob2 { 0%,100% { transform: translate(0,0) scale(1.1) } 50% { transform: translate(-50px,-20px) scale(.9) } }
        @keyframes ct-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,.7) } 50% { box-shadow: 0 0 0 6px rgba(74,222,128,0) } }
        @keyframes ct-shine { from { background-position: 0 0 } to { background-position: 200% 0 } }
        .ct-orb { animation: ct-float 3.2s ease-in-out infinite }
        .ct-ring { animation: ct-spin 5s linear infinite }
        .ct-ring2 { animation: ct-spin-r 8s linear infinite }
        .ct-wave { animation: ct-wave 2.6s ease-out infinite }
        .ct-sheet { animation: ct-up .3s cubic-bezier(.2,.8,.2,1) }
        .ct-back { animation: ct-fade .2s ease }
        .ct-msg { animation: ct-pop .28s cubic-bezier(.2,.8,.2,1) both }
        .ct-blob1 { animation: ct-blob1 12s ease-in-out infinite }
        .ct-blob2 { animation: ct-blob2 15s ease-in-out infinite }
        .ct-dot { animation: ct-dot 1.8s ease-out infinite }
        .ct-gold { background: linear-gradient(110deg,#f59e0b,#fde68a,#f59e0b,#fde68a); background-size: 200% 100%; animation: ct-shine 3s linear infinite }
        @media (prefers-reduced-motion: reduce) { .ct-orb,.ct-ring,.ct-ring2,.ct-wave,.ct-blob1,.ct-blob2,.ct-dot,.ct-gold { animation: none } }
      `}</style>

      {/* Quả cầu nổi */}
      {!open && !hidden && (
        <button onClick={() => setOpen(true)} aria-label="Mở Kênh Chat Tổng"
          className="ct-orb fixed z-[45] right-3 bottom-[216px] lg:right-[176px] min-[1800px]:right-[216px] lg:bottom-6 w-[60px] h-[60px] rounded-full flex items-center justify-center active:scale-95 transition-transform">
          <span className="ct-wave absolute inset-0 rounded-full" style={{ background: 'var(--primary)' }} />
          <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.6), var(--primary-light) 38%, #0b1020 80%)', boxShadow: '0 0 24px color-mix(in srgb, var(--primary) 65%, transparent), inset 0 0 12px rgba(0,0,0,.45)' }} />
          <span className="ct-ring absolute -inset-1.5 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0 40%, rgba(255,255,255,.9) 62%, rgba(250,204,21,.85) 80%, transparent 100%)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))' }} />
          <span className="relative text-white font-black text-[15px] drop-shadow-[0_1px_3px_rgba(0,0,0,.8)]">{counts ? counts.total : '·'}</span>
          <span className="ct-dot absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-950" />
        </button>
      )}

      {open && (
        <div className="ct-back fixed inset-0 z-[9990] bg-black/65" onClick={() => setOpen(false)}>
          <div className="ct-sheet absolute inset-x-0 bottom-0 h-[84dvh] md:inset-x-auto md:right-6 md:bottom-6 md:w-[440px] md:h-[660px] md:max-h-[88dvh] flex flex-col rounded-t-[30px] md:rounded-[28px] bg-[#06070b] shadow-[0_-10px_60px_rgba(0,0,0,.7)] overflow-hidden isolate"
            style={{ border: '1px solid color-mix(in srgb, var(--primary) 35%, #1e293b)' }}
            onClick={e => e.stopPropagation()} role="dialog" aria-label="Kênh Chat Tổng">
            {/* Nền cực quang chuyển động */}
            <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
              <div className="ct-blob1 absolute -top-24 -left-20 w-72 h-72 rounded-full ct-soft opacity-40" style={{ background: 'var(--primary)' }} />
              <div className="ct-blob2 absolute top-1/3 -right-24 w-72 h-72 rounded-full ct-soft opacity-25" style={{ background: '#7c3aed' }} />
              <div className="ct-blob1 absolute -bottom-28 left-10 w-72 h-72 rounded-full ct-soft opacity-20" style={{ background: '#0ea5e9' }} />
            </div>
            <div className="md:hidden mx-auto mt-2.5 mb-1 h-1 w-12 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03] shrink-0">
              <span className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.6), var(--primary-light) 38%, #0b1020 80%)', boxShadow: '0 0 18px color-mix(in srgb, var(--primary) 60%, transparent)' }} />
                <span className="ct-ring absolute -inset-1 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0 40%, rgba(255,255,255,.9) 62%, rgba(250,204,21,.85) 80%, transparent 100%)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))' }} />
                <span className="ct-ring2 absolute -inset-2.5 rounded-full opacity-60" style={{ background: 'conic-gradient(from 90deg, transparent 0 60%, var(--primary-light) 85%, transparent 100%)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))' }} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-black text-lg leading-tight tracking-tight">Kênh Chat Tổng</h3>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="inline-flex items-center gap-1.5 text-green-400 font-bold text-sm"><span className="ct-dot w-2 h-2 rounded-full bg-green-400" />{counts ? `${counts.total} online` : '…'}</span>
                  {counts && <span className="text-slate-400 text-xs">{counts.members} thành viên · {counts.guests} khách</span>}
                </div>
              </div>
              <button onClick={toggleSound} aria-label={sound ? 'Tắt âm' : 'Bật âm'} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-200 bg-white/5 hover:bg-white/10 active:scale-95 transition">
                {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Đóng" className="w-10 h-10 flex items-center justify-center rounded-full text-slate-200 bg-white/5 hover:bg-white/10 active:scale-95 transition"><X size={21} /></button>
            </div>

            {cfg.notice && <div className="px-4 py-2 text-xs text-amber-200 bg-amber-500/10 border-b border-amber-500/20 shrink-0">📌 {cfg.notice}</div>}

            {/* Danh sách tin */}
            <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3.5 overscroll-contain">
              {loading && <p className="text-slate-500 text-sm text-center mt-6">Đang tải…</p>}
              {!loading && messages.length === 0 && <p className="text-slate-500 text-sm text-center mt-8">Chưa có tin nhắn. Hãy là người đầu tiên bắt chuyện!</p>}
              {messages.map(m => {
                const mine = !!user && m.uid === user.uid;
                const open_ = () => setCard({ uid: m.uid, name: m.username, avatar: m.avatar });
                return (
                  <div key={m.id} className={`ct-msg group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                    <button onClick={open_} aria-label={`Xem hồ sơ ${m.username}`} className="relative w-10 h-10 shrink-0 active:scale-95 transition-transform">
                      <span className={`${m.isAdmin ? 'ct-ring' : ''} absolute inset-0 rounded-full`} style={{ background: m.isAdmin ? 'conic-gradient(from 0deg,#f59e0b,#fde68a,#c084fc,#f59e0b)' : 'conic-gradient(from 0deg, var(--primary-light), #fbbf24, #38bdf8, var(--primary-light))' }} />
                      <img src={m.avatar} alt="" loading="lazy" className="absolute inset-[2.5px] w-[calc(100%-5px)] h-[calc(100%-5px)] rounded-full object-cover bg-slate-800 border border-black" />
                    </button>
                    <div className={`min-w-0 max-w-[80%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 px-1 mb-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        <button onClick={open_} className={`text-[13px] font-bold truncate max-w-[160px] ${m.isAdmin ? 'text-amber-300' : mine ? 'text-[var(--primary-light)]' : 'text-slate-200'}`}>{m.username}</button>
                        {m.isAdmin && <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-900 rounded-full px-2 py-[2px] ct-gold"><Crown size={11} />QTV</span>}
                      </div>

                      {m.kind === 'activity' && m.activity ? (
                        <Link to={m.activity.link} onClick={() => setOpen(false)} className="block w-[250px] max-w-full rounded-2xl p-[1.5px] active:scale-[.98] transition-transform" style={{ background: 'linear-gradient(135deg, var(--primary), #38bdf8 50%, #a855f7)' }}>
                          <div className="flex items-center gap-3 rounded-[14px] bg-[#0b0e16] p-2">
                            <span className="relative w-14 h-[74px] rounded-lg overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center">
                              {m.activity.thumb ? <img src={m.activity.thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <Film size={22} className="text-[var(--primary-light)]" />}
                              <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <Play size={18} className="relative text-white drop-shadow" fill="currentColor" />
                            </span>
                            <div className="min-w-0 pr-1">
                              <p className="text-[11px] font-black text-[var(--primary-light)] flex items-center gap-1.5"><span className="ct-dot w-1.5 h-1.5 rounded-full bg-green-400" />Đang xem phim</p>
                              <p className="text-sm font-bold text-white leading-snug line-clamp-2 mt-0.5">{m.activity.movieName}</p>
                              {m.activity.episodeName && <p className="text-xs text-slate-400 mt-0.5">{/^\d+$/.test(m.activity.episodeName) ? `Tập ${m.activity.episodeName}` : m.activity.episodeName}</p>}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className={m.isAdmin ? 'rounded-[20px] p-[1.5px] ct-gold' : ''}>
                          <div className={`px-3.5 py-2.5 ${mine ? 'rounded-[20px] rounded-br-md text-slate-950' : m.isAdmin ? 'rounded-[19px] bg-[#0d0f18] text-slate-100' : 'rounded-[20px] rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100'}`}
                            style={mine ? { background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', boxShadow: '0 4px 18px color-mix(in srgb, var(--primary) 35%, transparent)' } : undefined}>
                            {m.replyTo && (
                              <div className={`mb-1.5 rounded-full px-3 py-1 text-xs truncate ${mine ? 'bg-black/15 text-slate-900/80' : 'bg-black/30 text-slate-400'}`}>
                                <span className={`font-bold ${mine ? 'text-slate-950' : 'text-teal-300'}`}>@{m.replyTo.username}: </span>{m.replyTo.text}
                              </div>
                            )}
                            <MsgText text={m.text} names={memberNames} mine={mine} />
                          </div>
                        </div>
                      )}
                      {reactions[m.id] && Object.keys(reactions[m.id]).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? 'justify-end' : ''}`}>
                          {Object.entries(reactions[m.id]).map(([emoji, uids]) => {
                            const me = !!user && uids.includes(user.uid);
                            return (
                              <button key={emoji} type="button" disabled={!canPost} onClick={() => toggleReaction(m.id, emoji)}
                                aria-label={`${emoji} ${uids.length}${me ? ' (bạn đã thả)' : ''}`} aria-pressed={me}
                                className={`ct-rx flex items-center gap-1 h-6 pl-1.5 pr-2 rounded-full text-[15px] leading-none transition active:scale-90 ${me ? 'bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] ring-[1.5px] ring-[var(--primary)]' : 'bg-white/[0.07] ring-1 ring-white/10 hover:bg-white/10'}`}>
                                <span>{emoji}</span><b className={`text-[11px] font-bold ${me ? 'text-[var(--primary-light)]' : 'text-slate-300'}`}>{uids.length}</b>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-70 shrink-0 transition-opacity">
                      {canPost && (
                        <button onClick={() => setPickFor(m.id)} aria-label="Thả cảm xúc" className="p-1 text-slate-400 hover:text-white"><SmilePlus size={14} /></button>
                      )}
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
            <div className="shrink-0 border-t border-white/10 bg-black/30 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 rounded-xl bg-white/[0.07] px-3 py-1.5 text-xs text-slate-300">
                  <CornerUpLeft size={13} className="shrink-0 text-teal-300" />
                  <span className="truncate">Trả lời <b className="text-teal-300">@{replyTo.username}</b>: {replyTo.text}</span>
                  <button onClick={() => setReplyTo(null)} aria-label="Hủy trả lời" className="ml-auto shrink-0 text-slate-400"><X size={14} /></button>
                </div>
              )}
              {!cfg.chatEnabled ? (
                <p className="text-center text-slate-500 text-sm py-2">Admin đang tạm tắt trò chuyện.</p>
              ) : !user || !profile ? (
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] pl-4 pr-1.5 py-1.5">
                  <span className="text-slate-400 text-sm flex-1 truncate">Khách chỉ xem tin nhắn · Đăng nhập để chat</span>
                  <button onClick={goLogin} className="shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-black text-slate-950" style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}><LogIn size={16} />Đăng nhập</button>
                </div>
              ) : profile.isBanned ? (
                <p className="text-center text-red-400 text-sm py-2">Tài khoản của bạn đã bị khóa chat.</p>
              ) : (
                <div className="relative flex items-center gap-2">
                  {mention && suggestions.length > 0 && (
                    <div role="listbox" aria-label="Thành viên" className="ct-pop absolute bottom-full left-0 mb-2 w-[250px] max-w-full rounded-2xl border border-white/10 bg-[#0d1018]/95 p-1.5 shadow-2xl shadow-black/60 z-10"
                      onMouseDown={e => e.preventDefault()}>
                      {suggestions.map((x, i) => (
                        <button key={x.uid} type="button" role="option" aria-selected={i === mAct}
                          onMouseEnter={() => setMAct(i)} onClick={() => pickMention(x.name)}
                          className={`w-full flex items-center gap-2.5 h-10 px-2 rounded-xl text-left transition-colors ${i === mAct ? 'bg-white/10' : ''}`}>
                          {x.avatar
                            ? <img src={x.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                            : <span className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(145deg,#7CCBFF,#3B6CF0)' }}>{x.name.charAt(0).toUpperCase()}</span>}
                          <span className={`flex-1 truncate text-[13.5px] ${i === mAct ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>{x.name}</span>
                          {x.isAdmin && <span className="text-[10px] font-black text-amber-300">ADMIN</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <input ref={inputRef} value={text}
                    onChange={e => { setText(e.target.value); detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length); }}
                    onClick={e => detectMention(text, (e.target as HTMLInputElement).selectionStart ?? text.length)}
                    onBlur={() => setMention(null)}
                    onKeyDown={e => {
                      if (mention && suggestions.length > 0) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setMAct(a => (a + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
                          return;
                        }
                        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(suggestions[Math.min(mAct, suggestions.length - 1)].name); return; }
                        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMention(null); return; }
                      }
                      if (e.key === 'Enter') send();
                    }}
                    maxLength={300} placeholder="Nhắn gì đó... gõ @ để nhắc thành viên" enterKeyHint="send" autoComplete="off"
                    className="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-full px-4 py-3 text-[15px] text-white placeholder:text-slate-500 outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]" />
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertAt} aria-label="Nhắc thành viên"
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition"><AtSign size={19} /></button>
                  <button onClick={send} disabled={sending || !text.trim()} aria-label="Gửi"
                    className="w-12 h-12 shrink-0 rounded-full disabled:opacity-40 flex items-center justify-center text-slate-950 active:scale-90 transition"
                    style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', boxShadow: '0 4px 16px color-mix(in srgb, var(--primary) 45%, transparent)' }}><Send size={19} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {open && pickFor && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[10010] flex justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto">
            <EmojiPicker onPick={e => toggleReaction(pickFor, e)} onClose={() => setPickFor(null)} />
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
