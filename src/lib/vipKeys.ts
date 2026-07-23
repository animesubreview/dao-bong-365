// ─── VIP Key System ────────────────────────────────────────────────────────────
// Admin tạo mã Key (thủ công hoặc tự động hàng loạt) với thời hạn tuỳ chỉnh
// (phút / giờ / ngày) → gửi cho member → member nhập mã tại trang VIP để
// nhận thời hạn VIP + Chặn QC tương ứng, cộng dồn với VIP hiện có (nếu còn).
//
// Lưu trên Firestore, collection "vip_keys", doc id = chính mã code (viết hoa)
// để tra cứu tức thời (getDoc theo id) khi redeem, tránh phải query.

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot, query, orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { useEffect, useState } from 'react';

export type DurationUnit = 'minute' | 'hour' | 'day';

export const DURATION_UNIT_LABEL: Record<DurationUnit, string> = {
  minute: 'Phút',
  hour: 'Giờ',
  day: 'Ngày',
};

export const DURATION_UNIT_MS: Record<DurationUnit, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

export interface VipKey {
  code: string;
  durationMs: number;
  note?: string;
  createdBy: 'auto' | 'manual';
  createdAt: number;
  used: boolean;
  usedBy?: string;
  usedByName?: string;
  usedAt?: number;
}

// ─── Sinh mã ngẫu nhiên dạng XXXX-XXXX-XXXX (dễ đọc, tránh nhầm 0/O, 1/I) ─────
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  const group = () =>
    Array.from({ length: 4 }, () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]).join('');
  return `${group()}-${group()}-${group()}`;
}

// ─── Tạo 1 key thủ công ───────────────────────────────────────────────────────
export async function createVipKey(
  value: number,
  unit: DurationUnit,
  note?: string
): Promise<VipKey> {
  const code = generateCode();
  const key: VipKey = {
    code,
    durationMs: value * DURATION_UNIT_MS[unit],
    note: note || '',
    createdBy: 'manual',
    createdAt: Date.now(),
    used: false,
  };
  await setDoc(doc(db, 'vip_keys', code), key);
  return key;
}

// ─── Tạo nhiều key cùng lúc (tự động hàng loạt) ──────────────────────────────
export async function createVipKeysBatch(
  count: number,
  value: number,
  unit: DurationUnit,
  note?: string
): Promise<VipKey[]> {
  const batch = writeBatch(db);
  const keys: VipKey[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let code = generateCode();
    while (usedCodes.has(code)) code = generateCode(); // tránh trùng trong cùng lô
    usedCodes.add(code);

    const key: VipKey = {
      code,
      durationMs: value * DURATION_UNIT_MS[unit],
      note: note || '',
      createdBy: 'auto',
      createdAt: Date.now(),
      used: false,
    };
    keys.push(key);
    batch.set(doc(db, 'vip_keys', code), key);
  }

  await batch.commit();
  return keys;
}

export async function deleteVipKey(code: string): Promise<void> {
  await deleteDoc(doc(db, 'vip_keys', code));
}

// ─── Lắng nghe real-time danh sách key (dùng cho Admin) ──────────────────────
export function subscribeVipKeys(callback: (keys: VipKey[]) => void): () => void {
  const q = query(collection(db, 'vip_keys'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as VipKey));
  }, () => callback([]));
}

// ─── Đổi mã nhận VIP ──────────────────────────────────────────────────────────
export async function redeemVipKey(
  rawCode: string,
  uid: string
): Promise<{ ok: boolean; error?: string; durationMs?: number }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Vui lòng nhập mã!' };

  try {
    const keySnap = await getDoc(doc(db, 'vip_keys', code));
    if (!keySnap.exists()) return { ok: false, error: 'Mã không tồn tại hoặc đã bị xoá!' };

    const key = keySnap.data() as VipKey;
    if (key.used) return { ok: false, error: `Mã này đã được sử dụng${key.usedAt ? ' lúc ' + new Date(key.usedAt).toLocaleString('vi-VN') : ''}!` };

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { ok: false, error: 'Không tìm thấy tài khoản!' };

    const user = userSnap.data();
    const nowMs = Date.now();
    const currentExpiry = (user.vipExpiry as number) || 0;
    const base = Math.max(currentExpiry, nowMs);
    const newExpiry = base + key.durationMs;

    // Đánh dấu key đã dùng
    await updateDoc(doc(db, 'vip_keys', code), {
      used: true,
      usedBy: uid,
      usedByName: user.username || '',
      usedAt: nowMs,
    });

    // Cộng thời hạn VIP cho user (giữ nguyên tier cũ nếu có, mặc định SSVIP nếu chưa từng có VIP)
    await updateDoc(userRef, {
      vipExpiry: newExpiry,
      vipTier: user.vipTier || 'SSVIP',
    });

    // Ghi lịch sử giao dịch
    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid,
      type: 'vip_key_redeem',
      amount: 0,
      note: `Đổi mã VIP: ${code}`,
      createdAt: nowMs,
      status: 'success',
      vipExpiry: newExpiry,
    });

    return { ok: true, durationMs: key.durationMs };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi hệ thống: ' + (err.message || '') };
  }
}

// ─── Format thời hạn dễ đọc (VD: "3 ngày", "12 giờ", "45 phút") ──────────────
export function formatDuration(ms: number): string {
  const days = ms / DURATION_UNIT_MS.day;
  if (days >= 1 && Number.isInteger(days)) return `${days} ngày`;
  const hours = ms / DURATION_UNIT_MS.hour;
  if (hours >= 1 && Number.isInteger(hours)) return `${hours} giờ`;
  const minutes = ms / DURATION_UNIT_MS.minute;
  return `${minutes} phút`;
}
