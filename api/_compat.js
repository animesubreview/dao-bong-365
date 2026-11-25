/**
 * Lớp tương thích: chuyển 1 hàm viết theo chuẩn Netlify Functions
 * (async (event) => ({statusCode, headers, body})) thành handler chuẩn Vercel (req, res).
 * Nhờ vậy không cần viết lại logic bên trong từng function khi chuyển từ Netlify sang Vercel.
 */
export function wrapNetlifyHandler(netlifyFn) {
  return async function (req, res) {
    // CORS: cho phép web chạy trên hosting khác domain (hosting tĩnh) gọi các hàm này.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Notify-Secret');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    const event = {
      httpMethod: req.method,
      headers: req.headers,
      queryStringParameters: req.query || {},
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    };
    try {
      const result = await netlifyFn(event);
      const statusCode = result?.statusCode || 200;
      res.status(statusCode);
      if (result?.headers) {
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      }
      res.send(result?.body ?? '');
    } catch (err) {
      res.status(500).send(`Function error: ${err.message}`);
    }
  };
}
