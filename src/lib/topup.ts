// ─── Dịch vụ nạp thẻ cào (TrumThe v2 API) ────────────────────────────────────
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, onSnapshot } from 'firebase/firestore';

export type CardTelco = 'VIETTEL' | 'MOBIFONE' | 'VINAPHONE' | 'VIETNAMOBILE' | 'GMOBILE';

export type TopupStatus = 'pending' | 'success' | 'failed' | 'wrong_value';

export interface TopupRequest {
  id: string;
  uid: string;
  telco: CardTelco;
  serial: string;
  code: string;
  amount: number;        // mệnh giá khai báo
  actualValue: number;   // giá trị thực tế nhận được
  status: TopupStatus;
  message: string;
  createdAt: number;
  updatedAt: number;
}

export const CARD_TELCOS: { value: CardTelco; label: string; color: string }[] = [
  { value: 'VIETTEL',      label: 'Viettel',      color: 'bg-red-500' },
  { value: 'MOBIFONE',     label: 'Mobifone',     color: 'bg-blue-500' },
  { value: 'VINAPHONE',    label: 'Vinaphone',    color: 'bg-yellow-500' },
  { value: 'VIETNAMOBILE', label: 'Vietnamobile', color: 'bg-green-500' },
  { value: 'GMOBILE',      label: 'Gmobile',      color: 'bg-purple-500' },
];

export const CARD_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

// ─── Gửi yêu cầu nạp thẻ ─────────────────────────────────────────────────────
export async function submitCardTopup(
  uid: string,
  telco: CardTelco,
  serial: string,
  code: string,
  amount: number
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  try {
    // Kiểm tra thẻ đã nạp chưa (chống spam)
    const dupSnap = await getDocs(
      query(
        collection(db, 'topup_requests'),
        where('serial', '==', serial.trim()),
        where('code', '==', code.trim())
      )
    );
    if (!dupSnap.empty) {
      const existing = dupSnap.docs[0].data() as TopupRequest;
      if (existing.status === 'success') return { ok: false, error: 'Thẻ này đã được nạp thành công trước đó!' };
      if (existing.status === 'pending') return { ok: false, error: 'Thẻ này đang được xử lý, vui lòng chờ.' };
    }

    // Tạo request ID duy nhất — dạng số (đúng theo ví dụ tài liệu GachTheFast)
    const requestId = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

    // Lưu vào Firestore với status pending
    const topupRef = doc(db, 'topup_requests', requestId);
    const topupData: TopupRequest = {
      id: requestId,
      uid,
      telco,
      serial: serial.trim(),
      code: code.trim(),
      amount,
      actualValue: 0,
      status: 'pending',
      message: 'Đang xử lý...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(topupRef, topupData);

    // Gọi API để charge card (Vercel serverless function)
    const res = await fetch('/api/charge-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, uid, telco, serial: serial.trim(), code: code.trim(), amount }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error || 'Lỗi kết nối, vui lòng thử lại.' };
    }

    return { ok: true, requestId };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi hệ thống: ' + (err.message || '') };
  }
}

// ─── Lấy lịch sử nạp thẻ của user ───────────────────────────────────────────
export async function getUserTopupHistory(uid: string): Promise<TopupRequest[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'topup_requests'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map(d => d.data() as TopupRequest);
  } catch { return []; }
}

// ─── Lấy 1 request theo ID ───────────────────────────────────────────────────
export async function getTopupRequest(requestId: string): Promise<TopupRequest | null> {
  try {
    const snap = await getDoc(doc(db, 'topup_requests', requestId));
    return snap.exists() ? (snap.data() as TopupRequest) : null;
  } catch { return null; }
}

// ─── Lắng nghe real-time lịch sử nạp thẻ (tự cập nhật khi pending → success) ──
export function subscribeUserTopupHistory(uid: string, callback: (list: TopupRequest[]) => void) {
  const q = query(
    collection(db, 'topup_requests'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as TopupRequest));
  }, () => callback([]));
}

// ─── Format tiền VNĐ ─────────────────────────────────────────────────────────
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// ─── Màu status ──────────────────────────────────────────────────────────────
export function getStatusInfo(status: TopupStatus) {
  switch (status) {
    case 'success':     return { label: 'Thành công',    color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/30' };
    case 'pending':     return { label: 'Đang xử lý',   color: 'text-green-400',   bg: 'bg-green-950/60 border-green-600/30' };
    case 'failed':      return { label: 'Thất bại',      color: 'text-red-400',     bg: 'bg-red-950/60 border-red-500/30' };
    case 'wrong_value': return { label: 'Sai mệnh giá',  color: 'text-orange-400',  bg: 'bg-orange-950/60 border-orange-500/30' };
  }
}
