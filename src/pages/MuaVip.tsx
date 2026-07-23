import React, { useState, useEffect } from 'react';
import { Crown, CheckCircle2, Loader2, Wallet, Zap, ShieldCheck, KeyRound, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  purchaseVip,
  useVipPrices,
  isVipActive,
  vipExpiryText,
  VIP_META,
  VipTier,
} from '../lib/vip';
import { redeemVipKey } from '../lib/vipKeys';
import { formatVND } from '../lib/topup';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';

export default function MuaVip() {
  const [session, setSession] = useState<UserProfile | null>(null);
  const vipPrices = useVipPrices();
  const [vipLoading, setVipLoading] = useState(false);
  const [vipMsg, setVipMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [purchasedTier, setPurchasedTier] = useState<VipTier | null>(null);

  // Nhập key VIP
  const [keyInput, setKeyInput] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (user) {
        const p = await getUserProfile(user.uid);
        setSession(p);
      } else {
        setSession(null);
      }
    });
    return unsub;
  }, []);

  const handleBuyVip = async (tier: VipTier) => {
    if (!session) return;
    setVipLoading(true);
    setVipMsg(null);
    const result = await purchaseVip(session.uid, tier);
    setVipLoading(false);
    if (result.ok) {
      setPurchasedTier(tier);
      setVipMsg({ text: '🎉 Mua VIP thành công! Đang cập nhật tài khoản...', ok: true });
      const fresh = await getUserProfile(session.uid);
      if (fresh) setSession(fresh);
    } else {
      setVipMsg({ text: result.error || 'Mua thất bại!', ok: false });
    }
  };

  const handleRedeemKey = async () => {
    if (!session) return;
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    setKeyMsg(null);
    const result = await redeemVipKey(session.uid, keyInput.trim());
    setKeyLoading(false);
    if (result.ok) {
      setKeyMsg({ text: `🎉 Đổi key thành công! Đã cộng ${result.tier} vào tài khoản.`, ok: true });
      setKeyInput('');
      const fresh = await getUserProfile(session.uid);
      if (fresh) setSession(fresh);
    } else {
      setKeyMsg({ text: result.error || 'Đổi key thất bại!', ok: false });
    }
  };

  const VIP_FEATURES = [
    { icon: ShieldCheck, label: 'Chặn toàn bộ quảng cáo', color: 'text-green-400' },
    { icon: Zap, label: 'Tốc độ tải nhanh hơn', color: 'text-yellow-400' },
    { icon: Crown, label: 'Badge VIP trên hồ sơ', color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1117]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center">
          <Crown size={16} className="text-amber-400" />
        </div>
        <h1 className="text-base font-black text-white tracking-wide">MUA VIP · CHẶN QC</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 flex flex-col gap-5">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/25 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-lg font-black text-white leading-tight">Nâng cấp VIP</p>
              <p className="text-xs text-amber-300/70">Trải nghiệm xem phim không giới hạn</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {VIP_FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <f.icon size={13} className={f.color} />
                <span className="text-sm text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Số dư + VIP status */}
        {session ? (
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Wallet size={16} className="text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Số dư</p>
                <p className="text-base font-black text-emerald-400">{formatVND(session.balance || 0)}</p>
              </div>
            </div>
            {isVipActive(session.vipExpiry) && session.vipTier ? (
              <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2">
                <Crown size={13} className="text-amber-400" />
                <div>
                  <p className="text-xs font-black text-amber-300">{VIP_META[session.vipTier].label} đang hoạt động</p>
                  <p className="text-[10px] text-amber-400/60">{vipExpiryText(session.vipExpiry)}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Chưa có VIP</div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 text-center">
            <p className="text-slate-400 text-sm mb-3">Đăng nhập để mua VIP và xem số dư</p>
            <Link to="/auth"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-950 text-sm font-black hover:bg-slate-100 transition-colors">
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {/* Nhập Key VIP */}
        {session && (
          <div className="bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-900 border border-violet-500/25 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-500/20 border border-violet-500/40 rounded-xl flex items-center justify-center shrink-0">
                <KeyRound size={15} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Nhập Key VIP</p>
                <p className="text-[11px] text-violet-300/60">Có mã key từ admin? Nhập vào đây để nhận VIP miễn phí</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleRedeemKey()}
                placeholder="Nhập mã key, VD: DAOPHIM-XXXX-XXXX"
                className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60"
              />
              <button
                onClick={handleRedeemKey}
                disabled={keyLoading || !keyInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-all shrink-0"
              >
                {keyLoading ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                {keyLoading ? '...' : 'Đổi Key'}
              </button>
            </div>
            {keyMsg && (
              <div className={`rounded-lg px-3 py-2 text-xs font-bold text-center ${
                keyMsg.ok
                  ? 'bg-green-950/60 border border-green-500/30 text-green-300'
                  : 'bg-red-950/60 border border-red-500/30 text-red-300'
              }`}>
                {keyMsg.text}
              </div>
            )}
          </div>
        )}

        {/* VIP packages */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">Chọn gói VIP</p>

          {(['UVIP', 'SVIP', 'SSVIP'] as VipTier[]).map(tier => {
            const meta = VIP_META[tier];
            const price = vipPrices[tier];
            const canAfford = session ? (session.balance || 0) >= price : false;
            const isActive = session && isVipActive(session.vipExpiry) && session.vipTier === tier;
            const justPurchased = purchasedTier === tier;

            return (
              <div key={tier} className={`bg-gradient-to-r ${meta.gradient} p-[1.5px] rounded-2xl`}>
                <div className="flex items-center gap-4 bg-slate-900/95 rounded-[14px] px-4 py-4">
                  {/* Icon + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{meta.icon}</span>
                      <span className={`text-base font-black ${meta.color}`}>{meta.label}</span>
                      {isActive && (
                        <span className="text-[9px] font-black text-white bg-green-600 px-1.5 py-0.5 rounded-full">ĐANG DÙNG</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{meta.days} ngày · Chặn quảng cáo</p>
                  </div>

                  {/* Price + button */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-white leading-tight">{price.toLocaleString('vi-VN')}₫</p>
                    <button
                      onClick={() => handleBuyVip(tier)}
                      disabled={vipLoading || !session || !canAfford}
                      className={`mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r ${meta.gradient} text-white hover:opacity-90 active:scale-95`}
                    >
                      {vipLoading && purchasedTier === null ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : justPurchased ? (
                        <CheckCircle2 size={12} />
                      ) : null}
                      {!session
                        ? 'Đăng nhập'
                        : !canAfford
                        ? 'Không đủ số dư'
                        : vipLoading
                        ? '...'
                        : 'Mua ngay'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message */}
        {vipMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-bold text-center ${
            vipMsg.ok
              ? 'bg-green-950/60 border border-green-500/30 text-green-300'
              : 'bg-red-950/60 border border-red-500/30 text-red-300'
          }`}>
            {vipMsg.text}
          </div>
        )}

        {/* Nạp tiền CTA */}
        {session && (session.balance || 0) < Math.min(...Object.values(vipPrices)) && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex items-center gap-3">
            <Wallet size={18} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Số dư chưa đủ?</p>
              <p className="text-xs text-slate-500">Nạp thẻ cào để mua VIP</p>
            </div>
            <Link to="/nap-tien"
              className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors">
              Nạp tiền
            </Link>
          </div>
        )}

        {/* Note */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
          💡 VIP tự động gia hạn khi hết hạn nếu bạn mua lại. Thời hạn sẽ được cộng dồn nếu còn VIP hiện tại.
        </div>
      </div>
    </div>
  );
}
