/**
 * ─── Lớp giả lập API của firebase/firestore, chạy trên Supabase (Postgres) ──────────────
 * Mục đích: 29 file trong dự án đang gọi collection()/doc()/getDoc()/setDoc()/onSnapshot()...
 * kiểu Firestore — thay vì viết lại từng file, ta giữ nguyên CÁCH GỌI y hệt, chỉ đổi nơi
 * các hàm này trỏ tới (từ Firebase sang Supabase). Mọi "document" được lưu vào 1 bảng
 * Postgres duy nhất `firestore_docs` dạng (collection_path, doc_id, data jsonb) — xem
 * file supabase_schema.sql ở gốc dự án để tạo bảng này trong Supabase.
 *
 * GIỚI HẠN cần biết (khác Firestore thật):
 *  - onSnapshot: mỗi khi có thay đổi, TẢI LẠI TOÀN BỘ kết quả rồi gọi callback (không diff
 *    từng phần tử như Firestore) — tốn hơn 1 chút nhưng đơn giản & đúng kết quả.
 *  - runTransaction: KHÔNG atomic thật (Supabase client không hỗ trợ transaction phía
 *    trình duyệt) — đọc rồi ghi tuần tự. Rủi ro race-condition nếu 2 người bấm cùng lúc,
 *    chấp nhận được với quy mô site hiện tại.
 *  - where()/orderBy(): so sánh trên field JSON dạng text (data->>field) — đủ dùng cho hầu
 *    hết trường hợp (chuỗi, timestamp dạng số mili-giây), nhưng không mạnh bằng index thật.
 */
import { supabase } from './supabase';

export interface DocumentReference { __type: 'doc'; path: string; id: string; }
export interface CollectionReference { __type: 'collection'; path: string; }
interface QueryConstraint { __ctype: 'where' | 'orderBy' | 'limit'; [k: string]: any; }
interface QueryRef { __type: 'query'; path: string; wheres: any[]; orders: any[]; limitN: number | null; }
type AnyRef = DocumentReference | CollectionReference | QueryRef;
export type SetOptions = { merge?: boolean };
export type Unsubscribe = () => void;
export type { QueryConstraint };

