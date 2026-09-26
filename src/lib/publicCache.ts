/**
 * Cache đọc dùng chung cho dữ liệu công khai ít thay đổi (banner, popup, ghim phim,
 * song ngữ, override phim, kênh TV, thông báo, phim thủ công...).
 *
 * VÌ SAO CẦN FILE NÀY:
 * Trước đây mỗi component (AdBanner, PopupAd, Home, MovieDetail, Watch...) tự mở
 * 1 kết nối `onSnapshot` (lắng nghe realtime) riêng tới Firestore. Mỗi khách xem
 * web mở ra hàng chục kết nối cùng lúc, và cùng 1 collection có thể bị nhiều nơi
 * lắng nghe trùng lặp trên cùng 1 trang (VD trang chủ có 3 vị trí <AdBanner/>,
 * cả 3 đều tự nghe collection 'ad_banners'). Firestore tính phí/giới hạn theo
 * SỐ LƯỢT ĐỌC, nên vài trăm khách/ngày đã đủ chạm trần 50.000 lượt đọc miễn phí.
 *
 * Ở đây thay bằng: đọc 1 lần (getDocs), CHIA SẺ kết quả cho mọi component đang
 * cần cùng dữ liệu trong cùng 1 lượt tải trang (gộp request trùng lặp thành 1),
 * và giữ cache theo TTL — trong TTL đó, chuyển trang không phải đọc lại.
 * Đổi lại: admin sửa banner/thông báo... người xem cần chờ tối đa TTL hoặc tải
 * lại trang mới thấy thay đổi, thay vì thấy ngay lập tức như trước. Đánh đổi này
 * chấp nhận được vì các dữ liệu này vốn không cần cập nhật tức thời.
 */
import { collection, query, orderBy, getDocs, QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';

interface Entry { at: number; data: any[] }
const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<any[]>>();

function sessionGet(key: string): Entry | null {
  try {
    const v = sessionStorage.getItem('pc:' + key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
function sessionSet(key: string, entry: Entry) {
  try { sessionStorage.setItem('pc:' + key, JSON.stringify(entry)); } catch {}
}

/**
 * Đọc 1 collection (có cache). ttlMs mặc định 3 phút.
 * key: định danh cache (thường trùng tên collection + tham số lọc nếu có).
 */
export async function fetchCollectionCached<T = any>(
  key: string,
  colName: string,
  constraints: QueryConstraint[] = [],
  ttlMs = 3 * 60_000
): Promise<T[]> {
  const now = Date.now();

  const memHit = mem.get(key);
  if (memHit && now - memHit.at < ttlMs) return memHit.data as T[];

  const sHit = sessionGet(key);
  if (sHit && now - sHit.at < ttlMs) {
    mem.set(key, sHit);
    return sHit.data as T[];
  }

  // Gộp nhiều lời gọi trùng lúc trang đang tải (nhiều component cùng cần) thành 1 request
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T[]>;

  const p = (async () => {
    const q = query(collection(db, colName), ...constraints);
    // Thử đọc, nếu lỗi (thường do mạng chập chờn/timeout) thì đợi 1.5s rồi thử lại
    // đúng 1 lần trước khi bỏ cuộc — tránh mục bị "biến mất" oan chỉ vì 1 lượt rớt mạng thoáng qua.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const entry = { at: Date.now(), data };
        mem.set(key, entry);
        sessionSet(key, entry);
        inflight.delete(key);
        return data as T[];
      } catch (e) {
        console.error(`[publicCache] Lỗi đọc "${colName}" (lần ${attempt + 1}):`, e);
        if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
      }
    }
    inflight.delete(key);
    // Nếu có cache cũ (dù hết hạn) thì dùng tạm còn hơn trắng trang
    return (memHit?.data || sHit?.data || []) as T[];
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Xóa cache 1 key. Đồng thời bắn sự kiện 'pc-invalidate' để các subscriber đang
 * chạy (VD subscribeNotifications) đọc lại NGAY trong tab hiện tại — vì vậy admin
 * tự thấy ngay thông báo/nội dung mình vừa sửa mà không cần đợi hết TTL. Các
 * người xem khác vẫn nhận theo TTL/polling bình thường.
 */
export function invalidateCache(key: string) {
  mem.delete(key);
  try { sessionStorage.removeItem('pc:' + key); } catch {}
  try { window.dispatchEvent(new CustomEvent('pc-invalidate', { detail: { key } })); } catch {}
}

export function onCacheInvalidated(key: string, cb: () => void): () => void {
  const handler = (e: Event) => {
    if ((e as CustomEvent).detail?.key === key) cb();
  };
  window.addEventListener('pc-invalidate', handler);
  return () => window.removeEventListener('pc-invalidate', handler);
}

export { orderBy };
