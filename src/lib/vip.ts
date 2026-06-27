// ─── VIP System ───────────────────────────────────────────────────────────────
// 3 gói: UVIP (3 ngày) / SVIP (7 ngày) / SSVIP (30 ngày)
// Mua bằng số dư tài khoản. Admin được miễn QC tự động.
// Config giá được lưu trong Firestore: site_config/vip_prices

import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection,
} from 'firebase/firestore';
import { db } from './firebase';
import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VipTier = 'UVIP' | 'SVIP' | 'SSVIP';

export interface VipPrices {
  UVIP: number;   // giá VNĐ
  SVIP: number;
  SSVIP: number;
}

export const DEFAULT_VIP_PRICES: VipPrices = {
  UVIP:  9000,
  SVIP:  19000,
  SSVIP: 49000,
};

export const VIP_DAYS: Record<VipTier, number> = {
  UVIP:  3,
  SVIP:  7,
  SSVIP: 30,
};

export const VIP_META: Record<VipTier, { label: string; color: string; gradient: string; days: number; icon: string }> = {
  UVIP: {
    label: 'UVIP',
    color: 'text-sky-300',
    gradient: 'from-green-500 to-blue-600',
    days: 3,
    icon: '🔵',
  },
  SVIP: {
    label: 'SVIP',
    color: 'text-violet-300',
    gradient: 'from-violet-500 to-purple-600',
    days: 7,
    icon: '💜',
  },
  SSVIP: {
    label: 'SSVIP',
    color: 'text-amber-300',
    gradient: 'from-amber-400 to-orange-500',
    days: 30,
    icon: '👑',
  },
};

// ─── Firestore helpers ────────────────────────────────────────────────────────

export async function getVipPrices(): Promise<VipPrices> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'vip_prices'));
    return snap.exists() ? (snap.data() as VipPrices) : { ...DEFAULT_VIP_PRICES };
  } catch { return { ...DEFAULT_VIP_PRICES }; }
}

export async function saveVipPrices(prices: VipPrices): Promise<void> {
  await setDoc(doc(db, 'site_config', 'vip_prices'), prices);
}

// Realtime hook giá VIP
export function useVipPrices(): VipPrices {
  const [prices, setPrices] = useState<VipPrices>({ ...DEFAULT_VIP_PRICES });
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'site_config', 'vip_prices'),
      snap => { if (snap.exists()) setPrices(snap.data() as VipPrices); },
      () => {}
    );
    return unsub;
  }, []);
  return prices;
}

// ─── Check VIP còn hạn ───────────────────────────────────────────────────────

export function isVipActive(vipExpiry?: number | null): boolean {
  if (!vipExpiry) return false;
  return Date.now() < vipExpiry;
}

export function getVipTierFromExpiry(
  vipTier?: VipTier | null,
  vipExpiry?: number | null
): VipTier | null {
  if (!isVipActive(vipExpiry)) return null;
  return vipTier || null;
}

export function vipExpiryText(vipExpiry?: number | null): string {
  if (!vipExpiry || Date.now() >= vipExpiry) return 'Hết hạn';
  const diffMs = vipExpiry - Date.now();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor((diffMs % 86400000) / 3600000);
  if (diffDays > 0) return `Còn ${diffDays} ngày ${diffHours} giờ`;
  return `Còn ${diffHours} giờ`;
}

// ─── Mua VIP ─────────────────────────────────────────────────────────────────

export async function purchaseVip(
  uid: string,
  tier: VipTier,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [userSnap, pricesSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'site_config', 'vip_prices')),
    ]);

    if (!userSnap.exists()) return { ok: false, error: 'Không tìm thấy tài khoản!' };
    const user = userSnap.data();
    const prices: VipPrices = pricesSnap.exists()
      ? (pricesSnap.data() as VipPrices)
      : { ...DEFAULT_VIP_PRICES };

    const price = prices[tier];
    const balance = (user.balance as number) || 0;

    if (balance < price) {
      return { ok: false, error: `Số dư không đủ! Cần ${price.toLocaleString('vi-VN')}₫, hiện có ${balance.toLocaleString('vi-VN')}₫` };
    }

    // Tính thời hạn mới (cộng dồn nếu còn VIP)
    const nowMs = Date.now();
    const currentExpiry = (user.vipExpiry as number) || 0;
    const base = Math.max(currentExpiry, nowMs);
    const newExpiry = base + VIP_DAYS[tier] * 86400000;
    const newBalance = balance - price;

    // Update user
    await updateDoc(doc(db, 'users', uid), {
      balance: newBalance,
      vipTier: tier,
      vipExpiry: newExpiry,
    });

    // Ghi giao dịch
    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid,
      type: 'vip_purchase',
      amount: -price,
      balanceBefore: balance,
      balanceAfter: newBalance,
      note: `Mua gói ${tier} (${VIP_DAYS[tier]} ngày)`,
      createdAt: nowMs,
      status: 'success',
      vipTier: tier,
      vipExpiry: newExpiry,
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi hệ thống: ' + (err.message || '') };
  }
}
