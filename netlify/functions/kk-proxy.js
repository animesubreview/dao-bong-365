/**
 * Netlify Function: kk-proxy — proxy API KKPhim phía server (dự phòng khi trình duyệt không gọi thẳng được).
 * GET /.netlify/functions/kk-proxy?path=%2Fv1%2Fapi%2Ftim-kiem%3Fkeyword%3Dabc
 */
export const handler = async (event) => {
  const path = event.queryStringParameters?.path || '';
  if (!/^\/(v1\/api\/|danh-sach\/|phim\/|the-loai|quoc-gia|nam\/)/.test(path) || path.includes('..') || path.startsWith('//')) {
    return { statusCode: 400, body: 'Invalid path' };
  }
  try {
    const res = await fetch(`https://phimapi.com${path}`, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=60' },
      body: await res.text(),
    };
  } catch (err) {
    return { statusCode: 502, body: `Upstream error: ${err.message}` };
  }
};
