// ─── VIP Key System ────────────────────────────────────────────────────────
// Admin tạo key (auto random hoặc gõ tay) → gán gói VIP (UVIP/SVIP/SSVIP) +
// thời hạn tùy chỉnh theo phút/giờ/ngày + số lần sử dụng (1 lần hoặc theo số
// lượng). User nhập key ở trang Mua VIP để cộng dồn thời hạn VIP vào tài khoản.

import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, query, orderBy, onSnapshot, runTransaction, arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { VipTier } from './vip';

const COL = 'vip_keys';

export interface VipKey {
  code: string;              // mã key - cũng là doc id (đã uppercase)
  tier: VipTier;              // gói VIP key này cấp
  durationMinutes: number;    // thời hạn VIP cấp, tính theo phút
  maxUses: number;            // 1 = dùng 1 lần, >1 = theo số lượng
  usedCount: number;
  redeemedBy: string[];       // uid đã đổi (chặn 1 người đổi 1 key nhiều lần)
  active: boolean;
  note?: string;
  createdAt: number;
}

export type DurationUnit = 'minute' | 'hour' | 'day';

export function toMinutes(value: number, unit: DurationUnit): number {
  if (unit === 'minute') return value;
  if (unit === 'hour') return value * 60;
  return value * 60 * 24; // day
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return h > 0 ? `${d} ngày ${h} giờ` : `${d} ngày`;
}

/** Sinh mã key ngẫu nhiên dạng DAOPHIM-XXXX-XXXX */
export function generateKeyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0,O,1,I)
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `DAOPHIM-${seg()}-${seg()}`;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/** Admin tạo key mới (auto hoặc thủ công) */
export async function createVipKey(params: {
  code: string;
  tier: VipTier;
  durationMinutes: number;
  maxUses: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const code = normalizeCode(params.code);
  if (!code) return { ok: false, error: 'Mã key không được để trống!' };
  if (params.durationMinutes <= 0) return { ok: false, error: 'Thời hạn phải lớn hơn 0!' };
  if (params.maxUses <= 0) return { ok: false, error: 'Số lần sử dụng phải lớn hơn 0!' };

  try {
    const ref = doc(db, COL, code);
    const existing = await getDoc(ref);
    if (existing.exists()) return { ok: false, error: 'Mã key này đã tồn tại, vui lòng chọn mã khác!' };

    const key: VipKey = {
      code,
      tier: params.tier,
      durationMinutes: params.durationMinutes,
      maxUses: params.maxUses,
      usedCount: 0,
      redeemedBy: [],
      active: true,
      note: params.note || '',
      createdAt: Date.now(),
    };
    await setDoc(ref, key);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi hệ thống: ' + (err.message || '') };
  }
}

/** Admin bật/tắt key (khóa key mà không cần xóa) */
export async function setVipKeyActive(code: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COL, normalizeCode(code)), { active });
}

/** Admin xóa key */
export async function deleteVipKey(code: string): Promise<void> {
  await deleteDoc(doc(db, COL, normalizeCode(code)));
}

/** Subscribe realtime danh sách key - dùng trong Admin */
export function subscribeVipKeys(cb: (items: VipKey[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as VipKey));
  }, () => cb([]));
}

/**
 * User nhập key để đổi VIP.
 * Dùng transaction để đảm bảo key không bị "vượt" số lần dùng khi nhiều
 * người đổi cùng lúc, và 1 người không đổi trùng 1 key nhiều lần.
 */
export async function redeemVipKey(
  uid: string,
  rawCode: string
): Promise<{ ok: boolean; error?: string; tier?: VipTier; minutesAdded?: number; newExpiry?: number }> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: 'Vui lòng nhập mã key!' };
  if (!uid) return { ok: false, error: 'Bạn cần đăng nhập để nhập key!' };

  const keyRef = doc(db, COL, code);
  const userRef = doc(db, 'users', uid);

  try {
    const result = await runTransaction(db, async (tx) => {
      const keySnap = await tx.get(keyRef);
      if (!keySnap.exists()) throw new Error('Mã key không tồn tại!');
      const key = keySnap.data() as VipKey;

      if (!key.active) throw new Error('Mã key này đã bị khóa hoặc ngừng hoạt động!');
      if (key.usedCount >= key.maxUses) throw new Error('Mã key này đã được sử dụng hết lượt!');
      if ((key.redeemedBy || []).includes(uid)) throw new Error('Bạn đã sử dụng mã key này rồi!');

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('Không tìm thấy tài khoản!');
      const user = userSnap.data();

      const nowMs = Date.now();
      const currentExpiry = (user.vipExpiry as number) || 0;
      const base = Math.max(currentExpiry, nowMs);
      const newExpiry = base + key.durationMinutes * 60000;
      const newUsedCount = key.usedCount + 1;

      tx.update(userRef, {
        vipTier: key.tier,
        vipExpiry: newExpiry,
      });

      tx.update(keyRef, {
        usedCount: newUsedCount,
        redeemedBy: arrayUnion(uid),
        active: newUsedCount < key.maxUses,
      });

      return { tier: key.tier, minutesAdded: key.durationMinutes, newExpiry };
    });

    return { ok: true, ...result };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Lỗi khi đổi key!' };
  }
}
