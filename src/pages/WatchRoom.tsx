import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, Send, Copy, Check, LogOut, Trash2, Crown,
  MessageCircle, ChevronLeft, Loader2, Link as LinkIcon, X, UserPlus,
  ListVideo, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeWatchRoom, subscribeRoomMessages, sendRoomMessage,
  joinWatchRoom, leaveWatchRoom, deleteWatchRoom, updateRoomEpisode,
  WatchRoom, RoomMember, RoomMessage,
} from '../lib/watchRoom';
import { movieApi } from '../services/api';
import { getCurrentUser, getUserProfile, onAuthChange } from '../lib/auth';
import type { UserProfile } from '../lib/auth';
import { cn } from '../lib/utils';
import SyncPlayer from '../components/SyncPlayer';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return `${Math.floor(diff / 3600)} giờ trước`;
}

export default function WatchRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<WatchRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Episode panel
  const [episodes, setEpisodes] = useState<{ server_name: string; server_data: { slug: string; name: string; link_embed: string; link_m3u8: string }[] }[]>([]);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [switchingEp, setSwitchingEp] = useState(false);

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasJoined = useRef(false);
  // Ref luôn giữ room mới nhất → tránh stale closure trong cleanup
  const roomRef = useRef<WatchRoom | null>(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setCurrentUser(u);
      if (u) { const p = await getUserProfile(u.uid); setProfile(p); }
      else setProfile(null);
    });
    return unsub;
  }, []);

  // Subscribe room
  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeWatchRoom(roomId, (r) => {
      setRoom(r);
      roomRef.current = r;
      setLoading(false);
    });
    return unsub;
  }, [roomId]);

  // Join once + lưu phòng vào localStorage để vào lại sau
  useEffect(() => {
    if (!room || !currentUser || !profile || !roomId || hasJoined.current) return;
    const alreadyMember = room.members.some(m => m.uid === currentUser.uid);
    if (alreadyMember) {
      hasJoined.current = true;
      // Cập nhật lại info phòng đã lưu (tập mới, v.v.)
      localStorage.setItem('lastWatchRoom', JSON.stringify({
        roomId,
        movieName: room.movieName,
        movieSlug: room.movieSlug,
        episodeName: room.episodeName,
        thumb: room.movieThumb || '',
        savedAt: Date.now(),
      }));
      return;
    }
    if (!room.isActive) return;
    hasJoined.current = true;
    setJoining(true);
    joinWatchRoom(roomId, {
      uid: currentUser.uid,
      username: profile.username,
      avatar: profile.avatar,
      joinedAt: Date.now(),
    }).then(res => {
      setJoining(false);
      if (!res.ok) {
        setJoinError(res.error || 'Không thể vào phòng');
      } else {
        // Lưu phòng để vào lại sau
        localStorage.setItem('lastWatchRoom', JSON.stringify({
          roomId,
          movieName: room.movieName,
          movieSlug: room.movieSlug,
          episodeName: room.episodeName,
          thumb: room.movieThumb || '',
          savedAt: Date.now(),
        }));
      }
    });
  }, [room?.id, currentUser?.uid, profile?.username]);

  // Fetch episodes for host episode switching
  useEffect(() => {
    if (!room?.movieSlug) return;
    movieApi.getMovieDetail(room.movieSlug).then(res => {
      if (res.episodes && res.episodes.length > 0) {
        setEpisodes(res.episodes as any);
      }
    }).catch(() => {});
  }, [room?.movieSlug]);

  // Messages
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoomMessages(roomId, setMessages);
  }, [roomId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Leave on unmount (guest only) — dùng roomRef để tránh stale closure
  useEffect(() => {
    return () => {
      const r = roomRef.current;
      const u = currentUser;
      if (roomId && u && r && r.hostUid !== u.uid) {
        leaveWatchRoom(roomId, u.uid);
      }
    };
    // eslint-disable-next-line
  }, [roomId, currentUser?.uid]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !currentUser || !profile || !roomId) return;
    setSendingMsg(true);
    try {
      await sendRoomMessage(roomId, {
        uid: currentUser.uid,
        username: profile.username,
        avatar: profile.avatar,
        text: text.trim(),
        createdAt: Date.now(),
      });
      setText('');
    } finally {
      setSendingMsg(false);
    }
  }, [text, currentUser, profile, roomId]);

  const handleSwitchEpisode = async (ep: { slug: string; name: string; link_embed: string; link_m3u8: string }) => {
    if (!roomId || !isHost) return;
    setSwitchingEp(true);
    try {
      const server = episodes[activeServerIdx] || episodes[0];
      await updateRoomEpisode(roomId, {
        episodeSlug: ep.slug,
        episodeName: ep.name,
        embedUrl: ep.link_embed,
        m3u8Url: ep.link_m3u8 || '',
        serverName: server?.server_name || '',
      });
      setShowEpisodePanel(false);
    } finally {
      setSwitchingEp(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/watch-room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (!roomId || !currentUser) return;
    localStorage.removeItem('lastWatchRoom');
    await leaveWatchRoom(roomId, currentUser.uid);
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!roomId) return;
    localStorage.removeItem('lastWatchRoom');
    await deleteWatchRoom(roomId);
    navigate(-1);
  };

  // ── States ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-sky-400" size={36} />
          <p className="text-slate-400 text-sm">Đang tải phòng xem...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-[#181818] rounded-2xl p-8 max-w-sm w-full border border-white/5">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Phòng không tồn tại</h2>
          <p className="text-slate-400 text-sm mb-6">Phòng đã bị xóa hoặc link không hợp lệ.</p>
          <button onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition-colors">
            Về trang chủ
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentUser || !profile) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-[#181818] rounded-2xl p-8 max-w-sm w-full border border-white/5">
          <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} className="text-sky-400" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Đăng nhập để vào phòng</h2>
          <p className="text-slate-400 text-sm mb-2">
            <span className="text-white font-semibold">{room.hostName}</span> mời bạn xem phim cùng
          </p>
          <p className="text-sky-400 text-sm font-medium mb-6">🎬 {room.movieName}</p>
          <Link to="/auth"
            className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition-colors flex items-center justify-center gap-2">
            Đăng nhập ngay
          </Link>
        </motion.div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-[#181818] rounded-2xl p-8 max-w-sm w-full border border-white/5">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-yellow-400" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Không thể vào phòng</h2>
          <p className="text-slate-400 text-sm mb-6">{joinError}</p>
          <button onClick={() => navigate(-1)}
            className="w-full py-2.5 rounded-xl bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 transition-colors">
            Quay lại
          </button>
        </motion.div>
      </div>
    );
  }

  const isHost = currentUser.uid === room.hostUid;
  const memberCount = room.members.length;
  const roomUrl = `${window.location.origin}/watch-room/${roomId}`;
  const canSync = !!room.m3u8Url;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0">
            <ChevronLeft size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm line-clamp-1">{room.movieName}</p>
              {canSync && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                  SYNC
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs">
              Tập {room.episodeName} •{' '}
              <span className="text-sky-400 font-medium">{memberCount}/{room.maxMembers} người</span>
            </p>
          </div>

          {/* Avatars */}
          <div className="flex -space-x-1.5 shrink-0">
            {room.members.map(m => (
              <img key={m.uid} src={m.avatar} alt={m.username} title={m.username}
                className="w-7 h-7 rounded-full border-2 border-[#0a0a0a] object-cover" />
            ))}
            {Array.from({ length: room.maxMembers - memberCount }).map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-dashed border-slate-700 bg-[#1a1a1a] flex items-center justify-center">
                <span className="text-slate-600 text-[9px]">?</span>
              </div>
            ))}
          </div>

          <button onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0',
              copied
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                : 'bg-[#2a2a2a] border-slate-700 text-slate-300 hover:text-white'
            )}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Đã copy!' : 'Link'}
          </button>
        </div>
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">

        {/* ── Player side ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">

          {/* SyncPlayer or iframe */}
          <SyncPlayer
            roomId={roomId!}
            m3u8Url={room.m3u8Url}
            embedUrl={room.embedUrl}
            isHost={isHost}
            sync={room.sync}
            hostName={room.hostName}
          />

          {/* Info + action row */}
          <div className="bg-[#141414] border-b border-white/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-white font-bold text-sm line-clamp-1">{room.movieName}</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Tập {room.episodeName} • {room.serverName}
                  {canSync
                    ? <span className="ml-1.5 text-sky-400">• 🟢 Đồng bộ realtime</span>
                    : <span className="ml-1.5 text-yellow-400">• ⚠️ Iframe - không sync được</span>
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Episode selector button - host only */}
                {isHost && episodes.length > 0 && (episodes[activeServerIdx]?.server_data?.length ?? 0) > 1 && (
                  <button onClick={() => setShowEpisodePanel(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                      showEpisodePanel
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-[#2a2a2a] border-slate-700 text-slate-300 hover:text-white'
                    )}>
                    <ListVideo size={14} />
                    Chọn tập
                    {showEpisodePanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <button onClick={() => setShowChat(v => !v)}
                  className={cn(
                    'lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    showChat ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-[#2a2a2a] border-slate-700 text-slate-400'
                  )}>
                  <MessageCircle size={14} />
                  Chat
                </button>
                {isHost ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                    <Trash2 size={14} />
                    Xóa phòng
                  </button>
                ) : (
                  <button onClick={handleLeave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 bg-[#2a2a2a] text-slate-400 hover:text-white transition-all">
                    <LogOut size={14} />
                    Rời phòng
                  </button>
                )}
              </div>
            </div>

            {/* Episode panel (host only) */}
            <AnimatePresence>
              {showEpisodePanel && isHost && episodes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 bg-[#0d0d0d] rounded-xl border border-blue-500/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ListVideo size={13} className="text-blue-400" />
                      <span className="text-blue-300 text-xs font-bold">Chọn tập để đổi cho cả phòng</span>
                      {switchingEp && <RefreshCw size={11} className="text-slate-400 animate-spin ml-auto" />}
                    </div>

                    {/* Server tabs */}
                    {episodes.length > 1 && (
                      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                        {episodes.map((sv, idx) => (
                          <button key={idx} onClick={() => setActiveServerIdx(idx)}
                            className={cn(
                              'shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all',
                              activeServerIdx === idx
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                : 'bg-[#1e1e1e] border-transparent text-slate-500 hover:text-slate-300'
                            )}>
                            {sv.server_name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Episode grid */}
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                      {(episodes[activeServerIdx]?.server_data || []).map(ep => {
                        const isCurrent = ep.slug === room.episodeSlug;
                        return (
                          <button key={ep.slug}
                            onClick={() => !isCurrent && !switchingEp && handleSwitchEpisode(ep)}
                            disabled={isCurrent || switchingEp}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all',
                              isCurrent
                                ? 'bg-blue-500/30 border-blue-500 text-blue-300 cursor-default'
                                : 'bg-[#1e1e1e] border-slate-700 text-slate-400 hover:border-blue-500/60 hover:text-white disabled:opacity-40'
                            )}>
                            {/^tập\s/i.test(ep.name) ? ep.name : `Tập ${ep.name}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invite banner */}
            {memberCount < room.maxMembers && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2.5">
                <LinkIcon size={14} className="text-sky-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sky-300 text-xs font-semibold">Chia sẻ link để mời bạn bè!</p>
                  <p className="text-slate-500 text-[10px] truncate mt-0.5">{roomUrl}</p>
                </div>
                <button onClick={handleCopyLink}
                  className={cn(
                    'shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    copied ? 'bg-sky-500 text-white' : 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333]'
                  )}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </motion.div>
            )}
          </div>

          {/* Members (desktop) */}
          <div className="hidden lg:block bg-[#141414] px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Users size={13} className="text-slate-400" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Thành viên ({memberCount}/{room.maxMembers})
              </span>
              {isHost && (
                <span className="ml-auto text-[10px] text-slate-600">
                  Chỉ bạn mới điều khiển được player
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {room.members.map(m => (
                <div key={m.uid} className="flex items-center gap-2 bg-[#1e1e1e] rounded-lg px-2.5 py-1.5 border border-white/5">
                  <img src={m.avatar} alt={m.username} className="w-6 h-6 rounded-full" />
                  <span className="text-white text-xs font-medium">{m.username}</span>
                  {m.uid === room.hostUid && <Crown size={11} className="text-yellow-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Chat panel ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {(showChat) && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:w-80 xl:w-96 flex flex-col bg-[#141414] border-l border-white/5"
              style={{ height: 'calc(100vh - 116px)', minHeight: 300 }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
                <MessageCircle size={15} className="text-sky-400" />
                <span className="text-white font-bold text-sm">Trò chuyện</span>
                <span className="ml-auto text-slate-500 text-xs">{messages.length} tin nhắn</span>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 min-h-0"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <MessageCircle size={32} className="text-slate-700" />
                    <p className="text-slate-600 text-xs">Chưa có tin nhắn.<br />Hãy bắt đầu trò chuyện!</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.uid === currentUser?.uid;
                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-2 max-w-full', isMe ? 'flex-row-reverse' : 'flex-row')}>
                      <img src={msg.avatar} alt={msg.username}
                        className="w-7 h-7 rounded-full shrink-0 self-end object-cover" />
                      <div className={cn('flex flex-col gap-0.5 max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                        {!isMe && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-medium">{msg.username}</span>
                            {msg.uid === room.hostUid && <Crown size={9} className="text-yellow-400" />}
                          </div>
                        )}
                        <div className={cn(
                          'px-3 py-2 rounded-2xl text-xs leading-relaxed break-words',
                          isMe
                            ? 'bg-sky-500 text-white rounded-tr-sm'
                            : 'bg-[#2a2a2a] text-slate-200 rounded-tl-sm border border-white/5'
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-600">{timeAgo(msg.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="px-3 py-3 border-t border-white/5 shrink-0">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Nhập tin nhắn..."
                    rows={1}
                    className="flex-1 bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 resize-none outline-none focus:border-sky-500/50 transition-colors"
                    style={{ maxHeight: 80 }}
                  />
                  <button onClick={handleSend} disabled={!text.trim() || sendingMsg}
                    className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white disabled:opacity-40 hover:bg-sky-600 transition-colors shrink-0">
                    {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p className="text-slate-700 text-[10px] mt-1.5 text-center">Enter để gửi • Shift+Enter xuống dòng</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Confirm delete ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1e1e1e] rounded-2xl p-6 max-w-sm w-full border border-white/10">
              <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-white font-bold text-base text-center mb-2">Xóa phòng xem?</h3>
              <p className="text-slate-400 text-sm text-center mb-5">
                Phòng sẽ bị xóa vĩnh viễn, tất cả thành viên sẽ bị đá ra.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] text-slate-300 font-bold text-sm hover:bg-[#333] transition-colors">
                  Hủy
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                  Xóa phòng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
