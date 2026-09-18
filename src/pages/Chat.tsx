import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, Shield, LogIn, MessageCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeCommunityChat, sendCommunityChatMessage, LiveChatMessage,
} from '../lib/livestream';
import { getCurrentUser, getUserProfile, onAuthChange, UserProfile } from '../lib/auth';
import { usePageTitle } from '../lib/utils';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function ChatPage() {
  usePageTitle('Chat cộng đồng');
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
    const unsub = subscribeCommunityChat(setMessages);
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
    try {
      await sendCommunityChatMessage({
        uid: currentUser.uid,
        username: profile.username,
        avatar: profile.avatar,
        text: trimmed,
        isAdmin: profile.role === 'admin',
        createdAt: Date.now(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  }, [currentUser, profile, text]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}
        >
          <MessageCircle size={20} className="text-slate-950" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-black text-white leading-tight">Chat cộng đồng</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Users size={12} /> Trò chuyện cùng mọi người trên AuraFlix — thời gian thực
          </p>
        </div>
      </div>

      {/* Chat box */}
      <div className="flex flex-col bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden h-[calc(100dvh-260px)] min-h-[420px]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
          <span className="text-white font-bold text-sm">Đang trò chuyện</span>
          <span className="text-slate-500 text-xs ml-auto">{messages.length} tin nhắn</span>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          {messages.length === 0 && (
            <p className="text-slate-600 text-xs text-center mt-6">Chưa có tin nhắn nào. Hãy là người đầu tiên bắt chuyện!</p>
          )}
          <AnimatePresence initial={false}>
            {messages.map(m => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <img src={m.avatar} alt={m.username} className="w-7 h-7 rounded-full bg-slate-700 shrink-0 object-cover" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-bold ${m.isAdmin ? 'text-amber-400' : 'text-[var(--primary-light)]'}`}>{m.username}</span>
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
                  className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary)]/60 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  className="w-9 h-9 shrink-0 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-950 transition-colors"
                  style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))' }}
                >
                  <Send size={15} />
                </button>
              </div>
            )
          ) : (
            <Link to="/auth" className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--primary-light)] hover:text-white py-2 transition-colors">
              <LogIn size={15} /> Đăng nhập để trò chuyện
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
