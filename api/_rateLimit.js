/**
 * Rate-limit đơn giản theo IP, dùng chung cho các API function.
 * Lưu ý: bộ nhớ đếm nằm trong RAM của từng instance serverless, sẽ reset khi
 * instance "nguội" (cold start) hoặc khi có nhiều instance chạy song song —
 * đây KHÔNG phải rate-limit tuyệt đối chính xác, nhưng đủ để chặn phần lớn bot
 * spam từ 1 IP với tần suất cao trong thời gian ngắn, giảm tải cho server thật.
 * Muốn chặn triệt để 100% nên dùng thêm Vercel Firewall (Custom Rules) ở tầng Edge.
 */

const buckets = new Map(); // key: `${ip}:${scope}` -> { count, resetAt }

/**
 * @param {string} ip - địa chỉ IP của client
 * @param {string} scope - tên endpoint (để mỗi endpoint có giới hạn riêng)
 * @param {number} limit - số request tối đa cho phép trong 1 cửa sổ thời gian
 * @param {number} windowMs - độ dài cửa sổ thời gian (ms)
 * @returns {boolean} true nếu ĐƯỢC PHÉP đi tiếp, false nếu đã vượt giới hạn
 */
export function checkRateLimit(ip, scope, limit = 60, windowMs = 60_000) {
  const key = `${scope}:${ip || 'unknown'}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count++;
  if (bucket.count > limit) return false;
  return true;
}

/** Lấy IP thật của client từ header (Vercel luôn gắn sẵn x-forwarded-for) */
export function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'] || req.headers?.get?.('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers?.['x-real-ip'] || req.headers?.get?.('x-real-ip') || 'unknown';
}

// Dọn bucket cũ định kỳ để tránh rò rỉ bộ nhớ khi instance sống lâu
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();
