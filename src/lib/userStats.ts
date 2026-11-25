// ─── Thống kê thành viên (EXP, giờ xem, chuỗi ngày, xếp hạng) cho thẻ hồ sơ ────────────────────
// Lưu 1 document nhỏ / người: user_stats/{uid}. Ghi RẤT thưa để không tốn Supabase:
//  - giờ xem cộng dồn trong bộ nhớ, chỉ ghi mỗi 5 phút xem (và khi rời trang)
//  - mỗi phim chỉ tính "đã xem" 1 lần (giữ tối đa 400 slug gần nhất)
import { doc, getDoc, setDoc } from './firestore-compat';
import { db } from './firebase';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface UserStats {
  uid: string;
  exp: number;
  watchSeconds: number;
  slugs: string[];       // các phim đã xem (không trùng)
  streak: number;        // số ngày xem liên tiếp
  lastDay: string;       // YYYY-MM-DD của lần xem gần nhất
  updatedAt: number;
}

const EXP_PER_LEVEL = 150;
const LEVEL_TITLES: [number, string, string][] = [
  [1, 'Tân Binh', '🌱'], [2, 'Mọt Phim', '🍿'], [3, 'Thánh Phê Bình', '🔥'],
  [6, 'Cao Thủ Xem Phim', '⚡'], [10, 'Huyền Thoại', '💎'], [20, 'Đại Sư Điện Ảnh', '🏆'],
];

export function levelOf(exp: number) { return 1 + Math.floor(Math.max(0, exp) / EXP_PER_LEVEL); }
export function levelProgress(exp: number) { return { cur: Math.max(0, exp) % EXP_PER_LEVEL, max: EXP_PER_LEVEL }; }
export function titleOf(level: number, isAdmin: boolean): { name: string; icon: string; level: number } {
  if (isAdmin) return { name: 'Quản Trị Viên Tối Cao', icon: '👑', level: 99 };
  let t = LEVEL_TITLES[0];
  for (const x of LEVEL_TITLES) if (level >= x[0]) t = x;
  return { name: t[1], icon: t[2], level };
}

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const empty = (uid: string): UserStats => ({ uid, exp: 0, watchSeconds: 0, slugs: [], streak: 0, lastDay: '', updatedAt: 0 });
const ref = (uid: string) => doc(db, 'user_stats', uid);

export async function getUserStats(uid: string): Promise<UserStats> {
  try {
    const s = await getDoc(ref(uid));
    return s.exists() ? { ...empty(uid), ...(s.data() as any) } : empty(uid);
  } catch { return empty(uid); }
}

/** Gọi khi người dùng mở 1 phim để xem. Tính "đã xem", chuỗi ngày và EXP. */
export async function trackWatchStart(slug: string): Promise<void> {
  try {
    const u = getCurrentUser(); if (!u || !slug) return;
    const key = `us_start_${slug}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 30 * 60_000) return; // tải lại trang không tính lại
    sessionStorage.setItem(key, String(Date.now()));
    const s = await getUserStats(u.uid);
    const t = today();
    if (s.lastDay !== t) {
      s.streak = s.lastDay && dayDiff(s.lastDay, t) === 1 ? s.streak + 1 : 1;
      s.lastDay = t; s.exp += 10; // thưởng điểm danh ngày
    }
    if (!s.slugs.includes(slug)) { s.slugs = [...s.slugs, slug].slice(-400); s.exp += 5; }
    s.updatedAt = Date.now();
    await setDoc(ref(u.uid), s);
  } catch {}
}

/** Đếm giờ xem khi tab đang hiện. Trả về hàm dừng (gọi khi rời trang xem). */
export function startWatchTimer(): () => void {
  let pending = 0, lastFlush = Date.now(), stopped = false;
  const tick = setInterval(() => {
    if (document.visibilityState === 'visible') pending += 15;
    if (pending >= 300 && Date.now() - lastFlush > 290_000) flush();
  }, 15_000);
  async function flush() {
    const add = pending; if (add < 30) return;
    pending = 0; lastFlush = Date.now();
    try {
      const u = getCurrentUser(); if (!u) return;
      const s = await getUserStats(u.uid);
      s.watchSeconds += add; s.exp += Math.floor(add / 60); s.updatedAt = Date.now();
      await setDoc(ref(u.uid), s);
    } catch {}
  }
  return () => { if (stopped) return; stopped = true; clearInterval(tick); flush(); };
}

export interface ProfileExtras { comments: number; rank: number | null; online: boolean }

/** Số bình luận, xếp hạng theo EXP, trạng thái online — toàn bộ là truy vấn đếm nhẹ. */
export async function getProfileExtras(uid: string, exp: number): Promise<ProfileExtras> {
  const since = new Date(Date.now() - 180_000).toISOString();
  const [c, r, o] = await Promise.all([
    supabase.from('firestore_docs').select('doc_id', { count: 'exact', head: true })
      .eq('collection_path', 'comments').eq('data->>uid', uid),
    supabase.from('firestore_docs').select('doc_id', { count: 'exact', head: true })
      .eq('collection_path', 'user_stats').filter('data->exp', 'gt', String(exp)),
    supabase.from('firestore_docs').select('doc_id', { count: 'exact', head: true })
      .eq('collection_path', 'presence').eq('data->>uid', uid).gte('updated_at', since),
  ]).catch(() => [null, null, null] as any[]);
  return {
    comments: c?.count ?? 0,
    rank: r && !r.error && r.count != null ? r.count + 1 : null,
    online: (o?.count ?? 0) > 0,
  };
}
