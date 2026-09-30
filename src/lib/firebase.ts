/**
 * ─── ĐÃ CHUYỂN TỪ FIREBASE SANG SUPABASE ──────────────────────────────────────────────
 * File này KHÔNG còn dùng Firebase nữa — nó export lại `db`/`auth`/`storage` từ các lớp
 * giả lập (firestore-compat.ts, auth-compat.ts, storage-compat.ts) chạy trên Supabase,
 * để mọi nơi khác trong code (đang import từ './firebase' hoặc '../lib/firebase')
 * không cần sửa gì cả.
 *
 * CẦN LÀM TRƯỚC KHI DEPLOY — xem hướng dẫn đầy đủ trong supabase.ts và supabase_schema.sql:
 *   1) Tạo project tại https://supabase.com, lấy Project URL + anon key → điền vào supabase.ts
 *      (hoặc set biến môi trường VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trên Vercel).
 *   2) Chạy file supabase_schema.sql trong Supabase → SQL Editor.
 *   3) Authentication → Providers → Email → tắt "Confirm email".
 *   4) Storage → tạo bucket tên "public", bật Public bucket.
 */
import { getStorage } from './storage-compat';

export { initializeFirestore } from './firestore-compat';
export { auth, getAuth } from './auth-compat';
export { getStorage } from './storage-compat';

// db không còn là 1 kết nối thật cần khởi tạo — chỉ là 1 marker để các hàm compat nhận diện
export const db = { __type: 'db' as const };
export const storage = getStorage();

// Analytics: Supabase không có sản phẩm tương đương Firebase Analytics — bỏ qua, không dùng nữa.
export const analytics = undefined;
