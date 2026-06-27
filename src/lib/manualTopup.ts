// ─── Nạp thẻ thủ công — Admin duyệt ──────────────────────────────────────────
import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, getDocs, query,
  where, orderBy, updateDoc, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { addUserBalance } from './auth';

export type ManualTopupStatus = 'pending' | 'approved' | 'rejected';

export type CardTelco = 'VIETTEL' | 'MOBIFONE' | 'VINAPHONE' | 'VIETNAMOBILE' | 'GMOBILE';

export interface ManualTopupRequest {
  id: string;
  uid: string;
  username: string;
  telco: CardTelco;
  serial: string;
  code: string;         // mã thẻ (pin)
  amount: number;       // mệnh giá khai báo
  status: ManualTopupStatus;
  note: string;         // ghi chú admin
  createdAt: number;
  updatedAt: number;
}

export const CARD_TELCOS: { value: CardTelco; label: string; color: string }[] = [
  { value: 'VIETTEL',      label: 'Viettel',      color: 'bg-red-500' },
  { value: 'MOBIFONE',     label: 'Mobifone',     color: 'bg-blue-500' },
  { value: 'VINAPHONE',    label: 'Vinaphone',    color: 'bg-yellow-500' },
  { value: 'VIETNAMOBILE', label: 'Vietnamobile', color: 'bg-sky-500' },
  { value: 'GMOBILE',      label: 'Gmobile',      color: 'bg-purple-500' },
];

export const CARD_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000];

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function getStatusInfo(status: ManualTopupStatus) {
  switch (status) {
    case 'pending':  return { label: 'Chờ duyệt',  color: 'text-yellow-400', bg: 'bg-yellow-950/60 border-yellow-500/30' };
    case 'approved': return { label: 'Đã duyệt',   color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/30' };
    case 'rejected': return { label: 'Từ chối',    color: 'text-red-400',    bg: 'bg-red-950/60 border-red-500/30' };
  }
}

// ─── User: Gửi yêu cầu nạp thẻ thủ công ─────────────────────────────────────
export async function submitManualTopup(
  uid: string,
  username: string,
  telco: CardTelco,
  serial: string,
  code: string,
  amount: number,
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  try {
    // Kiểm tra thẻ đã nạp chưa
    const dupSnap = await getDocs(
      query(
        collection(db, 'manual_topup_requests'),
        where('serial', '==', serial.trim()),
        where('code', '==', code.trim()),
      )
    );
    if (!dupSnap.empty) {
      const existing = dupSnap.docs[0].data() as ManualTopupRequest;
      if (existing.status === 'approved') return { ok: false, error: 'Thẻ này đã được nạp thành công trước đó!' };
      if (existing.status === 'pending')  return { ok: false, error: 'Thẻ này đang chờ admin duyệt, vui lòng chờ.' };
    }

    const requestId = `manual_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const data: ManualTopupRequest = {
      id: requestId,
      uid,
      username,
      telco,
      serial: serial.trim(),
      code: code.trim(),
      amount,
      status: 'pending',
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'manual_topup_requests', requestId), data);
    return { ok: true, requestId };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi hệ thống: ' + (err.message || '') };
  }
}

// ─── Admin: Lấy tất cả yêu cầu (realtime) ────────────────────────────────────
export function subscribeManualTopupRequests(
  cb: (requests: ManualTopupRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'manual_topup_requests'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as ManualTopupRequest));
  });
}

// ─── Admin: Duyệt và cộng tiền ───────────────────────────────────────────────
export async function approveManualTopup(
  requestId: string,
  actualAmount: number,
  note: string = '',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = doc(db, 'manual_topup_requests', requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: 'Yêu cầu không tồn tại.' };

    const data = snap.data() as ManualTopupRequest;
    if (data.status !== 'pending') return { ok: false, error: 'Yêu cầu đã được xử lý rồi.' };

    // Cộng tiền cho user
    await addUserBalance(
      data.uid,
      actualAmount,
      `Nạp thẻ ${data.telco} ${formatVND(actualAmount)} — Admin duyệt thủ công`
    );

    // Cập nhật status
    await updateDoc(ref, {
      status: 'approved',
      amount: actualAmount,
      note: note || 'Admin đã duyệt',
      updatedAt: Date.now(),
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Lỗi khi duyệt.' };
  }
}

// ─── Admin: Từ chối ───────────────────────────────────────────────────────────
export async function rejectManualTopup(
  requestId: string,
  note: string = '',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = doc(db, 'manual_topup_requests', requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: 'Yêu cầu không tồn tại.' };

    const data = snap.data() as ManualTopupRequest;
    if (data.status !== 'pending') return { ok: false, error: 'Yêu cầu đã được xử lý rồi.' };

    await updateDoc(ref, {
      status: 'rejected',
      note: note || 'Admin từ chối',
      updatedAt: Date.now(),
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Lỗi khi từ chối.' };
  }
}

// ─── User: Lấy lịch sử nạp thủ công của mình ─────────────────────────────────
export function subscribeUserManualTopup(
  uid: string,
  cb: (requests: ManualTopupRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'manual_topup_requests'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as ManualTopupRequest));
  });
}
