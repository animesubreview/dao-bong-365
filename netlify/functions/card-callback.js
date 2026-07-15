// ─── Netlify/Vercel Function: card-callback.js ────────────────────────────────
// GachTheFast gọi về URL này sau khi xử lý thẻ xong (GET hoặc POST tuỳ cấu hình)
//
// Đây là Callback URL điền vào GachTheFast Dashboard (mục "Thông tin kết nối"):
//   https://daophim.online/api/card-callback
//
// Env vars cần thiết:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   GACHTHEFAST_PARTNER_KEY - dùng để verify chữ ký callback

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

// ─── Handler ───────────────────────────────────────────────────────────────
async function netlifyHandlerFn(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Đọc dữ liệu dù GachTheFast gửi kiểu GET (query string) hay POST (json body)
  let params = {};
  try {
    if (event.queryStringParameters) {
      Object.assign(params, event.queryStringParameters);
    }
    if (event.body) {
      const ct = event.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        Object.assign(params, JSON.parse(event.body));
      } else {
        const qs = new URLSearchParams(event.body);
        qs.forEach((v, k) => { params[k] = v; });
      }
    }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ code: -1, message: 'Invalid body' }) };
  }

  console.log('[card-callback] Nhận được:', JSON.stringify(params));

  // Đúng tên field theo tài liệu GachTheFast
  const {
    request_id,
    status,          // 1=đúng mệnh giá, 2=sai mệnh giá(vẫn thành công), 3=lỗi, 4=bảo trì, 99=chờ xử lý, 100=thất bại
    message,
    declared_value,  // mệnh giá khai báo
    card_value,       // mệnh giá thực của thẻ
    value,            // mệnh giá tính tiền
    amount,           // số tiền GachTheFast trả về ví đối tác (không phải số cộng cho user)
    code,
    serial,
    telco,
    trans_id,
    callback_sign,
  } = params;

  if (!request_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ code: -1, message: 'Missing request_id' }) };
  }

  // ─── Verify chữ ký: md5(partner_key + code + serial) ───────────────────
  const partnerKey = process.env.GACHTHEFAST_PARTNER_KEY;
  if (partnerKey && callback_sign) {
    const expected = crypto
      .createHash('md5')
      .update(`${partnerKey}${code || ''}${serial || ''}`)
      .digest('hex');
    if (expected !== callback_sign) {
      console.warn('[card-callback] Sai chữ ký!', { expected, received: callback_sign });
      return { statusCode: 403, headers, body: JSON.stringify({ code: -1, message: 'Invalid signature' }) };
    }
  }

  try {
    const db     = initFirebase();
    const docRef = db.collection('topup_requests').doc(String(request_id));
    const snap   = await docRef.get();

    if (!snap.exists) {
      console.warn('[card-callback] Không tìm thấy request:', request_id);
      return { statusCode: 404, headers, body: JSON.stringify({ code: -1, message: 'Request not found' }) };
    }

    const topup = snap.data();

    // Tránh xử lý trùng lặp (GachTheFast có thể gọi lại callback nhiều lần)
    if (topup.status === 'success') {
      return { statusCode: 200, headers, body: JSON.stringify({ code: 1, message: 'Already processed' }) };
    }

    const numStatus   = parseInt(String(status), 10);
    const actualValue = parseInt(String(value ?? card_value ?? 0), 10);

    if (numStatus === 1 || numStatus === 2) {
      // ─── Thành công (đúng hoặc sai mệnh giá — luôn cộng theo actualValue) ──
      await docRef.update({
        status:      'success',
        actualValue,
        message:     message || (numStatus === 2 ? 'Thẻ đúng nhưng sai mệnh giá khai báo' : 'Nạp thẻ thành công'),
        transId:     trans_id || null,
        raw:         params,
        updatedAt:   Date.now(),
      });

      await creditUserBalance(db, topup.uid, actualValue, request_id);

      console.log(`[card-callback] ✅ Thành công: uid=${topup.uid}, value=${actualValue}`);
    } else {
      // ─── status 3 (thẻ lỗi), 4 (bảo trì), 100 (thất bại) hoặc mã lạ ────────
      await docRef.update({
        status:    'failed',
        message:   message || 'Nạp thẻ thất bại.',
        raw:       params,
        updatedAt: Date.now(),
      });
      console.log(`[card-callback] ❌ Thất bại: ${message}`);
    }

    // GachTheFast yêu cầu trả về { code: 1 } khi nhận callback thành công
    return { statusCode: 200, headers, body: JSON.stringify({ code: 1, message: 'OK' }) };
  } catch (err) {
    console.error('[card-callback] Lỗi:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ code: -1, message: err.message }) };
  }
}

// ─── Cộng tiền vào balance user ──────────────────────────────────────────────
async function creditUserBalance(db, uid, amount, requestId) {
  if (!uid || amount <= 0) return;

  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) { console.warn('Không tìm thấy user:', uid); return; }

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
    note:          `Nạp thẻ cào thành công (${requestId})`,
    requestId,
    createdAt:     Date.now(),
    status:        'success',
  });
}

export const handler = netlifyHandlerFn;
