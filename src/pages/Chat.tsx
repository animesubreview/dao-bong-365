import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, Shield, LogIn, MessageCircle, Users, Mic, MicOff, PhoneOff, Clapperboard, Pin } from 'lucide-react';
import { subscribeCommunityChat, sendCommunityChatMessage, LiveChatMessage } from '../lib/livestream';
import { getCurrentUser, getUserProfile, onAuthChange, UserProfile } from '../lib/auth';
import { usePageTitle } from '../lib/utils';
import { VoiceChat, VoicePeer } from '../lib/voiceChat';
import {
  CommunityConfig, DEFAULT_COMMUNITY, subscribeCommunityConfig, COMMUNITY_VOICE_ROOM, countVoiceUsers,
  MovieRequest, subscribeMovieRequests, addMovieRequest,
} from '../lib/communityRoom';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  done: { label: 'Đã thêm', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  rejected: { label: 'Từ chối', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export default function ChatPage() {
  usePageTitle('Chat cộng đồng');
  const [cfg, setCfg] = useState<CommunityConfig>(DEFAULT_COMMUNITY);
  const [tab, setTab] = useState<'chat' | 'request'>('chat');
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [requests, setRequests] = useState<MovieRequest[]>([]);
  const [text, setText] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Mic
  const voiceRef = useRef<VoiceChat | null>(null);
  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => subscribeCommunityConfig(setCfg), []);
  useEffect(() => onAuthChange(async (u) => { setCurrentUser(u); setProfile(u ? await getUserProfile(u.uid) : null); }), []);
  useEffect(() => subscribeCommunityChat(setMessages), []);
  useEffect(() => { if (tab === 'request') return subscribeMovieRequests(setRequests); }, [tab]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, tab]);
  // Rời phòng thoại khi thoát trang hoặc khi admin tắt mic
  useEffect(() => () => { voiceRef.current?.leave(); voiceRef.current = null; }, []);
  useEffect(() => { if (!cfg.micEnabled && voiceRef.current) leaveVoice(); }, [cfg.micEnabled]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  const canPost = !!currentUser && !!profile && !profile.isBanned;

  const handleSend = useCallback(async () => {
    if (!currentUser || !profile || !cfg.chatEnabled) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 300 || profile.isBanned) return;
    setSending(true);
    try {
      await sendCommunityChatMessage({
        uid: currentUser.uid, username: profile.username, avatar: profile.avatar, text: trimmed,
        isAdmin: profile.role === 'admin', createdAt: Date.now(),
      });
      setText('');
    } finally { setSending(false); }
  }, [currentUser, profile, text, cfg.chatEnabled]);

  const joinVoice = async () => {
    if (!currentUser || !profile || joining || voiceRef.current) return;
    setJoining(true);
    try {
      const n = await countVoiceUsers();
      if (!cfg.micUnlimited && n >= cfg.micMax) { flash(`Phòng thoại đã đủ ${cfg.micMax} người, thử lại sau nhé.`); return; }
      const vc = new VoiceChat(COMMUNITY_VOICE_ROOM, currentUser.uid, setPeers);
      await vc.join();
      voiceRef.current = vc; setInVoice(true); setMuted(false);
    } catch (e: any) {
      flash(e?.name === 'NotAllowedError' ? 'Bạn chưa cho phép dùng micro — bật quyền micro cho trang web rồi thử lại.' : (e?.message || 'Không bật được micro'));
    } finally { setJoining(false); }
  };
  const leaveVoice = async () => {
    const vc = voiceRef.current; voiceRef.current = null;
    setInVoice(false); setPeers([]);
    await vc?.leave();
  };
  const toggleMute = () => { const vc = voiceRef.current; if (!vc) return; const m = !vc.isMuted(); vc.setMuted(m); setMuted(m); };

  const submitRequest = async () => {
    if (!currentUser || !profile || !cfg.requestsEnabled) return;
    const title = reqTitle.trim();
    if (title.length < 2) { flash('Nhập tên phim bạn muốn xem.'); return; }
    const last = Number(localStorage.getItem('last_movie_request') || 0);
    if (Date.now() - last < 60_000) { flash('Bạn vừa gửi yêu cầu, vui lòng chờ 1 phút.'); return; }
    setSending(true);
    try {
      const now = Date.now();
      await addMovieRequest({ uid: currentUser.uid, username: profile.username, avatar: profile.avatar, title: title.slice(0, 100), note: reqNote.trim().slice(0, 200), status: 'pending', createdAt: now });
      if (cfg.chatEnabled) {
        await sendCommunityChatMessage({ uid: currentUser.uid, username: profile.username, avatar: profile.avatar, text: `🎬 Yêu cầu phim: ${title.slice(0, 100)}`, isAdmin: profile.role === 'admin', createdAt: now });
      }
      localStorage.setItem('last_movie_request', String(now));
      setReqTitle(''); setReqNote(''); flash('Đã gửi yêu cầu! Admin sẽ xử lý sớm.');
    } catch { flash('Gửi yêu cầu thất bại, thử lại sau.'); }
    finally { setSending(false); }
  };

  const loginPrompt = (
    <Link to="/auth" className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--primary-light)] hover:text-white py-2 transition-colors">
      <LogIn size={15} /> Đăng nhập để tham gia
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}>
          <MessageCircle size={20} className="text-slate-950" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-black text-white leading-tight">Chat cộng đồng</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Users size={12} /> Trò chuyện, nói chuyện bằng mic và yêu cầu phim</p>
        </div>
      </div>

      {cfg.notice && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs">
          <Pin size={14} className="shrink-0 mt-0.5" /> <span className="break-words">{cfg.notice}</span>
        </div>
      )}

      {/* Phòng thoại */}
      {cfg.micEnabled && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60">
          <Mic size={16} className={inVoice ? 'text-green-400' : 'text-slate-500'} />
          <span className="text-xs text-slate-300 font-semibold">
            Phòng thoại{inVoice ? ` · ${peers.length + 1} người` : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {inVoice ? (
              <>
                <button onClick={toggleMute} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${muted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {muted ? <MicOff size={14} /> : <Mic size={14} />} {muted ? 'Đang tắt mic' : 'Đang nói'}
                </button>
                <button onClick={leaveVoice} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"><PhoneOff size={14} /> Rời</button>
              </>
            ) : canPost ? (
              <button onClick={joinVoice} disabled={joining} className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-[var(--primary)] text-slate-950 disabled:opacity-60 flex items-center gap-1.5">
                <Mic size={14} /> {joining ? 'Đang vào...' : 'Bật mic tham gia'}
              </button>
            ) : <Link to="/auth" className="text-xs font-bold text-[var(--primary-light)]">Đăng nhập để dùng mic</Link>}
          </div>
        </div>
      )}

      {msg && <div className="mb-3 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200">{msg}</div>}

      {cfg.requestsEnabled && (
        <div className="flex gap-2 mb-3">
          {([['chat', 'Trò chuyện', MessageCircle], ['request', 'Yêu cầu phim', Clapperboard]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-1.5 ${tab === k ? 'bg-[var(--primary)]/15 border-[var(--primary)]/50 text-[var(--primary-light)]' : 'border-slate-800 text-slate-400 hover:text-white'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden h-[calc(100dvh-340px)] min-h-[380px]">
        {tab === 'chat' || !cfg.requestsEnabled ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              <span className="text-white font-bold text-sm">Đang trò chuyện</span>
              <span className="text-slate-500 text-xs ml-auto">{messages.length} tin nhắn</span>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
              {messages.length === 0 && <p className="text-slate-600 text-xs text-center mt-6">Chưa có tin nhắn nào. Hãy là người đầu tiên bắt chuyện!</p>}
              {messages.map(m => (
                <div key={m.id} className="flex items-start gap-2">
                  <img src={m.avatar} alt={m.username} loading="lazy" className="w-7 h-7 rounded-full bg-slate-700 shrink-0 object-cover" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${m.isAdmin ? 'text-amber-400' : 'text-[var(--primary-light)]'}`}>{m.username}</span>
                      {m.isAdmin && <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"><Shield size={8} /> ADMIN</span>}
                      <span className="text-[9px] text-slate-600">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-slate-200 leading-snug break-words">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2.5 border-t border-slate-800/60 shrink-0">
              {!cfg.chatEnabled ? <p className="text-center text-slate-500 text-xs py-2">Admin đang tạm tắt trò chuyện.</p>
                : !currentUser || !profile ? loginPrompt
                : profile.isBanned ? <p className="text-center text-red-400 text-xs py-2">Tài khoản của bạn đã bị khóa bình luận</p>
                : (
                  <div className="flex items-center gap-2">
                    <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !sending) handleSend(); }}
                      maxLength={300} placeholder="Nhắn gì đó..."
                      className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary)]/60 transition-colors" />
                    <button onClick={handleSend} disabled={sending || !text.trim()} aria-label="Gửi"
                      className="w-9 h-9 shrink-0 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-950"
                      style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}><Send size={15} /></button>
                  </div>
                )}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 border-b border-slate-800/60 shrink-0 flex flex-col gap-2">
              {!currentUser || !profile ? loginPrompt : profile.isBanned ? <p className="text-center text-red-400 text-xs py-2">Tài khoản của bạn đã bị khóa</p> : (
                <>
                  <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} maxLength={100} placeholder="Tên phim bạn muốn xem..."
                    className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary)]/60" />
                  <div className="flex gap-2">
                    <input value={reqNote} onChange={e => setReqNote(e.target.value)} maxLength={200} placeholder="Ghi chú (năm, phần, vietsub...) — không bắt buộc"
                      className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary)]/60" />
                    <button onClick={submitRequest} disabled={sending || !reqTitle.trim()} className="px-4 rounded-xl bg-[var(--primary)] text-slate-950 text-sm font-black disabled:opacity-50">Gửi</button>
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {requests.length === 0 && <p className="text-slate-600 text-xs text-center mt-6">Chưa có yêu cầu nào.</p>}
              {requests.map(r => (
                <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                  <img src={r.avatar} alt="" loading="lazy" className="w-7 h-7 rounded-full bg-slate-700 shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white break-words">{r.title}</p>
                    {r.note && <p className="text-xs text-slate-400 break-words">{r.note}</p>}
                    <p className="text-[10px] text-slate-600 mt-0.5">{r.username} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${(STATUS[r.status] || STATUS.pending).cls}`}>{(STATUS[r.status] || STATUS.pending).label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
