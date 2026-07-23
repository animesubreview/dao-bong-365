import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, Send, Shield, LogIn, Play, Pause, Volume2, VolumeX, Maximize, Lock,
  Eye, ClipboardCheck, Hourglass, XCircle, CalendarClock, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeLiveConfig, subscribeLiveChat, sendLiveChatMessage, LiveConfig,
  LiveChatMessage, buildLiveEmbed, postYouTubeCommand, DEFAULT_LIVE_CONFIG,
  subscribeMyRegistration, requestRoomAccess, RoomRegistration,
  startRoomPresence, subscribeRoomViewerCount,
} from '../lib/livestream';
import { getCurrentUser, getUserProfile, onAuthChange, UserProfile } from '../lib/auth';
import { usePageTitle } from '../lib/utils';
import { useRoomWatchGuard, RoomWatchGuardOverlay } from '../components/RoomWatchGuard';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return `${Math.floor(diff / 3600)} giờ trước`;
}

// ── Player chặn tua (chỉ dùng link nhúng, không cho kéo thanh tua) ───────────
function LivePlayer({ embedUrl, title, viewerCount }: { embedUrl: string; title: string; viewerCount: number }) {
  const { url, kind } = buildLiveEmbed(embedUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const { showWarning, dismiss } = useRoomWatchGuard(!!url);

  const togglePlay = () => {
    postYouTubeCommand(iframeRef.current, playing ? 'pauseVideo' : 'playVideo');
    setPlaying(p => !p);
  };
  const toggleMute = () => {
    postYouTubeCommand(iframeRef.current, muted ? 'unMute' : 'mute');
    setMuted(m => !m);
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapperRef.current?.requestFullscreen?.().catch(() => {});
  };

  if (!url) {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl flex items-center justify-center">
        <p className="text-slate-500 text-sm">Chưa có link phát trực tiếp</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      onContextMenu={e => e.preventDefault()}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none"
    >
      <iframe
        ref={iframeRef}
        src={url}
        className="absolute inset-0 w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={kind !== 'youtube'}
        title={title || 'Livestream'}
        referrerPolicy="no-referrer"
      />

      {/* LIVE badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg z-20 pointer-events-none">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        TRỰC TIẾP
      </div>

      {/* Số người đang xem */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20 pointer-events-none">
        <Eye size={12} /> {viewerCount} đang xem
      </div>

      <RoomWatchGuardOverlay show={showWarning} onDismiss={dismiss} />

      {kind === 'youtube' ? (
        /* Custom control bar cho YouTube — chặn tua hoàn toàn, không có thanh seek */
        <div className="absolute inset-0 z-10">
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
            aria-label={playing ? 'Tạm dừng' : 'Phát'}
          >
            <span className={`w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${!playing ? 'opacity-100' : ''}`}>
              {playing ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" />}
            </span>
          </button>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>
              <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span className="flex items-center gap-1 text-[10px] text-slate-300 font-semibold bg-black/40 px-2 py-1 rounded-full">
                <Lock size={9} /> Không thể tua
              </span>
            </div>
            <button onClick={toggleFullscreen} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <Maximize size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Link nhúng dạng khác (abyssplayer, facebook, twitch...) — không sửa được
           player bên trong iframe (khác domain) nên chặn tua bằng lớp phủ trong suốt
           đè lên vùng thanh tua (thường nằm ở đáy player), chặn mọi click/kéo vào đó. */
        <>
          <div className="absolute bottom-0 left-0 right-0 h-12 md:h-14 z-20 cursor-not-allowed" title="Đã khóa tua video" />
          <div className="absolute inset-x-0 bottom-0 h-12 md:h-14 z-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none flex items-end justify-center pb-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-300 font-semibold bg-black/50 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock size={9} /> Không thể tua
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat realtime ─────────────────────────────────────────────────────────────
function LiveChatBox() {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setCurrentUser(u);
      setProfile(u ? await getUserProfile(u.uid) : null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeLiveChat(setMessages);
    return unsub;
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!currentUser || !profile) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 300 || profile.isBanned) return;
    setSending(true);
    await sendLiveChatMessage({
      uid: currentUser.uid,
      username: profile.username,
      avatar: profile.avatar,
      text: trimmed,
      isAdmin: profile.role === 'admin',
      createdAt: Date.now(),
    });
    setText('');
    setSending(false);
  }, [currentUser, profile, text]);

  return (
    <div className="flex flex-col bg-[#141414] border border-slate-800/60 rounded-2xl overflow-hidden h-[420px] lg:h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-white font-bold text-sm">Chat trực tiếp</span>
        <span className="text-slate-500 text-xs ml-auto">{messages.length} tin nhắn</span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-6">Chưa có tin nhắn nào. Hãy là người đầu tiên bình luận!</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2"
            >
              <img src={m.avatar} alt={m.username} className="w-7 h-7 rounded-full bg-slate-700 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-bold ${m.isAdmin ? 'text-amber-400' : 'text-green-400'}`}>{m.username}</span>
                  {m.isAdmin && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Shield size={8} /> ADMIN
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="text-[13px] text-slate-200 leading-snug break-words">{m.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-2.5 border-t border-slate-800/60 shrink-0">
        {currentUser && profile ? (
          profile.isBanned ? (
            <p className="text-center text-red-400 text-xs py-2">Tài khoản của bạn đã bị khóa bình luận</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !sending) handleSend(); }}
                maxLength={300}
                placeholder="Nhắn gì đó..."
                className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/60 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="w-9 h-9 shrink-0 rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-950 transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          )
        ) : (
          <Link to="/auth" className="flex items-center justify-center gap-2 text-sm font-bold text-green-400 hover:text-green-300 py-2 transition-colors">
            <LogIn size={15} /> Đăng nhập để trò chuyện
          </Link>
        )}
      </div>
    </div>
  );
}

function formatSchedule(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function useCountdown(target: number) {
  const [left, setLeft] = useState(() => target - Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return Math.max(0, left);
}

// ── Màn hình chờ tới giờ chiếu ────────────────────────────────────────────────
function ScheduleGate({ scheduledAt }: { scheduledAt: number }) {
  const left = useCountdown(scheduledAt);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <div className="w-full aspect-video bg-black rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
      <CalendarClock size={32} className="text-green-400" />
      <p className="text-white font-bold">Buổi chiếu sẽ bắt đầu lúc {formatSchedule(scheduledAt)}</p>
      <p className="text-2xl font-black text-green-400 tabular-nums">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </p>
      <p className="text-slate-500 text-xs">Trang sẽ tự mở khi tới giờ, không cần tải lại</p>
    </div>
  );
}

// ── Màn hình đăng ký / chờ admin duyệt vào phòng chiếu ────────────────────────
function ApprovalGate({
  currentUser, profile, registration, onRequest, requesting,
}: {
  currentUser: ReturnType<typeof getCurrentUser>;
  profile: UserProfile | null;
  registration: RoomRegistration | null;
  onRequest: () => void;
  requesting: boolean;
}) {
  if (!currentUser || !profile) {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
        <Lock size={30} className="text-slate-500" />
        <p className="text-white font-bold">Phòng chiếu này yêu cầu đăng nhập & đăng ký</p>
        <Link to="/auth" className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-full transition-colors">
          <LogIn size={15} /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (!registration || registration.status === 'rejected') {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
        {registration?.status === 'rejected' ? (
          <>
            <XCircle size={30} className="text-red-400" />
            <p className="text-white font-bold">Yêu cầu vào phòng chiếu trước đó đã bị từ chối</p>
            <p className="text-slate-500 text-xs">Bạn có thể gửi lại yêu cầu để admin xem xét lại</p>
          </>
        ) : (
          <>
            <ClipboardCheck size={30} className="text-green-400" />
            <p className="text-white font-bold">Phòng chiếu yêu cầu đăng ký & được admin duyệt</p>
            <p className="text-slate-500 text-xs max-w-xs">Nhấn nút bên dưới để gửi yêu cầu, admin duyệt xong bạn sẽ vào xem được ngay</p>
          </>
        )}
        <button
          onClick={onRequest}
          disabled={requesting}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
        >
          <ClipboardCheck size={15} /> {requesting ? 'Đang gửi...' : registration?.status === 'rejected' ? 'Gửi lại yêu cầu' : 'Đăng ký xem'}
        </button>
      </div>
    );
  }

  if (registration.status === 'pending') {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
        <Hourglass size={30} className="text-amber-400 animate-pulse" />
        <p className="text-white font-bold">Yêu cầu của bạn đang chờ admin duyệt</p>
        <p className="text-slate-500 text-xs">Trang sẽ tự chuyển sang xem phim ngay khi được duyệt</p>
      </div>
    );
  }

  return null; // approved → LivePlayer sẽ hiển thị bên ngoài
}

// ── Trang chính ────────────────────────────────────────────────────────────────
export default function LiveStreamPage() {
  const [config, setConfig] = useState<LiveConfig>(DEFAULT_LIVE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [registration, setRegistration] = useState<RoomRegistration | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showApprovedToast, setShowApprovedToast] = useState(false);
  const prevRegStatusRef = useRef<string | null>(null);

  usePageTitle('Phát trực tiếp');

  useEffect(() => {
    const unsub = subscribeLiveConfig(cfg => { setConfig(cfg); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setCurrentUser(u);
      setProfile(u ? await getUserProfile(u.uid) : null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) { setRegistration(null); return; }
    const unsub = subscribeMyRegistration(currentUser.uid, setRegistration);
    return unsub;
  }, [currentUser]);

  // Vừa được admin duyệt (chuyển từ chưa duyệt/pending sang approved) → hiện thông báo xác nhận
  useEffect(() => {
    const prev = prevRegStatusRef.current;
    const cur = registration?.status ?? null;
    prevRegStatusRef.current = cur;
    if (cur === 'approved' && prev !== 'approved' && prev !== null) {
      setShowApprovedToast(true);
      const t = setTimeout(() => setShowApprovedToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, [registration?.status]);

  // Đếm ngược tới giờ chiếu — tick mỗi giây để tự mở phòng đúng lúc
  useEffect(() => {
    if (!config.scheduledAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [config.scheduledAt]);

  const isScheduledYet = config.scheduledAt > 0 && config.scheduledAt > now;
  const isApproved = !config.requireApproval || registration?.status === 'approved';
  const canWatch = config.enabled && !isScheduledYet && isApproved;

  // Bật đếm số người xem chỉ khi thực sự đang xem được phòng chiếu
  useEffect(() => {
    if (!canWatch || !currentUser) return;
    const stop = startRoomPresence(currentUser.uid);
    return stop;
  }, [canWatch, currentUser]);

  useEffect(() => {
    const unsub = subscribeRoomViewerCount(setViewerCount);
    return unsub;
  }, []);

  const handleRequest = async () => {
    if (!currentUser || !profile) return;
    setRequesting(true);
    await requestRoomAccess(currentUser.uid, profile.username, profile.avatar);
    setRequesting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center">
          <Radio size={34} className="text-slate-600" />
        </div>
        <h2 className="text-xl font-black text-white">Hiện chưa có livestream nào</h2>
        <p className="text-slate-400 text-sm max-w-sm">Admin sẽ sớm phát trực tiếp, hãy quay lại sau nhé!</p>
        <Link to="/" className="text-green-400 font-bold text-sm mt-2">← Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-5">
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <h1 className="text-xl md:text-2xl font-black text-white">Phát Trực Tiếp</h1>
        {config.requireApproval && (
          registration?.status === 'approved' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={9} /> Bạn đã được duyệt
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
              <Lock size={9} /> Phòng riêng — cần duyệt
            </span>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[520px]">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <AnimatePresence>
            {showApprovedToast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold rounded-xl px-4 py-3"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                Bạn đã được duyệt vào phòng chiếu!
              </motion.div>
            )}
          </AnimatePresence>
          {isScheduledYet && <ScheduleGate scheduledAt={config.scheduledAt} />}
          {config.requireApproval && !isApproved && (
            <ApprovalGate
              currentUser={currentUser}
              profile={profile}
              registration={registration}
              onRequest={handleRequest}
              requesting={requesting}
            />
          )}
          {!isScheduledYet && isApproved && (
            <LivePlayer embedUrl={config.embedUrl} title={config.title} viewerCount={viewerCount} />
          )}
          <div className="bg-[#141414] border border-slate-800/60 rounded-2xl p-4">
            <h2 className="text-white font-bold text-base">{config.title || 'Đang phát trực tiếp'}</h2>
            {config.description && <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{config.description}</p>}
          </div>
        </div>
        <LiveChatBox />
      </div>
    </div>
  );
}
