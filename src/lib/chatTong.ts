// ─── Kênh Chat Tổng (popup chat nổi toàn site) ────────────────────────────────
// Dùng chung dữ liệu với trang /chat (community_chat/global/messages) nên tin nhắn hai nơi đồng bộ.
// Thiết kế tiết kiệm Supabase: chỉ mở realtime khi khung chat đang mở, tin mới được GHÉP THẲNG từ
// payload realtime (không tải lại cả danh sách), còn số online chỉ là truy vấn đếm rất nhẹ.
import { collection, doc, getDocs, query, orderBy, limit, addDoc, deleteDoc } from './firestore-compat';
import { db } from './firebase';
import { supabase } from './supabase';
import { getCurrentUser, getUserProfile } from './auth';

const PATH = 'community_chat/global/messages';
const MAX_LOAD = 60;      // số tin nhắn gần nhất khi mở khung
const MAX_KEEP = 150;     // giữ tối đa trong bộ nhớ

export interface ChatReply { id: string; username: string; text: string }
export interface ChatActivity { movieName: string; episodeName?: string; link: string; thumb?: string }
export interface ChatTongMessage {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  text: string;
  isAdmin?: boolean;
  createdAt: number;
  kind?: 'text' | 'activity';
  replyTo?: ChatReply;
  activity?: ChatActivity;
}

const colRef = () => collection(db, 'community_chat', 'global', 'messages');

/** Tải các tin gần nhất (cũ → mới) */
export async function loadRecentMessages(): Promise<ChatTongMessage[]> {
  const snap = await getDocs(query(colRef(), orderBy('createdAt', 'desc'), limit(MAX_LOAD)));
  const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChatTongMessage));
  return list.reverse();
}

/** Nghe tin mới — chỉ gọi khi khung chat đang mở.
 *  Không nghe sự kiện XÓA: Supabase không lọc được DELETE theo collection nên mỗi lượt xóa presence của
 *  khách cũng bắn tới mọi khung chat đang mở → tốn quota message. Tin bị admin xóa sẽ biến mất khi mở lại khung. */
export function subscribeLive(onInsert: (m: ChatTongMessage) => void): () => void {
  const channel = supabase
    .channel(`chat_tong_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'firestore_docs', filter: `collection_path=eq.${PATH}` },
      (p: any) => { const r = p.new; if (r?.doc_id) onInsert({ id: r.doc_id, ...(r.data || {}) }); })
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}

/** Ghép tin mới vào danh sách (bỏ trùng, giới hạn độ dài) */
export function mergeMessage(list: ChatTongMessage[], m: ChatTongMessage): ChatTongMessage[] {
  if (list.some(x => x.id === m.id)) return list;
  const next = [...list, m].sort((a, b) => a.createdAt - b.createdAt);
  return next.length > MAX_KEEP ? next.slice(next.length - MAX_KEEP) : next;
}

export async function sendChatMessage(msg: Omit<ChatTongMessage, 'id'>): Promise<ChatTongMessage> {
  const clean: any = {};
  Object.entries(msg).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
  const ref = await addDoc(colRef(), clean);
  return { id: ref.id, ...(clean as Omit<ChatTongMessage, 'id'>) };
}

export async function deleteChatMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, 'community_chat', 'global', 'messages', id));
}

// ── Số người online (đếm nhẹ, không tải dữ liệu) ──────────────────────────────
const ONLINE_TTL = 180_000; // khớp với presence.ts
export interface OnlineCounts { total: number; members: number; guests: number }

export async function fetchOnlineCounts(): Promise<OnlineCounts> {
  const since = new Date(Date.now() - ONLINE_TTL).toISOString();
  const base = () => supabase.from('firestore_docs')
    .select('doc_id', { count: 'exact', head: true })
    .eq('collection_path', 'presence').gte('updated_at', since);
  const [all, mem] = await Promise.all([
    base(),
    base().not('data->>uid', 'is', null),
  ]);
  const total = all.count ?? 0;
  const members = Math.min(mem.count ?? 0, total);
  return { total, members, guests: Math.max(total - members, 0) };
}

// ── Thông báo "Đang xem phim" vào kênh chat ────────────────────────────────────
// Mỗi người tối đa 1 thông báo / 90 giây, và mỗi phim-tập chỉ báo 1 lần / 30 phút (tránh spam khi tải lại trang).
export async function announceWatching(info: { movieName: string; episodeName?: string; link: string; key: string; thumb?: string }): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;
    const now = Date.now();
    const lastAny = Number(localStorage.getItem('ct_act_last') || 0);
    const lastKey = Number(localStorage.getItem(`ct_act_${info.key}`) || 0);
    if (now - lastAny < 90_000 || now - lastKey < 30 * 60_000) return;
    const profile = await getUserProfile(user.uid);
    if (!profile || profile.isBanned) return;
    localStorage.setItem('ct_act_last', String(now));
    localStorage.setItem(`ct_act_${info.key}`, String(now));
    await sendChatMessage({
      uid: user.uid, username: profile.username, avatar: profile.avatar, text: '',
      isAdmin: profile.role === 'admin', createdAt: now, kind: 'activity',
      activity: { movieName: info.movieName.slice(0, 120), episodeName: info.episodeName?.slice(0, 40), link: info.link, ...(info.thumb ? { thumb: info.thumb.slice(0, 300) } : {}) },
    });
  } catch { /* thông báo nền — lỗi thì bỏ qua */ }
}
