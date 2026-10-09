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

// ── Gộp request trùng lặp đang chạy (nhiều component cùng đọc 1 thứ → chỉ 1 request) ──
const inflight = new Map<string, Promise<any>>();
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cur = inflight.get(key);
  if (cur) return cur as Promise<T>;
  const p = fn().finally(() => { inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

export async function getDoc(ref: DocumentReference) {
  const data = await dedupe(`doc:${ref.path}/${ref.id}`, async () => {
    const { data, error } = await supabase
      .from('firestore_docs').select('data')
      .eq('collection_path', ref.path).eq('doc_id', ref.id).maybeSingle();
    if (error) throw error;
    return data ? (data as any).data : undefined;
  });
  return {
    id: ref.id, ref,
    exists: () => data !== undefined,
    data: () => (data !== undefined ? data : undefined),
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
  const rows = await dedupe('q:' + JSON.stringify(q), async () => {
    const { data, error } = await buildQuery(q);
    if (error) throw error;
    return (data || []) as any[];
  });
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
}

export async function addDoc(coll: CollectionReference, data: any) {
  const ref: DocumentReference = { __type: 'doc', path: coll.path, id: genId() };
  await setDoc(ref, data);
  return ref;
}

/** Ghi đè/ghi thẳng 1 doc bằng 1 request duy nhất (KHÔNG đọc trước như setDoc merge) — dùng cho ping presence. */
export async function touchDoc(ref: DocumentReference, data: any) {
  const toWrite = applyMerge({}, data);
  const { error } = await supabase.from('firestore_docs').upsert(
    { collection_path: ref.path, doc_id: ref.id, data: toWrite, updated_at: new Date().toISOString() },
    { onConflict: 'collection_path,doc_id' }
  );
  if (error) throw error;
}

export async function updateDoc(ref: DocumentReference, data: any) {
  const cur = await getDoc(ref);
  const merged = applyMerge(cur.exists() ? cur.data() : {}, data);
  const { error } = await supabase.from('firestore_docs')
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq('collection_path', ref.path).eq('doc_id', ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: DocumentReference) {
  const { error } = await supabase.from('firestore_docs').delete()
    .eq('collection_path', ref.path).eq('doc_id', ref.id);
  if (error) throw error;
}

// ── onSnapshot tiết kiệm băng thông ───────────────────────────────────────────────────
// Trước: mỗi onSnapshot mở 1 kênh realtime riêng, và MỖI thay đổi trong collection làm TẤT CẢ
// người đang nghe tải lại TOÀN BỘ dữ liệu ngay lập tức (kể cả tab đang ẩn) → egress nhân lên theo số khách.
// Giờ: (1) dùng chung 1 kênh cho mỗi collection, (2) gộp nhiều thay đổi liên tiếp thành 1 lần tải
// lại (debounce), (3) bỏ qua thay đổi của doc khác khi đang theo dõi 1 doc, (4) tab đang ẩn thì
// KHÔNG tải, đợi khi quay lại tab mới tải, (5) doc cấu hình được cache ngắn trong sessionStorage.
type Hub = { channel: any; subs: Set<(payload: any) => void> };
const hubs = new Map<string, Hub>();
const DEBOUNCE_MS = 1500;
const DOC_CACHE_TTL = 2 * 60_000;

function getHub(path: string): Hub {
  let hub = hubs.get(path);
  if (hub) return hub;
  const h: Hub = { channel: null, subs: new Set() };
  try {
    h.channel = supabase
      .channel(`fs_${path}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'firestore_docs', filter: `collection_path=eq.${path}` },
        (payload: any) => { h.subs.forEach(fn => { try { fn(payload); } catch {} }); })
      .subscribe();
  } catch (e) {
    console.error('[firestore-compat] realtime channel error:', e);
  }
  hubs.set(path, h);
  return h;
}

function releaseHub(path: string, fn: (payload: any) => void) {
  const hub = hubs.get(path);
  if (!hub) return;
  hub.subs.delete(fn);
  if (hub.subs.size === 0) {
    try { if (hub.channel) supabase.removeChannel(hub.channel); } catch {}
    hubs.delete(path);
  }
}

function docCacheGet(path: string, id: string): { exists: boolean; data: any } | null {
  try {
    const v = sessionStorage.getItem(`fsd:${path}/${id}`);
    if (!v) return null;
    const e = JSON.parse(v);
    return Date.now() - e.at < DOC_CACHE_TTL ? e : null;
  } catch { return null; }
}
function docCacheSet(path: string, id: string, exists: boolean, data: any) {
  try { sessionStorage.setItem(`fsd:${path}/${id}`, JSON.stringify({ at: Date.now(), exists, data })); } catch {}
}

export function onSnapshot(refOrQuery: any, ...args: any[]): Unsubscribe {
  let onNext: any, onError: any;
  if (typeof args[0] === 'function') { onNext = args[0]; onError = args[1]; }
  else { onNext = args[0]?.next; onError = args[0]?.error; }

  const isDoc = refOrQuery.__type === 'doc';
  const path = refOrQuery.path;
  let stopped = false;
  let dirty = false;
  let timer: any = null;

  const fetchAndEmit = async () => {
    if (stopped) return;
    try {
      const snap: any = isDoc ? await getDoc(refOrQuery) : await getDocs(refOrQuery);
      if (stopped) return;
      if (isDoc) docCacheSet(path, refOrQuery.id, snap.exists(), snap.data());
      onNext(snap);
    } catch (e) { if (!stopped) onError?.(e); }
  };

  // Lần đầu: doc cấu hình còn mới trong cache thì dùng luôn, khỏi gọi mạng
  const cached = isDoc ? docCacheGet(path, refOrQuery.id) : null;
  if (cached) {
    try {
      onNext({ id: refOrQuery.id, ref: refOrQuery, exists: () => cached.exists, data: () => (cached.exists ? cached.data : undefined) });
    } catch (e) { onError?.(e); }
  } else {
    fetchAndEmit();
  }

  const schedule = () => {
    if (typeof document !== 'undefined' && document.hidden) { dirty = true; return; }
    clearTimeout(timer);
    timer = setTimeout(fetchAndEmit, DEBOUNCE_MS);
  };

  const handler = (payload: any) => {
    if (isDoc) {
      const did = payload?.new?.doc_id ?? payload?.old?.doc_id;
      if (did && did !== refOrQuery.id) return; // thay đổi của doc khác → bỏ qua
    }
    schedule();
  };

  const onVisible = () => {
    if (!document.hidden && dirty) { dirty = false; schedule(); }
  };
  try { document.addEventListener('visibilitychange', onVisible); } catch {}

  getHub(path).subs.add(handler);

  return () => {
    stopped = true;
    clearTimeout(timer);
    try { document.removeEventListener('visibilitychange', onVisible); } catch {}
    releaseHub(path, handler);
  };
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
