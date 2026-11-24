/**
 * Proxy API KKPhim phía server — dự phòng khi trình duyệt người dùng không gọi thẳng được phimapi.com
 * (mạng chặn, CORS, DNS...). GET /api/kk-proxy?path=%2Fv1%2Fapi%2Ftim-kiem%3Fkeyword%3Dabc
 */
import { checkRateLimit, getClientIp } from './_rateLimit.js';

const UPSTREAM = 'https://phimapi.com';

async function netlifyHandlerFn(event) {
  const path = event.queryStringParameters?.path || '';
  // Chỉ cho phép đường dẫn API phim, không cho phép trỏ tới host khác (tránh làm open-proxy).
  if (!/^\/(v1\/api\/|danh-sach\/|phim\/|the-loai|quoc-gia|nam\/)/.test(path) || path.includes('..') || path.startsWith('//')) {
    return { statusCode: 400, body: 'Invalid path' };
  }
  const ip = getClientIp(event);
  if (!checkRateLimit(ip, 'kk-proxy', 180, 60_000)) {
    return { statusCode: 429, body: 'Too many requests' };
  }
  try {
    const res = await fetch(`${UPSTREAM}${path}`, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
      body: text,
    };
  } catch (err) {
    return { statusCode: 502, body: `Upstream error: ${err.message}` };
  }
}

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
