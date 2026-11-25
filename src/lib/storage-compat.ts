/**
 * ─── Lớp giả lập API của firebase/storage, chạy trên Supabase Storage ────────────────
 * QUAN TRỌNG: vào Supabase Dashboard → Storage → New bucket → đặt tên đúng "public",
 * bật "Public bucket" (để ảnh xem được không cần đăng nhập, giống Firebase Storage hiện tại).
 */
import { supabase } from './supabase';

const BUCKET = 'media';

export function getStorage(_app?: any) { return { __type: 'storage' as const }; }

export function ref(_storage: any, path: string) {
  return { __type: 'storageRef' as const, path, url: undefined as string | undefined };
}

// Nếu đặt VITE_UPLOAD_URL (địa chỉ hosting có upload.php) thì ảnh được lưu trên hosting → không tốn Storage/Egress Supabase.
// Hosting lỗi / chưa đăng nhập → tự quay về Supabase Storage như cũ.
const UPLOAD_URL = (((import.meta as any).env?.VITE_UPLOAD_URL as string | undefined) || '').replace(/\/+$/, '');

async function uploadToHosting(storageRef: { path: string; url?: string }, file: File | Blob, meta?: any): Promise<boolean> {
  if (!UPLOAD_URL) return false;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const fd = new FormData();
    fd.append('file', file, 'upload');
    fd.append('folder', storageRef.path.split('/')[0] || 'misc');
    if (meta?.replace) fd.append('replace', String(meta.replace));
    const r = await fetch(`${UPLOAD_URL}/upload.php`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.url) { storageRef.url = j.url; return true; }
  } catch {}
  return false;
}

export async function uploadBytes(storageRef: { path: string; url?: string }, file: File | Blob, _meta?: any) {
  if (await uploadToHosting(storageRef, file, _meta)) return { ref: storageRef };
  // cacheControl 1 năm: trình duyệt/CDN giữ ảnh, không tải lại mỗi lần xem → giảm egress Storage
  const { error } = await supabase.storage.from(BUCKET).upload(storageRef.path, file, { upsert: true, cacheControl: '31536000', contentType: _meta?.contentType || (file as File).type || undefined });
  if (error) throw error;
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef: { path: string; url?: string }) {
  if (storageRef.url) return storageRef.url;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageRef.path);
  return data.publicUrl;
}
