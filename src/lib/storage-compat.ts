/**
 * ─── Lớp giả lập API của firebase/storage, chạy trên Supabase Storage ────────────────
 * QUAN TRỌNG: vào Supabase Dashboard → Storage → New bucket → đặt tên đúng "public",
 * bật "Public bucket" (để ảnh xem được không cần đăng nhập, giống Firebase Storage hiện tại).
 */
import { supabase } from './supabase';

const BUCKET = 'media';

export function getStorage(_app?: any) { return { __type: 'storage' as const }; }

export function ref(_storage: any, path: string) {
  return { __type: 'storageRef' as const, path };
}

export async function uploadBytes(storageRef: { path: string }, file: File | Blob, _meta?: any) {
  // cacheControl 1 năm: trình duyệt/CDN giữ ảnh, không tải lại mỗi lần xem → giảm egress Storage
  const { error } = await supabase.storage.from(BUCKET).upload(storageRef.path, file, { upsert: true, cacheControl: '31536000', contentType: _meta?.contentType || (file as File).type || undefined });
  if (error) throw error;
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef: { path: string }) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageRef.path);
  return data.publicUrl;
}
