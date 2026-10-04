// ─── Lớp giả lập firebase-admin/firestore, chạy trên Supabase (dùng Service Role Key) ──
// Dùng cho các Serverless Function (webhook thẻ cào...) — các hàm này chạy phía server,
// tin cậy được nên dùng Service Role Key để bỏ qua Row Level Security (RLS).
//
// CẦN THÊM 2 BIẾN MÔI TRƯỜNG TRÊN VERCEL/NETLIFY (khác với biến VITE_SUPABASE_* của frontend):
//   SUPABASE_URL               - giống VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  - lấy ở Supabase Dashboard → Project Settings → API →
//                                 "service_role" key (secret — TUYỆT ĐỐI không lộ ra frontend)
const { createClient } = require('@supabase/supabase-js');

let _client = null;
function getSupabaseAdmin() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

function genId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function docRef(collectionPath, id) {
  const supabase = getSupabaseAdmin();
  return {
    id,
    async get() {
      const { data, error } = await supabase.from('firestore_docs').select('data')
        .eq('collection_path', collectionPath).eq('doc_id', id).maybeSingle();
      if (error) throw error;
      return { exists: !!data, id, data: () => (data ? data.data : undefined) };
    },
    async set(value, opts) {
      let toWrite = value;
      if (opts && opts.merge) {
        const cur = await this.get();
        toWrite = { ...(cur.exists ? cur.data() : {}), ...value };
      }
      const { error } = await supabase.from('firestore_docs').upsert(
        { collection_path: collectionPath, doc_id: id, data: toWrite, updated_at: new Date().toISOString() },
        { onConflict: 'collection_path,doc_id' }
      );
      if (error) throw error;
    },
    async update(patch) {
      const cur = await this.get();
      const merged = { ...(cur.exists ? cur.data() : {}), ...patch };
      const { error } = await supabase.from('firestore_docs')
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq('collection_path', collectionPath).eq('doc_id', id);
      if (error) throw error;
    },
  };
}

function collectionRef(name) {
  return { doc: (id) => docRef(name, id || genId()) };
}

function getFirestore() {
  return { collection: (name) => collectionRef(name) };
}

module.exports = { getFirestore };