function genId(): string {
  try { return crypto.randomUUID(); } catch { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

export function collection(parent: any, ...rest: string[]): CollectionReference {
  if (parent && parent.__type === 'doc') return { __type: 'collection', path: [parent.path, parent.id, ...rest].join('/') };
  return { __type: 'collection', path: rest.join('/') };
}

export function doc(parent: any, ...rest: string[]): DocumentReference {
  if (parent && parent.__type === 'collection') {
    return { __type: 'doc', path: parent.path, id: rest[0] || genId() };
  }
  const id = rest[rest.length - 1] || genId();
  const collSegs = rest.slice(0, -1);
  return { __type: 'doc', path: collSegs.join('/'), id };
}

export function query(coll: CollectionReference, ...constraints: QueryConstraint[]): QueryRef {
  const q: QueryRef = { __type: 'query', path: coll.path, wheres: [], orders: [], limitN: null };
  for (const c of constraints) {
    if (c.__ctype === 'where') q.wheres.push(c);
    else if (c.__ctype === 'orderBy') q.orders.push(c);
    else if (c.__ctype === 'limit') q.limitN = c.n;
  }
  return q;
}
export function where(field: string, op: string, value: any): QueryConstraint { return { __ctype: 'where', field, op, value }; }
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): QueryConstraint { return { __ctype: 'orderBy', field, dir }; }
export function limit(n: number): QueryConstraint { return { __ctype: 'limit', n }; }

// ── Giá trị đặc biệt (sentinel), xử lý khi merge dữ liệu ──
export function serverTimestamp() { return { __sentinel: 'serverTimestamp' as const }; }
export function increment(n: number) { return { __sentinel: 'increment' as const, n }; }
export function arrayUnion(...items: any[]) { return { __sentinel: 'arrayUnion' as const, items }; }
export function arrayRemove(...items: any[]) { return { __sentinel: 'arrayRemove' as const, items }; }
export function deleteField() { return { __sentinel: 'deleteField' as const }; }

function isSentinel(v: any, type: string) { return v && typeof v === 'object' && v.__sentinel === type; }

function applyMerge(existing: Record<string, any>, patch: Record<string, any>): Record<string, any> {
  const out = { ...existing };
  for (const [k, v] of Object.entries(patch)) {
    if (isSentinel(v, 'deleteField')) { delete out[k]; continue; }
    if (isSentinel(v, 'serverTimestamp')) { out[k] = Date.now(); continue; }
    if (isSentinel(v, 'increment')) { out[k] = (Number(out[k]) || 0) + (v as any).n; continue; }
    if (isSentinel(v, 'arrayUnion')) {
      const cur = Array.isArray(out[k]) ? out[k] : [];
      out[k] = [...cur, ...(v as any).items.filter((it: any) => !cur.includes(it))];
      continue;
    }
    if (isSentinel(v, 'arrayRemove')) {
      const cur = Array.isArray(out[k]) ? out[k] : [];
      out[k] = cur.filter((it: any) => !(v as any).items.includes(it));
      continue;
    }
    out[k] = v;
  }
  return out;
}

export async function getDoc(ref: DocumentReference) {
  const { data, error } = await supabase
    .from('firestore_docs').select('data')
    .eq('collection_path', ref.path).eq('doc_id', ref.id).maybeSingle();
  if (error) throw error;
  return {
    id: ref.id, ref,
    exists: () => !!data,
    data: () => (data ? (data as any).data : undefined),
  };
}
export const getDocFromServer = getDoc;

function buildQuery(q: QueryRef) {
  let req: any = supabase.from('firestore_docs').select('doc_id, data').eq('collection_path', q.path);
  for (const w of q.wheres) {
    const col = `data->>${w.field}`;
    switch (w.op) {
      case '==': req = req.filter(col, 'eq', w.value); break;
      case '!=': req = req.filter(col, 'neq', w.value); break;
      case '<': req = req.filter(col, 'lt', w.value); break;
      case '<=': req = req.filter(col, 'lte', w.value); break;
      case '>': req = req.filter(col, 'gt', w.value); break;
      case '>=': req = req.filter(col, 'gte', w.value); break;
      case 'in': req = req.in(col, w.value); break;
      default: break; // array-contains, not-in... ít dùng trong code hiện tại, bỏ qua an toàn
    }
  }
  for (const o of q.orders) req = req.order(`data->>${o.field}`, { ascending: o.dir !== 'desc' });
  if (q.limitN) req = req.limit(q.limitN);
  return req;
}

export async function getDocs(refOrQuery: CollectionReference | QueryRef) {
  const q: QueryRef = (refOrQuery as any).__type === 'query'
    ? (refOrQuery as QueryRef)
    : { __type: 'query', path: refOrQuery.path, wheres: [], orders: [], limitN: null };
  const { data, error } = await buildQuery(q);
  if (error) throw error;
  const rows = (data || []) as any[];
  const docs = rows.map(r => ({
    id: r.doc_id,
    ref: { __type: 'doc', path: q.path, id: r.doc_id } as DocumentReference,
    exists: () => true,
    data: () => r.data,
  }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: any) => docs.forEach(fn) };
}

export async function setDoc(ref: DocumentReference, data: any, opts?: SetOptions) {
  const base = opts?.merge ? (await getDoc(ref)).data() || {} : {};
  const toWrite = applyMerge(base, data);
  const { error } = await supabase.from('firestore_docs').upsert(
    { collection_path: ref.path, doc_id: ref.id, data: toWrite, updated_at: new Date().toISOString() },
    { onConflict: 'collection_path,doc_id' }
  );
  if (error) throw error;
  refreshPollers(ref.path);
}

export async function addDoc(coll: CollectionReference, data: any) {
  const ref: DocumentReference = { __type: 'doc', path: coll.path, id: genId() };
  await setDoc(ref, data);
  return ref;
}

export async function updateDoc(ref: DocumentReference, data: any) {
  const cur = await getDoc(ref);
  const merged = applyMerge(cur.exists() ? cur.data() : {}, data);
  const { error } = await supabase.from('firestore_docs')
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq('collection_path', ref.path).eq('doc_id', ref.id);
  if (error) throw error;
  refreshPollers(ref.path);
}

export async function deleteDoc(ref: DocumentReference) {
  const { error } = await supabase.from('firestore_docs').delete()
    .eq('collection_path', ref.path).eq('doc_id', ref.id);
  if (error) throw error;
  refreshPollers(ref.path);
}

// ── Polling dùng chung cho cấu hình công khai (thay cho kênh realtime) ──
// Nội dung công khai ít đổi (cấu hình, banner, danh sách phim up thủ công/ghim/sắp chiếu/song ngữ/kênh TV):
// không cần realtime, đọc định kỳ + tự làm mới ngay khi chính trình duyệt này vừa ghi (refreshPollers).
const POLL_PATHS = new Set([
  'config', 'site_config', 'settings', 'popup_ads', 'ad_banners', 'notifications',
  'manual_movies', 'movie_overrides', 'upcoming_movies', 'pinned_movies', 'bilingual_movies', 'tv_channels',
]);
// MỘT truy vấn duy nhất cho TẤT CẢ các mục polling (trước đây mỗi mục tự hỏi riêng → ~20 request / khách / 90s,
// làm Egress + Log ingestion của Supabase đầy rất nhanh). Giờ: 1 request / khách / 5 phút, chỉ khi tab đang hiện.
const POLL_INTERVAL = 300_000;
const FULL_CHECK_MS = 3_600_000; // mỗi giờ kiểm tra kỹ 1 lần (để bắt cả trường hợp xóa dữ liệu)
let globalTimer: any = null, globalSig = '', lastFull = Date.now();
async function globalProbe(): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('firestore_docs').select('collection_path,updated_at')
      .in('collection_path', Array.from(POLL_PATHS)).order('updated_at', { ascending: false }).limit(1);
    if (error) return null;
    return data && data[0] ? `${data[0].collection_path}|${data[0].updated_at}` : 'empty';
  } catch { return null; }
}
async function globalTick() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (pollers.size === 0) return;
  const sig = await globalProbe();
  if (!sig) return;
  const fullDue = Date.now() - lastFull > FULL_CHECK_MS;
  if (globalSig && sig === globalSig && !fullDue) return; // không có gì mới → không tải gì thêm
  globalSig = sig; if (fullDue) lastFull = Date.now();
  pollers.forEach(p => p.tick(false)); // từng mục tự so chữ ký rồi mới tải lại nếu thật sự đổi
}
function shouldPoll(path: string): boolean {
  if (!POLL_PATHS.has(path)) return false;
  try { if (location.pathname.startsWith('/daophim/admin')) return false; } catch {}
  return true;
}
interface Poller { subs: Set<{ onNext: any; onError: any }>; timer: any; last: any; hasLast: boolean; first: Promise<void> | null; sig?: string; docId?: string; tick: (force?: boolean) => Promise<void>; }
const pollers = new Map<string, Poller>();
// Sau khi trình duyệt này ghi vào 1 collection đang polling → làm mới ngay (người up phim thấy liền, không chờ 90s)
export function refreshPollers(path: string) {
  pollers.forEach((p, key) => { if (key.startsWith(path + '|')) p.tick(true); });
}
async function probeSignature(path: string, docId?: string): Promise<string | null> {
  try {
    let q: any = supabase.from('firestore_docs').select('updated_at', { count: 'exact' }).eq('collection_path', path);
    if (docId) q = q.eq('doc_id', docId);
    const { data, count, error } = await q.order('updated_at', { ascending: false }).limit(1);
    if (error) return null;
    return `${count ?? 0}|${(data && data[0] && data[0].updated_at) || ''}`;
  } catch { return null; }
}
function startSharedPoll(key: string, load: () => Promise<any>, onNext: any, onError: any, docId?: string): Unsubscribe {
  let p = pollers.get(key);
  const sub = { onNext, onError };
  if (!p) {
    const np: Poller = { subs: new Set(), timer: null, last: null, hasLast: false, first: null, docId, tick: async () => {} };
    const tick = async (force = false) => {
      if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        if (!force) {
          // Hỏi chữ ký nhẹ (số dòng + updated_at mới nhất) — không đổi thì KHÔNG tải lại dữ liệu (tiết kiệm egress)
          const sig = await probeSignature(key.split('|')[0], np.docId);
          if (np.hasLast && sig && sig === np.sig) return;
          np.sig = sig || np.sig;
        }
        const v = await load(); np.last = v; np.hasLast = true; np.subs.forEach(x => x.onNext(v)); }
      catch (e) { np.subs.forEach(x => x.onError?.(e)); }
    };
    np.tick = tick;
    if (!globalTimer) globalTimer = setInterval(globalTick, POLL_INTERVAL);
    pollers.set(key, np); p = np;
    p.subs.add(sub);
    p.first = tick(true); // lần đọc đầu tiên, chia sẻ cho mọi người nghe đăng ký sau
  } else {
    p.subs.add(sub);
    // Người nghe thứ 2 trở đi: dùng kết quả gần nhất (hoặc chờ lần đọc đầu) thay vì gọi mạng thêm
    if (p.hasLast) { try { onNext(p.last); } catch {} }
    else p.first?.then(() => { if (p!.hasLast) { try { onNext(p!.last); } catch {} } });
  }
  return () => {
    const cur = pollers.get(key); if (!cur) return;
    cur.subs.delete(sub);
    if (cur.subs.size === 0) { pollers.delete(key); if (pollers.size === 0 && globalTimer) { clearInterval(globalTimer); globalTimer = null; } }
  };
}

