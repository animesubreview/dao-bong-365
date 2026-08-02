// ─── Netlify/Vercel Function: charge-card.js ──────────────────────────────────
// POST .../charge-card
// Nhận thông tin thẻ từ frontend → gọi GachTheFast API (chargingws/v2) → trả kết quả
//
// Env vars cần thiết:
//   GACHTHEFAST_PARTNER_ID   - Partner ID (mục "Thông tin kết nối" trên gachthefast.com)
//   GACHTHEFAST_PARTNER_KEY  - Partner Key
//   GACHTHEFAST_DOMAIN       - (tuỳ chọn) mặc định gachthefast.com
//   FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore }                  = require('firebase-admin/firestore');
const crypto                            = require('crypto');

// ─── Init Firebase Admin (idempotent) ────────────────────────────────────────
function initFirebase() {
  if (getApps().length > 0) return getFirestore();
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return getFirestore();
}

const GACHTHEFAST_DOMAIN = process.env.GACHTHEFAST_DOMAIN || 'gachthefast.com';

// ─── Handler ───────────────────────────────────────────────────────────────
async function netlifyHandlerFn(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { requestId, uid, telco, serial, code, amount } = body;

  if (!requestId || !uid || !telco || !serial || !code || !amount) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu thông tin thẻ' }) };
  }

  // ─── Kiểm tra env vars ─────────────────────────────────────────────────
  const partnerId  = process.env.GACHTHEFAST_PARTNER_ID;
  const partnerKey = process.env.GACHTHEFAST_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    console.error('[charge-card] Thiếu GACHTHEFAST_PARTNER_ID hoặc GACHTHEFAST_PARTNER_KEY');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chưa cấu hình API thẻ cào. Liên hệ admin.' }),
    };
  }

  // Chuẩn hoá tên nhà mạng theo đúng format GachTheFast yêu cầu (viết hoa không dấu)
  const TELCO_MAP = {
    viettel: 'VIETTEL', mobifone: 'MOBIFONE', vinaphone: 'VINAPHONE',
    vietnamobile: 'VIETNAMOBILE', gate: 'GATE', zing: 'ZING', garena: 'GARENA',
  };
  const telcoNorm = TELCO_MAP[String(telco).toLowerCase()] || String(telco).toUpperCase();

  // Chữ ký theo tài liệu chính thức GachTheFast: md5(partner_key + code + serial)
  const sign = crypto.createHash('md5').update(partnerKey + code + serial).digest('hex');

  const params = new URLSearchParams({
    telco: telcoNorm,
    code: String(code),
    serial: String(serial),
    amount: String(amount),
    request_id: String(requestId),
    partner_id: String(partnerId),
    sign,
    command: 'charging',
  });

  const db = initFirebase();
  const docRef = db.collection('topup_requests').doc(String(requestId));

  try {
    const res = await fetch(`https://${GACHTHEFAST_DOMAIN}/chargingws/v2?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    const result = await res.json();
    console.log('[charge-card] GachTheFast response:', JSON.stringify(result));

    // Mã trạng thái GachTheFast: 1=thành công đúng mệnh giá, 2=thành công sai mệnh giá,
    // 3=thẻ lỗi, 4=hệ thống bảo trì, 99=thẻ chờ xử lý (đợi callback), 100=gửi thẻ thất bại
    const status = Number(result.status);

    if (status === 1 || status === 2) {
      // Thành công ngay — cộng đúng theo giá trị GachTheFast xác nhận (đề phòng sai mệnh giá)
      const actualValue = Number(result.value ?? result.card_value ?? amount);

      await docRef.set({
        status:      'success',
        actualValue,
        message:     result.message || (status === 2 ? 'Thẻ đúng nhưng sai mệnh giá khai báo' : 'Nạp thẻ thành công'),
        raw:         result,
        updatedAt:   Date.now(),
      }, { merge: true });

      await creditUserBalance(db, uid, actualValue, requestId);

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'success', value: actualValue }) };
    }

    if (status === 99) {
      // Đang xử lý – callback sẽ được GachTheFast gọi về sau (xem card-callback.js)
      await docRef.set({
        status:    'pending',
        message:   result.message || 'Thẻ đang chờ xử lý, kết quả sẽ được cập nhật tự động.',
        raw:       result,
        updatedAt: Date.now(),
      }, { merge: true });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'pending' }) };
    }

    // status 3 (thẻ lỗi), 4 (bảo trì), 100 (thất bại) hoặc mã lạ khác
    await docRef.set({
      status:    'failed',
      message:   result.message || 'Thẻ không hợp lệ hoặc đã sử dụng.',
      raw:       result,
      updatedAt: Date.now(),
    }, { merge: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: result.message || 'Thẻ không hợp lệ.' }),
    };
  } catch (err) {
    console.error('[charge-card] Lỗi:', err.message);

    try {
      await docRef.set({
        status:    'failed',
        message:   'Lỗi kết nối API: ' + err.message,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (_) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Lỗi kết nối đến hệ thống nạp thẻ, vui lòng thử lại.' }),
    };
  }
}

// ─── Cộng tiền vào balance user ──────────────────────────────────────────────
async function creditUserBalance(db, uid, amount, requestId) {
  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const current    = (userSnap.data().balance || 0);
  const newBalance = current + amount;

  await userRef.update({ balance: newBalance });

  const txRef = db.collection('transactions').doc();
  await txRef.set({
    id:            txRef.id,
    uid,
    type:          'topup_card',
    amount,
    balanceBefore: current,
    balanceAfter:  newBalance,
    note:          `Nạp thẻ cào thành công (${requestId})`,
    requestId,
    createdAt:     Date.now(),
    status:        'success',
  });
}

export const handler = netlifyHandlerFn;
