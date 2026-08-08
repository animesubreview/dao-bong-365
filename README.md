# phimtuoitho

Web xem phim (React + Vite + Firebase), deploy trên Vercel với các API serverless trong thư mục `api/`.

## Chạy local

**Yêu cầu:** Node.js 18+

1. Cài dependencies:
   ```bash
   npm install
   ```
2. Copy file mẫu env và điền giá trị thật:
   ```bash
   cp .env.example .env
   ```
   Xem chi tiết từng biến (lấy ở đâu, dùng để làm gì) trong file `.env.example`.
3. Chạy dev server:
   ```bash
   npm run dev
   ```

## Deploy lên Vercel

1. Push code lên GitHub/GitLab và **Import Project** trên [vercel.com](https://vercel.com).
   Vercel tự nhận `vercel.json` (build command, rewrites, headers) — không cần cấu hình thêm.
2. Vào **Project → Settings → Environment Variables**, thêm toàn bộ biến có trong
   `.env.example` (copy tên biến, dán giá trị thật của bạn). Nhớ set cho cả 3 môi
   trường Production / Preview / Development nếu cần dùng ở preview.
3. Redeploy (hoặc push commit mới) để Vercel build lại với env vars mới.

### Nhóm biến chính
| Nhóm | Biến | Bắt buộc |
|---|---|---|
| Firebase client | `VITE_FIREBASE_*` | Nên set (có fallback mặc định) |
| Firebase Admin | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Có (dùng cho nạp thẻ, ví) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NOTIFY_SECRET`, `VITE_NOTIFY_SECRET` | Có (thông báo phim mới) |
| Cron/SEO | `CRON_SECRET`, `SITE_URL`, `INDEXNOW_KEY` | Có (endpoint `/api/check-new-movies`) |
| Nạp thẻ | `GACHTHEFAST_PARTNER_ID`, `GACHTHEFAST_PARTNER_KEY` | Nếu dùng tính năng nạp thẻ |
| Chống spam | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Tuỳ chọn |
| Discord | `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID` | Tuỳ chọn |

⚠️ **Bảo mật:** `TELEGRAM_BOT_TOKEN` và `NOTIFY_SECRET` từng bị hardcode thẳng trong
source code cũ của repo này (đã gỡ). Nếu bạn dùng lại token/secret cũ, hãy **thu hồi
và tạo mới** (revoke bot token qua @BotFather, đổi `NOTIFY_SECRET`) trước khi deploy,
vì giá trị cũ coi như đã bị lộ công khai.
