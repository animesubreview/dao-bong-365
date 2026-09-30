import { createClient } from '@supabase/supabase-js';

// Cấu hình Supabase — lấy trong Supabase Dashboard → Project Settings → API.
// Có thể ghi đè bằng biến môi trường VITE_SUPABASE_*; nếu không đặt thì dùng giá trị mặc định bên dưới.
//
// LƯU Ý QUAN TRỌNG:
//  1) Vào https://supabase.com → New project → đặt tên/mật khẩu DB tùy ý (region chọn Singapore cho gần VN).
//  2) Vào Project Settings → API, copy "Project URL" và "anon public" key, dán thay vào 2 dòng dưới
//     (hoặc set biến môi trường VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trên Vercel rồi Redeploy).
//  3) Vào SQL Editor, dán TOÀN BỘ nội dung file `supabase_schema.sql` ở gốc dự án rồi bấm Run
//     — file đó tạo tất cả các bảng + Row Level Security (RLS) tương đương firestore.rules.
//  4) Vào Authentication → Providers, bật "Email" (tương đương Email/Password của Firebase).
//  5) Vào Storage, tạo 1 bucket tên "media" (Public bucket) để thay Firebase Storage.
const env = import.meta.env;
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://vfhuesiqrerwqnxatmbr.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QNoZ2a9ll5FGBfAYyNiSUA_WCvcULhl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper: lấy URL public của 1 file trong bucket "media" (tương đương getDownloadURL của Firebase Storage)
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