export function onSnapshot(refOrQuery: any, ...args: any[]): Unsubscribe {
  let onNext: any, onError: any;
  if (typeof args[0] === 'function') { onNext = args[0]; onError = args[1]; }
  else { onNext = args[0]?.next; onError = args[0]?.error; }

  const isDoc = refOrQuery.__type === 'doc';
  const path = refOrQuery.path;

  const fetchAndEmit = async () => {
    try { onNext(isDoc ? await getDoc(refOrQuery) : await getDocs(refOrQuery)); }
    catch (e) { onError?.(e); }
  };

  // ── Tiết kiệm quota Supabase Realtime (Free: 200 kết nối đồng thời) ──
  // Các cấu hình công khai (config/site_config/settings/popup_ads...) KHÔNG cần realtime:
  // trước đây mỗi khách mở hàng chục kênh websocket chỉ để nghe cấu hình hiếm khi đổi.
  // Giờ dùng polling dùng chung (1 bộ đếm cho mọi nơi nghe cùng 1 tài liệu, tạm dừng khi tab ẩn).
  // Trang Admin vẫn dùng realtime như cũ để thấy thay đổi ngay.
  if (shouldPoll(path)) {
    return startSharedPoll(`${path}|${isDoc ? refOrQuery.id : JSON.stringify([refOrQuery.wheres, refOrQuery.orders, refOrQuery.limitN])}`,
      async () => (isDoc ? await getDoc(refOrQuery) : await getDocs(refOrQuery)), onNext, onError, isDoc ? refOrQuery.id : undefined);
  }
  fetchAndEmit();

  // ── Realtime: 1 kênh DÙNG CHUNG cho mỗi collection (trước đây mỗi lần gọi onSnapshot mở 1 kênh riêng) ──
  // Sự kiện thay đổi được GỘP (debounce) và bị hoãn khi tab đang ẩn → bớt hẳn số lần tải lại + số message.
  const listener = makeLiveListener(path, fetchAndEmit);
  try { joinSharedChannel(path, listener); }
  catch (e) {
    console.error('[firestore-compat] onSnapshot channel error:', e);
    onError?.(e);
  }
  return () => { listener.dispose(); leaveSharedChannel(path, listener); };
}

