<?php
// Đổi tên file này thành config.php rồi sửa các giá trị bên dưới.
return [
    // Địa chỉ Supabase + khóa publishable (giống trong src/lib/supabase.ts) — dùng để kiểm tra người tải có đăng nhập thật không
    'supabase_url' => 'https://doogsouthxqbovguakhg.supabase.co',
    'supabase_key' => 'sb_publishable__Q4jdqlyBvkVqBoyiW9rOw_hknQu-7Z',

    // Các tên miền web được phép gọi (đúng từng ký tự, có https://, không có dấu / ở cuối)
    'allowed_origins' => ['https://daophim.online', 'https://www.daophim.online'],

    // Địa chỉ công khai của thư mục này (nơi upload.php nằm). Ảnh sẽ có dạng <public_base>/files/avatars/xxx.jpg
    'public_base' => 'https://cdn.daophim.online',

    'max_bytes'    => 4 * 1024 * 1024, // 4MB / ảnh
    'max_per_hour' => 30,              // số ảnh tối đa mỗi người mỗi giờ
];
