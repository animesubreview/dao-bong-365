<?php
// Nhận ảnh từ web Đảo Phim và lưu vào hosting này (thay cho Supabase Storage → hết tốn Egress/Storage của Supabase).
// An toàn: chỉ người ĐÃ ĐĂNG NHẬP (token Supabase hợp lệ) mới tải lên được; chỉ nhận ảnh thật; giới hạn dung lượng + số lần.
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

function out(int $code, array $data): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CORS: chỉ cho các tên miền web của bạn gọi ──
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['error' => 'Chỉ nhận POST']);

// ── Xác thực: hỏi Supabase xem token này là của ai ──
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if (!preg_match('/^Bearer\s+([\w\-\.]+)$/', $auth, $m)) out(401, ['error' => 'Thiếu đăng nhập']);
$token = $m[1];

$ch = curl_init(rtrim($config['supabase_url'], '/') . '/auth/v1/user');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => ['apikey: ' . $config['supabase_key'], 'Authorization: Bearer ' . $token],
]);
$resp = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$user = $resp ? json_decode($resp, true) : null;
if ($status !== 200 || empty($user['id'])) out(401, ['error' => 'Phiên đăng nhập không hợp lệ']);
$uid = preg_replace('/[^A-Za-z0-9\-]/', '', (string)$user['id']);
if ($uid === '') out(401, ['error' => 'Tài khoản không hợp lệ']);

// ── Giới hạn số lần tải / giờ cho mỗi người ──
$rateDir = __DIR__ . '/_rate';
if (!is_dir($rateDir)) { @mkdir($rateDir, 0755, true); @file_put_contents($rateDir . '/.htaccess', "Require all denied\nDeny from all\n"); }
$rf = $rateDir . '/' . $uid . '.json';
$rate = is_file($rf) ? (json_decode((string)file_get_contents($rf), true) ?: []) : [];
$now = time();
if (empty($rate['t']) || $now - (int)$rate['t'] > 3600) $rate = ['t' => $now, 'n' => 0];
if ((int)$rate['n'] >= $config['max_per_hour']) out(429, ['error' => 'Bạn tải lên quá nhiều, thử lại sau.']);
$rate['n'] = (int)$rate['n'] + 1;
@file_put_contents($rf, json_encode($rate));

// ── Kiểm tra file ──
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) out(400, ['error' => 'Không nhận được file']);
$f = $_FILES['file'];
if ($f['size'] > $config['max_bytes']) out(413, ['error' => 'Ảnh quá nặng (tối đa ' . round($config['max_bytes'] / 1048576) . 'MB)']);
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
$map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
if (!isset($map[$mime])) out(415, ['error' => 'Chỉ hỗ trợ JPG, PNG, WebP, GIF']);
if (@getimagesize($f['tmp_name']) === false) out(415, ['error' => 'File không phải ảnh hợp lệ']);

$folder = (string)($_POST['folder'] ?? 'misc');
if (!in_array($folder, ['avatars', 'banners', 'ads', 'posters', 'misc'], true)) $folder = 'misc';
$dir = __DIR__ . '/files/' . $folder;
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) out(500, ['error' => 'Không tạo được thư mục lưu']);

$name = $uid . '-' . $now . '-' . bin2hex(random_bytes(3)) . '.' . $map[$mime];
if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) out(500, ['error' => 'Lưu file thất bại']);
@chmod($dir . '/' . $name, 0644);

// ── Xóa ảnh cũ của CHÍNH người này (để hosting không đầy dần) ──
$replace = (string)($_POST['replace'] ?? '');
if ($replace !== '') {
    $old = basename(parse_url($replace, PHP_URL_PATH) ?: '');
    if ($old !== '' && strpos($old, $uid . '-') === 0 && preg_match('/^[\w\-\.]+$/', $old) && $old !== $name && is_file($dir . '/' . $old)) {
        @unlink($dir . '/' . $old);
    }
}

out(200, ['url' => rtrim($config['public_base'], '/') . '/files/' . $folder . '/' . $name]);