// Collection ghi liên tục (presence) chỉ cần làm mới thưa; còn lại gộp trong 400ms
const LIVE_MIN_GAP: Record<string, number> = { presence: 8000 };
interface LiveListener { onChange: () => void; dispose: () => void; }
function makeLiveListener(path: string, run: () => void): LiveListener {
  const gap = LIVE_MIN_GAP[path] ?? 400;
  let timer: any = null, last = 0, dirty = false, dead = false;
  // Kênh thoại/tín hiệu WebRTC cần phản hồi ngay kể cả khi tab ẩn → không hoãn
  const urgent = /voice|signal/i.test(path);
  const flush = () => {
    timer = null;
    if (dead) return;
    if (!urgent && typeof document !== 'undefined' && document.visibilityState === 'hidden') { dirty = true; return; }
    dirty = false; last = Date.now(); run();
  };
  const onVis = () => { if (dirty && document.visibilityState === 'visible') flush(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
  return {
    onChange: () => {
      if (timer || dead) return;
      const wait = Math.max(gap - (Date.now() - last), 0) || gap;
      timer = setTimeout(flush, wait);
    },
    dispose: () => { dead = true; if (timer) clearTimeout(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis); },
  };
}
const sharedChannels = new Map<string, { channel: any; listeners: Set<LiveListener> }>();
function joinSharedChannel(path: string, l: LiveListener) {
  let e = sharedChannels.get(path);
  if (!e) {
    const listeners = new Set<LiveListener>();
    const channel = supabase
      .channel(`fs_shared_${path}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'firestore_docs', filter: `collection_path=eq.${path}` },
        () => { listeners.forEach(x => x.onChange()); })
      .subscribe();
    e = { channel, listeners };
    sharedChannels.set(path, e);
  }
  e.listeners.add(l);
}
function leaveSharedChannel(path: string, l: LiveListener) {
  const e = sharedChannels.get(path); if (!e) return;
  e.listeners.delete(l);
  if (e.listeners.size === 0) { try { supabase.removeChannel(e.channel); } catch {} sharedChannels.delete(path); }
}

// ── Timestamp tối giản, tương thích .toDate()/.toMillis() ──
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  static now() { return Timestamp.fromMillis(Date.now()); }
  static fromDate(d: Date) { return Timestamp.fromMillis(d.getTime()); }
  static fromMillis(ms: number) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1e6); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
}

export async function runTransaction(_db: any, updateFn: (tx: any) => Promise<any>) {
  const tx = {
    get: (ref: DocumentReference) => getDoc(ref),
    set: (ref: DocumentReference, data: any, opts?: SetOptions) => setDoc(ref, data, opts),
    update: (ref: DocumentReference, data: any) => updateDoc(ref, data),
    delete: (ref: DocumentReference) => deleteDoc(ref),
  };
  return updateFn(tx);
}

export function initializeFirestore(_app: any, _opts?: any) { return { __type: 'db' as const }; }
