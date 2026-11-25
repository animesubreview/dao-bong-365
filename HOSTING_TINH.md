# Đưa web lên hosting tĩnh (cPanel / DirectAdmin / VPS Apache)

1. Trên máy có Node.js (hoặc Termux: `pkg install nodejs`): `npm install` rồi `npm run build`
   → ra thư mục `dist/` (đã có sẵn `.htaccess`).
2. Upload TOÀN BỘ nội dung bên trong `dist/` (kể cả file ẩn `.htaccess`) vào `public_html/`.
3. Dữ liệu vẫn nằm ở Supabase (đã gắn sẵn trong `src/lib/supabase.ts`), hosting chỉ chứa file tĩnh.

Không chạy được trên hosting tĩnh (vì cần server riêng): thư mục `api/` — nạp thẻ, sitemap động, RSS,
SEO prerender cho Facebook/Zalo, telegram-notify, kk-proxy, m3u8-proxy.

## Muốn vẫn dùng nạp thẻ / proxy phát phim khi web ở hosting
Giữ project này trên Vercel (chỉ để chạy thư mục `api/`), rồi khi build web cho hosting đặt biến:
`VITE_API_BASE=https://ten-du-an.vercel.app` (ví dụ: `VITE_API_BASE=https://xxx.vercel.app npm run build`).
Các hàm trong `api/` đã bật CORS nên gọi chéo domain được.
