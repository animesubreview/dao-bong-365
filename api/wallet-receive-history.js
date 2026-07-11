// netlify/functions/wallet-receive-history.js
// Hỗ trợ 2 nguồn: gachthefast | doithe1s
const crypto = require('crypto');

async function netlifyHandlerFn(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const provider = body.provider || 'gachthefast';

  if (provider === 'doithe1s') {
    return handleDoithe1s(body);
  }
  return handleGachTheFast(body);
};

// ─── GachTheFast ─────────────────────────────────────────────────────────────
async function handleGachTheFast({ domain, partner_id, partner_key, limit = 100 }) {
  if (!domain || !partner_id || !partner_key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Thiếu domain, partner_id hoặc partner_key' }) };
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const signV1 = crypto.createHash('md5').update(partner_id + partner_key).digest('hex');
  const signV2 = crypto.createHash('md5').update(partner_key + partner_id).digest('hex');
  const endpoints = [`https://${cleanDomain}/client/api/wallet/history-receive`];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const attempts = [];

  for (const apiUrl of endpoints) {
    for (const [signLabel, sign] of [['id+key', signV1], ['key+id', signV2]]) {
      const params = new URLSearchParams({ partner_id, sign, limit: String(limit) });
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal: controller.signal,
        });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}

        attempts.push({ url: apiUrl, sign: signLabel, status: res.status, raw: text.slice(0, 500), json });

        if (json && (json.status === 'success' || json.status === 1 || json.status === '1' || json.code === 1)) {
          clearTimeout(timeoutId);
          return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) };
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          clearTimeout(timeoutId);
          return { statusCode: 500, body: JSON.stringify({ error: `Timeout: ${cleanDomain} không phản hồi trong 8 giây` }) };
        }
        attempts.push({ url: apiUrl, sign: signLabel, error: err.message });
      }
    }
  }

  clearTimeout(timeoutId);
  const lastWithJson = [...attempts].reverse().find(a => a.json);
  if (lastWithJson?.json) {
    const j = lastWithJson.json;
    const msg = j.message || j.msg || j.error || j.description || JSON.stringify(j);
    return { statusCode: 422, body: JSON.stringify({ error: `GachTheFast: "${msg}" (HTTP ${lastWithJson.status}) — sign ${lastWithJson.sign}`, debug: attempts }) };
  }
  return { statusCode: 500, body: JSON.stringify({ error: `Không kết nối được đến ${cleanDomain}`, debug: attempts }) };
}

// ─── DoiThe1s ────────────────────────────────────────────────────────────────
// Tài liệu gốc: https://doithe1s.vn/chargingws/v2?command=charging
// Sign nạp thẻ = md5(partner_key + pin + serial)
// Sign lịch sử = md5(partner_key + partner_id)  hoặc  md5(partner_id + partner_key)
async function handleDoithe1s({ partner_id, partner_key, limit = 100 }) {
  if (!partner_id || !partner_key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Thiếu partner_id hoặc partner_key (DoiThe1s)' }) };
  }

  // Thử cả 2 chiều sign
  const signA = crypto.createHash('md5').update(partner_key + partner_id).digest('hex'); // key+id
  const signB = crypto.createHash('md5').update(partner_id + partner_key).digest('hex'); // id+key

  // Tất cả các biến thể endpoint + command của doithe1s
  const variants = [
    // v2 với command=history (cùng base URL với charging)
    { url: `https://doithe1s.vn/chargingws/v2`, method: 'GET',  extraParams: { command: 'history' }, signLabel: 'key+id', sign: signA },
    { url: `https://doithe1s.vn/chargingws/v2`, method: 'GET',  extraParams: { command: 'history' }, signLabel: 'id+key', sign: signB },
    { url: `https://doithe1s.vn/chargingws/v2`, method: 'POST', extraParams: { command: 'history' }, signLabel: 'key+id', sign: signA },
    { url: `https://doithe1s.vn/chargingws/v2`, method: 'POST', extraParams: { command: 'history' }, signLabel: 'id+key', sign: signB },
    // Endpoint history riêng
    { url: `https://doithe1s.vn/chargingws/history`, method: 'GET',  extraParams: {}, signLabel: 'key+id', sign: signA },
    { url: `https://doithe1s.vn/chargingws/history`, method: 'GET',  extraParams: {}, signLabel: 'id+key', sign: signB },
    { url: `https://doithe1s.vn/chargingws/history`, method: 'POST', extraParams: {}, signLabel: 'key+id', sign: signA },
    { url: `https://doithe1s.vn/chargingws/history`, method: 'POST', extraParams: {}, signLabel: 'id+key', sign: signB },
    // API v1
    { url: `https://doithe1s.vn/chargingws/v1`, method: 'GET',  extraParams: { command: 'history' }, signLabel: 'key+id', sign: signA },
    { url: `https://doithe1s.vn/chargingws/v1`, method: 'GET',  extraParams: { command: 'history' }, signLabel: 'id+key', sign: signB },
    // api.doithe1s.vn (theo ghichu.txt — dùng cho mua thẻ/nạp game)
    { url: `https://api.doithe1s.vn/chargingws/v2`, method: 'GET',  extraParams: { command: 'history' }, signLabel: 'key+id', sign: signA },
    { url: `https://api.doithe1s.vn/chargingws/v2`, method: 'POST', extraParams: { command: 'history' }, signLabel: 'key+id', sign: signA },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  const attempts = [];

  for (const v of variants) {
    const baseParams = { partner_id, sign: v.sign, limit: String(limit), ...v.extraParams };

    try {
      let res;
      if (v.method === 'GET') {
        const qs = new URLSearchParams(baseParams).toString();
        res = await fetch(`${v.url}?${qs}`, { signal: controller.signal });
      } else {
        res = await fetch(v.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(baseParams).toString(),
          signal: controller.signal,
        });
      }

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      attempts.push({ url: v.url, method: v.method, sign: v.signLabel, extra: v.extraParams, status: res.status, raw: text.slice(0, 300), json });

      // Thành công
      if (json && (json.status === 1 || json.status === '1' || json.status === 'success')) {
        clearTimeout(timeoutId);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        clearTimeout(timeoutId);
        return { statusCode: 500, body: JSON.stringify({ error: 'Timeout: doithe1s.vn không phản hồi trong 12 giây' }) };
      }
      attempts.push({ url: v.url, method: v.method, sign: v.signLabel, error: err.message });
    }
  }

  clearTimeout(timeoutId);

  // Trả debug đầy đủ để biết doithe1s nói gì
  const lastWithJson = [...attempts].reverse().find(a => a.json);
  if (lastWithJson?.json) {
    const j = lastWithJson.json;
    const msg = j.message || j.msg || j.error || JSON.stringify(j);
    return {
      statusCode: 422,
      body: JSON.stringify({
        error: `DoiThe1s: "${msg}" (HTTP ${lastWithJson.status}, ${lastWithJson.method} ${lastWithJson.url})`,
        debug: attempts,
      }),
    };
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Không kết nối được đến doithe1s.vn', debug: attempts }),
  };
}

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
