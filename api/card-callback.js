// ─── Netlify Function: card-callback.js ──────────────────────────────────────
// POST /.netlify/functions/card-callback
// TrumThe API gọi về URL này sau khi xử lý thẻ xong
//
// Đây là Callback URL bạn điền vào TrumThe Dashboard:
//   https://YOUR-SITE.netlify.app/.netlify/functions/card-callback
//
// Env vars cần thiết:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   TRUMTHE_PARTNER_KEY - dùng để verify chữ ký callback

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore }                  = require('firebase-admin/firestore');
const crypto                            = require('crypto');

// ─── Init Firebase Admin ──────────────────────────────────────────────────────
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
async function netlifyHandlerFn(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // TrumThe gửi POST với form-urlencoded hoặc JSON
  let params = {};
  try {
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      params = JSON.parse(event.body || '{}');
    } else {
      // form-urlencoded
      const qs = new URLSearchParams(event.body || '');
      qs.forEach((v, k) => { params[k] = v; });
    }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ code: -1, message: 'Invalid body' }) };
  }

  console.log('[card-callback] Received:', JSON.stringify(params));

  const {
    request_id,
    status,      // 1=success, 2=pending, 3=wrong, 99=error
    value,       // giá trị thực tế
    message,
    sign,        // chữ ký MD5 từ TrumThe
  } = params;

  if (!request_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ code: -1, message: 'Missing request_id' }) };
  }

  // ─── Verify signature (nếu có TRUMTHE_PARTNER_KEY) ────────────────────────
  const partnerKey = process.env.TRUMTHE_PARTNER_KEY;
  if (partnerKey && sign) {
    // TrumThe sign = MD5(partner_key + request_id + status + value)
    const expected = crypto
      .createHash('md5')
      .update(`${partnerKey}${request_id}${status}${value || ''}`)
      .digest('hex');
    if (expected !== sign) {
      console.warn('[card-callback] Invalid signature!', { expected, received: sign });
      return { statusCode: 403, headers, body: JSON.stringify({ code: -1, message: 'Invalid signature' }) };
    }
  }

  try {
    const db     = initFirebase();
    const docRef = db.collection('topup_requests').doc(request_id);
    const snap   = await docRef.get();

    if (!snap.exists) {
      console.warn('[card-callback] Request not found:', request_id);
      return { statusCode: 404, headers, body: JSON.stringify({ code: -1, message: 'Request not found' }) };
    }

    const topup = snap.data();

    // Tránh xử lý trùng lặp
    if (topup.status === 'success') {
      return { statusCode: 200, headers, body: JSON.stringify({ code: 1, message: 'Already processed' }) };
    }

    const numStatus   = parseInt(String(status), 10);
    const actualValue = parseInt(String(value || 0), 10);

    if (numStatus === 1) {
      // ─── Thành công ──────────────────────────────────────────────────────
      await docRef.update({
        status:      'success',
        actualValue,
        message:     message || 'Nạp thẻ thành công',
        updatedAt:   Date.now(),
      });

      // Cộng tiền user
      await creditUserBalance(db, topup.uid, actualValue, request_id);

      console.log(`[card-callback] ✅ Success: uid=${topup.uid}, value=${actualValue}`);
    } else if (numStatus === 3) {
      // ─── Sai mệnh giá (vẫn xử lý nhưng ghi lại) ─────────────────────────
      // TrumThe vẫn cộng giá trị thực, nhưng ít hơn mệnh giá khai báo
      if (actualValue > 0) {
        await docRef.update({
          status:      'wrong_value',
          actualValue,
          message:     message || `Sai mệnh giá: nhận được ${actualValue.toLocaleString('vi-VN')}đ`,
          updatedAt:   Date.now(),
        });
        await creditUserBalance(db, topup.uid, actualValue, request_id);
        console.log(`[card-callback] ⚠️ Wrong value: declared=${topup.amount}, actual=${actualValue}`);
      } else {
        await docRef.update({
          status:    'failed',
          message:   message || 'Thẻ không hợp lệ hoặc sai mệnh giá.',
          updatedAt: Date.now(),
        });
      }
    } else {
      // ─── Thất bại / lỗi ──────────────────────────────────────────────────
      await docRef.update({
        status:    'failed',
        message:   message || 'Nạp thẻ thất bại.',
        updatedAt: Date.now(),
      });
      console.log(`[card-callback] ❌ Failed: ${message}`);
    }

    // TrumThe yêu cầu trả về { code: 1 } khi nhận được callback thành công
    return { statusCode: 200, headers, body: JSON.stringify({ code: 1, message: 'OK' }) };
  } catch (err) {
    console.error('[card-callback] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ code: -1, message: err.message }) };
  }
};

// ─── Cộng tiền vào balance user ──────────────────────────────────────────────
async function creditUserBalance(db, uid, amount, requestId) {
  if (!uid || amount <= 0) return;

  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) { console.warn('User not found:', uid); return; }

  const current    = userSnap.data().balance || 0;
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
    note:          `Nạp thẻ cào thành công (callback)`,
    requestId,
    createdAt:     Date.now(),
    status:        'success',
  });

  console.log(`[creditUserBalance] uid=${uid}, +${amount}, newBalance=${newBalance}`);
}

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
