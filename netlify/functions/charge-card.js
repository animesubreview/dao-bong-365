// ─── Netlify Function: charge-card.js ────────────────────────────────────────
// POST /.netlify/functions/charge-card
// Nhận thông tin thẻ từ frontend → gọi TrumThe API → trả về kết quả
// 
// Env vars cần thiết (Netlify Dashboard > Environment Variables):
//   TRUMTHE_PARTNER_ID  - Partner ID từ trumthe.vn
//   TRUMTHE_PARTNER_KEY - Partner Key từ trumthe.vn
//   FIREBASE_PROJECT_ID - Firebase project ID
//   FIREBASE_CLIENT_EMAIL - Firebase service account email
//   FIREBASE_PRIVATE_KEY - Firebase service account private key
//   SITE_URL - URL của website (vd: https://kinkin.netlify.app)

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore }                  = require('firebase-admin/firestore');
const axios                             = require('axios');

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

// ─── Handler ─────────────────────────────────────────────────────────────────
export const handler = async (event) => {
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

  // ─── Kiểm tra env vars ─────────────────────────────────────────────────────
  const partnerId  = process.env.TRUMTHE_PARTNER_ID;
  const partnerKey = process.env.TRUMTHE_PARTNER_KEY;
  const siteUrl    = process.env.SITE_URL || `https://${event.headers.host}`;

  if (!partnerId || !partnerKey) {
    console.error('[charge-card] Missing TRUMTHE_PARTNER_ID or TRUMTHE_PARTNER_KEY');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chưa cấu hình API thẻ cào. Liên hệ admin.' }),
    };
  }

  // ─── Gọi TrumThe API ───────────────────────────────────────────────────────
  try {
    const callbackUrl = `${siteUrl}/.netlify/functions/card-callback`;

    const trumtheRes = await axios.post(
      'https://trumthe.vn/chargingws/v2',
      {
        telco,
        code,
        serial,
        amount: String(amount),
        request_id:   requestId,
        partner_id:   partnerId,
        partner_key:  partnerKey,
        callback_url: callbackUrl,
      },
      { timeout: 30000 }
    );

    const result = trumtheRes.data;
    console.log('[charge-card] TrumThe response:', JSON.stringify(result));

    const db = initFirebase();
    const docRef = db.collection('topup_requests').doc(requestId);

    // status: 1=thành công ngay, 2=đang xử lý (callback sau), 3=sai, 99=lỗi
    if (result.status === 1) {
      // Thành công ngay lập tức
      const actualValue = result.value || amount;

      await docRef.update({
        status:      'success',
        actualValue,
        message:     result.message || 'Nạp thẻ thành công',
        updatedAt:   Date.now(),
      });

      // Cộng tiền user
      await creditUserBalance(db, uid, actualValue, requestId);

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'success', value: actualValue }) };
    }

    if (result.status === 2) {
      // Đang xử lý – callback sẽ được gọi sau
      await docRef.update({
        status:    'pending',
        message:   result.message || 'Đang xử lý, kết quả sẽ được cập nhật tự động.',
        updatedAt: Date.now(),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'pending' }) };
    }

    // Thất bại / sai thẻ
    await docRef.update({
      status:    'failed',
      message:   result.message || 'Thẻ không hợp lệ hoặc đã sử dụng.',
      updatedAt: Date.now(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: result.message || 'Thẻ không hợp lệ.' }),
    };
  } catch (err) {
    console.error('[charge-card] Error:', err.message);

    // Cập nhật failed trong Firestore
    try {
      const db = initFirebase();
      await db.collection('topup_requests').doc(requestId).update({
        status:    'failed',
        message:   'Lỗi kết nối API: ' + err.message,
        updatedAt: Date.now(),
      });
    } catch (_) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Lỗi kết nối đến hệ thống nạp thẻ, vui lòng thử lại.' }),
    };
  }
};

// ─── Cộng tiền vào balance user ──────────────────────────────────────────────
async function creditUserBalance(db, uid, amount, requestId) {
  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const current    = (userSnap.data().balance || 0);
  const newBalance = current + amount;

  await userRef.update({ balance: newBalance });

  // Ghi giao dịch
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
