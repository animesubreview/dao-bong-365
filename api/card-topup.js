// netlify/functions/card-topup.js
// Gửi thẻ cào lên nappay.vn để xử lý
// sign = md5(partner_key + pin + serial)
const crypto = require('crypto');

async function netlifyHandlerFn(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { partner_id, partner_key, telco, amount, serial, pin, request_id } = body;

  if (!partner_id || !partner_key || !telco || !amount || !serial || !pin || !request_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Thiếu thông tin bắt buộc' }) };
  }

  const sign = crypto.createHash('md5').update(partner_key + pin + serial).digest('hex');
  const url = `https://nappay.vn/chargingws/v2`
    + `?sign=${sign}`
    + `&telco=${encodeURIComponent(telco)}`
    + `&code=${encodeURIComponent(pin)}`
    + `&serial=${encodeURIComponent(serial)}`
    + `&amount=${encodeURIComponent(amount)}`
    + `&request_id=${encodeURIComponent(request_id)}`
    + `&partner_id=${encodeURIComponent(partner_id)}`
    + `&command=charging`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!json) {
      return { statusCode: 502, body: JSON.stringify({ error: 'nappay.vn trả về dữ liệu không hợp lệ', raw: text.slice(0, 300) }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Timeout: nappay.vn không phản hồi trong 10 giây' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Lỗi kết nối: ' + err.message }) };
  }
};

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
