# Lưu ảnh tải lên trên hosting (thay cho Supabase Storage)

Hosting chỉ chứa ảnh người dùng tải lên (avatar, banner hồ sơ). Phim và dữ liệu vẫn như cũ.

## Cài đặt trên hosting (cần PHP 7.4+ có curl)
1. Tạo tên miền phụ, ví dụ `cdn.daophim.online`, trỏ vào một thư mục riêng (vd `public_html/cdn`).
   (Dùng thư mục riêng/tên miền phụ để không dính luật chuyển trang của web chính.)
2. Tải 3 thứ trong thư mục `hosting-upload` lên thư mục đó: `upload.php`, `config.sample.php`, thư mục `files` (có `.htaccess` bên trong).
3. Đổi tên `config.sample.php` thành `config.php`, mở ra kiểm tra `public_base` đúng với tên miền phụ và `allowed_origins` đúng tên miền web của bạn.
4. Cấp quyền ghi cho thư mục `files` (thường là 755; nếu tải lên báo lỗi lưu file thì thử 775).
5. Thử: mở `https://cdn.daophim.online/upload.php` trên trình duyệt → phải ra `{"error":"Chỉ nhận POST"}`.

## Bật trên web
Đặt biến môi trường khi build (Vercel → Settings → Environment Variables):
`VITE_UPLOAD_URL = https://cdn.daophim.online` rồi Redeploy.
Nếu hosting lỗi hoặc không đạt, web tự quay về lưu ở Supabase Storage như cũ.

## Lưu ý
- Ảnh cũ đang ở Supabase vẫn hiện bình thường.
- Mỗi người chỉ được 30 ảnh/giờ, mỗi ảnh tối đa 4MB, chỉ nhận JPG/PNG/WebP/GIF.
- Khi người dùng đổi banner, ảnh banner cũ của chính họ tự bị xóa để hosting không đầy.
