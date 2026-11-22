// Proxy gọi Auraflix REST API. Key nằm ở biến môi trường Vercel, KHÔNG đưa xuống trình duyệt.
//   AURAFLIX_API_KEY  (bắt buộc, dạng mh_live_...)
//   AURAFLIX_API_BASE (tuỳ chọn, mặc định https://auraflixcms.pages.dev/api/v1)
// Gọi: /api/auraflix-movies?page=1&limit=20           -> danh sách phim
//      /api/auraflix-movies?path=movies/<id>           -> chi tiết (nếu API có)
// Chỉ cho phép đường dẫn bắt đầu bằng "movies" để tránh bị lạm dụng.
const BASE = (process.env.AURAFLIX_API_BASE || 'https://auraflixcms.pages.dev/api/v1').replace(/\/+$/, '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key = process.env.AURAFLIX_API_KEY;
  if (!key) { res.status(500).json({ success: false, error: 'Chưa đặt AURAFLIX_API_KEY' }); return; }

  const q = req.query || {};
  const path = String(q.path || 'movies').replace(/^\/+|\/+$/g, '');
  if (!/^movies(\/[A-Za-z0-9_.-]+)*$/.test(path)) { res.status(400).json({ success: false, error: 'path không hợp lệ' }); return; }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (k === 'path') continue;
    if (!/^[A-Za-z0-9_]+$/.test(k)) continue;
    params.set(k, String(Array.isArray(v) ? v[0] : v).slice(0, 200));
  }
  if (path === 'movies' && !params.get('limit')) params.set('limit', '20');
  if (Number(params.get('limit')) > 50) params.set('limit', '50');

  try {
    const r = await fetch(`${BASE}/${path}${params.toString() ? '?' + params : ''}`, {
      headers: { 'X-API-KEY': key, Accept: 'application/json' },
    });
    const text = await r.text();
    // Cache ở CDN 10 phút để đỡ gọi lại và đỡ tốn băng thông.
    if (r.ok) res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.status(r.status).setHeader('Content-Type', 'application/json; charset=utf-8').send(text);
  } catch (e) {
    res.status(502).json({ success: false, error: 'Không gọi được Auraflix: ' + e.message });
  }
}
