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
}

export async function deleteDoc(ref: DocumentReference) {
  const { error } = await supabase.from('firestore_docs').delete()
    .eq('collection_path', ref.path).eq('doc_id', ref.id);
  if (error) throw error;
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
  fetchAndEmit();

  let channel: any = null;
  try {
    channel = supabase
      // Tên kênh LUÔN phải là duy nhất cho mỗi lần gọi onSnapshot — nếu 2 nơi trong code
      // cùng theo dõi 1 document/collection mà đặt tên kênh giống hệt nhau, Supabase sẽ báo lỗi
      // "cannot add postgres_changes callbacks... after subscribe()" ở lần đăng ký thứ 2.
      .channel(`fs_${path}_${isDoc ? refOrQuery.id : 'q'}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'firestore_docs', filter: `collection_path=eq.${path}` },
        () => { fetchAndEmit(); })
      .subscribe();
  } catch (e) {
    // Không để lỗi realtime làm crash cả app — chỉ báo qua onError, dữ liệu vẫn có nhờ fetchAndEmit() ở trên
    console.error('[firestore-compat] onSnapshot channel error:', e);
    onError?.(e);
  }

  return () => { if (channel) supabase.removeChannel(channel); };
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
