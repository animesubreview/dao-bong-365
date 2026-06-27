import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Trash2, Heart, LogIn, Shield, CornerDownRight, X, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getComments, addComment, deleteComment, toggleLike } from '../lib/comments';
import { getCurrentUser, getUserProfile, onAuthChange } from '../lib/auth';
import type { Comment } from '../types';
import type { UserProfile } from '../lib/auth';

interface Props {
  movieSlug: string;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

/** Badge role */
function RoleBadge({ role, isAdminReply }: { role?: string; isAdminReply?: boolean }) {
  if (role === 'admin' || isAdminReply) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full
        bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/40
        border border-amber-400/40">
        <Shield size={9} className="fill-current" />
        ADMIN
      </span>
    );
  }
  return null;
}

interface ReplyState {
  parentId: string;
  replyToUsername: string;
}

export default function CommentSection({ movieSlug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setCurrentUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getComments(movieSlug);
    setComments(data);
    setLoading(false);
  }, [movieSlug]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!currentUser || !profile) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) { setError('Bình luận tối đa 500 ký tự'); return; }
    if (profile.isBanned) { setError('Tài khoản bị khóa, không thể bình luận'); return; }
    setError('');
    setSubmitting(true);
    const newComment = await addComment(movieSlug, currentUser.uid, profile.username, profile.avatar, trimmed);
    if (newComment) {
      setComments(prev => [newComment, ...prev]);
      setText('');
    } else {
      setError('Gửi bình luận thất bại, thử lại');
    }
    setSubmitting(false);
  };

  const handleReplySubmit = async () => {
    if (!currentUser || !profile || !replyTo) return;
    const trimmed = replyText.trim();
    if (!trimmed || trimmed.length > 500) return;
    if (profile.isBanned) return;
    setReplySubmitting(true);
    const newComment = await addComment(
      movieSlug,
      currentUser.uid,
      profile.username,
      profile.avatar,
      trimmed,
      {
        parentId: replyTo.parentId,
        replyToUsername: replyTo.replyToUsername,
        // Chỉ đánh dấu admin nếu thật sự là admin
        isAdminReply: profile.role === 'admin',
      }
    );
    if (newComment) {
      setComments(prev => [...prev, newComment]);
      setReplyText('');
      setReplyTo(null);
    }
    setReplySubmitting(false);
  };

  const handleDelete = async (c: Comment) => {
    if (!currentUser) return;
    const isOwner = c.uid === currentUser.uid;
    const isAdmin = profile?.role === 'admin';
    if (!isOwner && !isAdmin) return;
    await deleteComment(c.id);
    setComments(prev => prev.filter(x => x.id !== c.id && x.parentId !== c.id));
  };

  const handleLike = async (c: Comment) => {
    if (!currentUser) return;
    const liked = c.likes.includes(currentUser.uid);
    await toggleLike(c.id, currentUser.uid, liked);
    setComments(prev =>
      prev.map(x =>
        x.id === c.id
          ? { ...x, likes: liked ? x.likes.filter(id => id !== currentUser.uid) : [...x.likes, currentUser.uid] }
          : x
      )
    );
  };

  const openReply = (c: Comment) => {
    setReplyTo({ parentId: c.id, replyToUsername: c.username });
    setReplyText('');
    // Scroll và focus vào input sau khi render
    setTimeout(() => replyInputRef.current?.focus(), 80);
  };

  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  // ── CommentCard ──────────────────────────────────────────────────────────────
  const CommentCard = ({ c, isReply = false }: { c: Comment; isReply?: boolean }) => {
    const isOwner = currentUser?.uid === c.uid;
    const isAdminUser = profile?.role === 'admin';
    const liked = currentUser ? c.likes.includes(currentUser.uid) : false;
    const isAdminComment = !!c.isAdminReply;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`flex gap-3 rounded-2xl p-4 ${
          isAdminComment
            ? 'bg-gradient-to-r from-amber-500/8 to-orange-500/5 border border-amber-500/25 shadow-sm shadow-amber-500/10'
            : isReply
            ? 'bg-slate-900/30 border border-slate-800/30'
            : 'bg-slate-900/50 border border-slate-800/40'
        }`}
      >
        <div className="relative shrink-0">
          <img src={c.avatar} alt={c.username} className="w-9 h-9 rounded-full bg-slate-700" />
          {isAdminComment && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow">
              <Shield size={9} className="text-white fill-current" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${isAdminComment ? 'text-amber-300' : 'text-white'}`}>
                {c.username}
              </span>
              {isAdminComment && <RoleBadge isAdminReply />}
              <span className="text-[10px] text-slate-500">{timeAgo(c.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Like */}
              <button
                onClick={() => handleLike(c)}
                disabled={!currentUser}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all ${
                  liked ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                } disabled:cursor-default`}
              >
                <Heart size={12} className={liked ? 'fill-current' : ''} />
                {c.likes.length > 0 && c.likes.length}
              </button>

              {/* Nút Trả lời — hiện cho TẤT CẢ user đã đăng nhập, kể cả trên reply */}
              {currentUser && profile && !profile.isBanned && (
                <button
                  onClick={() => openReply(c)}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all"
                >
                  <CornerDownRight size={12} />
                  Trả lời
                </button>
              )}

              {/* Xóa — chủ bình luận hoặc admin */}
              {(isOwner || isAdminUser) && (
                <button
                  onClick={() => handleDelete(c)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Xóa bình luận"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
            {c.replyToUsername && (
              <span className="text-green-400 font-bold mr-1">@{c.replyToUsername}</span>
            )}
            {c.content}
          </p>
        </div>
      </motion.div>
    );
  };

  // ── Reply Input Box ──────────────────────────────────────────────────────────
  const ReplyInputBox = ({ parentId }: { parentId: string }) => {
    if (!replyTo || replyTo.parentId !== parentId || !currentUser || !profile) return null;

    const isAdmin = profile.role === 'admin';

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="ml-6 pl-4 border-l-2 border-green-500/40"
      >
        <div className={`rounded-2xl p-3 ${
          isAdmin
            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30'
            : 'bg-slate-900/60 border border-slate-800/50'
        }`}>
          <div className="flex gap-2 items-start">
            <img src={profile.avatar} alt={profile.username} className="w-8 h-8 rounded-full shrink-0 bg-slate-700" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${isAdmin ? 'text-amber-300' : 'text-white'}`}>
                    {profile.username}
                  </span>
                  <RoleBadge role={profile.role} />
                  <span className="text-[10px] text-slate-500">
                    → <span className="text-green-400 font-bold">@{replyTo.replyToUsername}</span>
                  </span>
                </div>
                <button
                  onClick={() => { setReplyTo(null); setReplyText(''); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                ref={replyInputRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplySubmit(); }
                  if (e.key === 'Escape') { setReplyTo(null); setReplyText(''); }
                }}
                placeholder={`Trả lời @${replyTo.replyToUsername}...`}
                rows={2}
                maxLength={500}
                className={`w-full bg-slate-800/60 border rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 resize-none transition-all ${
                  isAdmin
                    ? 'border-amber-500/30 focus:ring-amber-500/30 focus:border-amber-500/40'
                    : 'border-slate-700/50 focus:ring-green-500/40 focus:border-green-500/30'
                }`}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600">{replyText.length}/500 · Esc để huỷ</span>
                <button
                  onClick={handleReplySubmit}
                  disabled={replySubmitting || !replyText.trim()}
                  className={`flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs px-4 py-1.5 rounded-full transition-all active:scale-95 ${
                    isAdmin
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400'
                      : 'bg-green-500 hover:bg-green-400 text-slate-950'
                  }`}
                >
                  <Send size={12} />
                  {replySubmitting ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mt-8 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1 h-5 bg-green-500 rounded-full shrink-0" />
        <MessageCircle size={18} className="text-green-400" />
        <h3 className="text-base font-black text-white">
          Bình luận <span className="text-slate-500 font-bold text-sm">({comments.length})</span>
        </h3>
      </div>

      {/* Input bình luận mới */}
      {currentUser && profile ? (
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-4 mb-5">
          <div className="flex gap-3">
            <img src={profile.avatar} alt={profile.username} className="w-9 h-9 rounded-full shrink-0 bg-slate-700" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{profile.username}</span>
                <RoleBadge role={profile.role} />
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Nhập bình luận... (Enter để gửi)"
                rows={3}
                maxLength={500}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/30 resize-none transition-all"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600">{text.length}/500</span>
                <div className="flex items-center gap-2">
                  {error && <span className="text-xs text-red-400">{error}</span>}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !text.trim()}
                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs px-4 py-2 rounded-full transition-all active:scale-95"
                  >
                    <Send size={13} />
                    {submitting ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-5 mb-5 text-center">
          <LogIn size={24} className="text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-3">Đăng nhập để tham gia bình luận</p>
          <Link
            to="/auth"
            state={{ tab: 'login' }}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-slate-950 font-black text-sm px-5 py-2 rounded-full transition-all"
          >
            <LogIn size={14} /> Đăng nhập
          </Link>
        </div>
      )}

      {/* Danh sách bình luận */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-10 text-slate-600">
          <MessageCircle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-3">
            {topLevel.map(c => {
              const replies = getReplies(c.id);
              return (
                <div key={c.id} className="flex flex-col gap-2">
                  <CommentCard c={c} />

                  {/* Replies thread */}
                  {replies.length > 0 && (
                    <div className="ml-6 flex flex-col gap-2 border-l-2 border-slate-800/60 pl-4">
                      {replies.map(r => <CommentCard key={r.id} c={r} isReply />)}
                    </div>
                  )}

                  {/* Reply input */}
                  <AnimatePresence>
                    <ReplyInputBox parentId={c.id} />
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
