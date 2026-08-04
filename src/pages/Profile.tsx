import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Camera, Upload, Check, AlertCircle, ArrowLeft,
  Pencil, X, Loader2, ImagePlus, Shuffle, Save,
  Wallet, CreditCard, RefreshCw, ChevronDown, Clock, History, Crown, ShieldCheck, Zap,
} from 'lucide-react';
import { onAuthChange, getUserProfile, updateUserProfile, UserProfile } from '../lib/auth';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatVND } from '../lib/topup';
import {
  purchaseVip, useVipPrices, isVipActive, vipExpiryText, VIP_META, VipTier,
} from '../lib/vip';

// ─── Preset DiceBear avatars ──────────────────────────────────────────────────
const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Mochi', 'Zara', 'Kira',
  'Leo', 'Nova', 'Sage', 'Echo', 'Pixel',
  'Blaze', 'Nyx', 'Comet', 'Drift', 'Storm',
  'Luna', 'Ace', 'Zion', 'Ivy', 'Rex',
];

function getDicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

function AvatarPickerModal({
  currentAvatar,
  onSelect,
  onClose,
}: {
  currentAvatar: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // ─── Fix EXIF: dùng createImageBitmap để strip orientation hoàn toàn ─────────
  const normalizeImage = (file: File): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const MAX = 512;

        // createImageBitmap với imageOrientation:'none' = ignore EXIF hoàn toàn
        // nhưng ta cần biết orientation để vẽ đúng → đọc EXIF thủ công
        const arrayBuf = await file.arrayBuffer();
        let orientation = 1;
        try {
          const view = new DataView(arrayBuf);
          if (view.getUint16(0, false) === 0xFFD8) {
            let offset = 2;
            while (offset < view.byteLength - 2) {
              const marker = view.getUint16(offset, false);
              offset += 2;
              if (marker === 0xFFE1) {
                offset += 2; // skip length
                if (view.getUint32(offset, false) === 0x45786966) { // "Exif"
                  offset += 6;
                  const little = view.getUint16(offset, false) === 0x4949;
                  const ifdOffset = offset + view.getUint32(offset + 4, little);
                  const tags = view.getUint16(ifdOffset, little);
                  for (let i = 0; i < tags; i++) {
                    const tag = view.getUint16(ifdOffset + 2 + i * 12, little);
                    if (tag === 0x0112) {
                      orientation = view.getUint16(ifdOffset + 2 + i * 12 + 8, little);
                      break;
                    }
                  }
                }
                break;
              } else if ((marker & 0xFF00) !== 0xFF00) break;
              else { const len = view.getUint16(offset, false); offset += len; }
            }
          }
        } catch (_) {}

        // Tạo bitmap với imageOrientation:'none' = raw pixels, không apply EXIF
        const blob0 = new Blob([arrayBuf], { type: file.type });
        const bitmap = await createImageBitmap(blob0, { imageOrientation: 'none' });

        const rawW = bitmap.width;
        const rawH = bitmap.height;

        // Với orientation 5-8, width/height bị swap
        const swapped = [5, 6, 7, 8].includes(orientation);
        const srcW = swapped ? rawH : rawW;
        const srcH = swapped ? rawW : rawH;
        const scale = Math.min(MAX / srcW, MAX / srcH, 1);
        const dstW = Math.round(srcW * scale);
        const dstH = Math.round(srcH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = dstW;
        canvas.height = dstH;
        const ctx = canvas.getContext('2d')!;

        ctx.save();
        // Apply transform ngược lại để cancel EXIF orientation
        switch (orientation) {
          case 1: break;
          case 2: ctx.translate(dstW, 0); ctx.scale(-1, 1); break;
          case 3: ctx.translate(dstW, dstH); ctx.rotate(Math.PI); break;
          case 4: ctx.translate(0, dstH); ctx.scale(1, -1); break;
          case 5: ctx.rotate(Math.PI / 2); ctx.scale(1, -1); break;
          case 6: ctx.translate(dstW, 0); ctx.rotate(Math.PI / 2); break;
          case 7: ctx.translate(dstW, dstH); ctx.rotate(Math.PI / 2); ctx.scale(1, -1); break;
          case 8: ctx.translate(0, dstH); ctx.rotate(-Math.PI / 2); break;
        }

        if (swapped) ctx.drawImage(bitmap, 0, 0, rawW, rawH, 0, 0, dstH, dstW);
        else ctx.drawImage(bitmap, 0, 0, rawW, rawH, 0, 0, dstW, dstH);
        ctx.restore();
        bitmap.close();

        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('toBlob failed')),
          'image/jpeg', 0.88
        );
      } catch (err) { reject(err); }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Chỉ hỗ trợ file ảnh'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('Ảnh tối đa 10MB'); return; }

    setUploadError('');
    setUploading(true);
    try {
      const normalizedBlob = await normalizeImage(file);
      const storageRef = ref(storage, `avatars/${Date.now()}.jpg`);
      const snap = await uploadBytes(storageRef, normalizedBlob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(snap.ref);
      onSelect(url);
    } catch (err: any) {
      setUploadError('Upload thất bại, thử lại nhé');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-base font-black text-white">Chọn ảnh đại diện</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Upload from device */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tải ảnh từ thiết bị</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-800/80 border-2 border-dashed border-slate-600 hover:border-green-500/60 rounded-2xl py-4 text-sm font-bold text-slate-300 hover:text-green-400 transition-all disabled:opacity-60"
            >
              {uploading ? (
                <><Loader2 size={18} className="animate-spin text-green-400" /> Đang tải lên...</>
              ) : (
                <><Upload size={18} /> Chọn ảnh từ máy (tối đa 5MB)</>
              )}
            </button>
            {uploadError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                <AlertCircle size={13} /> {uploadError}
              </p>
            )}
          </div>

          {/* Preset avatars */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hoặc chọn avatar có sẵn</p>
            <div className="grid grid-cols-5 gap-2.5 max-h-52 overflow-y-auto pr-1">
              {AVATAR_SEEDS.map(seed => {
                const url = getDicebearUrl(seed);
                const isActive = currentAvatar === url;
                return (
                  <button
                    key={seed}
                    onClick={() => onSelect(url)}
                    className={`relative rounded-xl overflow-hidden aspect-square transition-all ${
                      isActive
                        ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-slate-900 scale-95'
                        : 'hover:scale-105 hover:ring-2 hover:ring-slate-500 ring-offset-2 ring-offset-slate-900'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-full h-full object-cover bg-slate-800" />
                    {isActive && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <Check size={14} className="text-green-400" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  useSEO({ noIndex: true });
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [username, setUsername] = useState('');
  const [pendingAvatar, setPendingAvatar] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // VIP
  const vipPrices = useVipPrices();
  const [vipLoading, setVipLoading] = useState(false);
  const [vipMsg, setVipMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showVipShop, setShowVipShop] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { navigate('/auth', { replace: true }); return; }
      const p = await getUserProfile(user.uid);
      if (p) {
        setProfile(p);
        setUsername(p.username);
        setPendingAvatar(p.avatar);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const hasChanges =
    profile &&
    (username.trim() !== profile.username || pendingAvatar !== profile.avatar);

  const handleSave = async () => {
    if (!profile || !hasChanges) return;
    setError('');
    setSuccess('');
    setSaving(true);

    const updates: { username?: string; avatar?: string } = {};
    if (username.trim() !== profile.username) updates.username = username.trim();
    if (pendingAvatar !== profile.avatar) updates.avatar = pendingAvatar;

    const result = await updateUserProfile(profile.uid, updates);
    setSaving(false);

    if (result.ok) {
      setSuccess('Cập nhật thành công! 🎉');
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      setEditingUsername(false);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Cập nhật thất bại');
    }
  };

  const handleDiscard = () => {
    if (!profile) return;
    setUsername(profile.username);
    setPendingAvatar(profile.avatar);
    setEditingUsername(false);
    setError('');
  };

  const handleBuyVip = async (tier: VipTier) => {
    if (!profile) return;
    setVipLoading(true);
    setVipMsg(null);
    const result = await purchaseVip(profile.uid, tier);
    if (result.ok) {
      const fresh = await getUserProfile(profile.uid);
      if (fresh) setProfile(fresh);
      setVipMsg({ text: `🎉 Mua ${tier} thành công! QC đã được tắt.`, ok: true });
    } else {
      setVipMsg({ text: result.error || 'Mua thất bại!', ok: false });
    }
    setVipLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-24 left-1/3 w-80 h-80 bg-green-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-1/4 w-72 h-72 bg-indigo-600/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Back */}
        <Link to="/profile" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Về Tài khoản
        </Link>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">

          {/* Header gradient bar */}
          <div className="h-20 bg-gradient-to-r from-green-500/20 via-green-500/10 to-indigo-600/10 relative">
            <div className="absolute inset-0 bg-slate-900/40" />
          </div>

          {/* Avatar overlapping the gradient */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl ring-4 ring-slate-900 overflow-hidden bg-slate-800">
                  <img
                    src={pendingAvatar}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-green-500 hover:bg-green-400 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-green-500/30 active:scale-95"
                >
                  <Camera size={13} className="text-slate-950" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 min-w-0 pt-10">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{profile.role === 'admin' ? '⚡ Admin' : 'Thành viên'}</p>
                <p className="text-base font-black text-white truncate">{profile.username}</p>
                <p className="text-xs text-slate-500 truncate">{profile.email}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800/60 mb-5" />

            <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <User size={15} className="text-green-400" />
              Chỉnh sửa hồ sơ
            </h2>

            {/* Username field */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Tên hiển thị
              </label>
              {editingUsername ? (
                <div className="relative">
                  <input
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    maxLength={30}
                    className="w-full bg-slate-800/80 border border-green-500/40 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all pr-10"
                    placeholder="Nhập tên hiển thị..."
                  />
                  <button
                    onClick={() => { setUsername(profile.username); setEditingUsername(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingUsername(true)}
                  className="w-full flex items-center justify-between bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 rounded-xl py-3 px-4 text-sm text-white transition-all group"
                >
                  <span>{username}</span>
                  <Pencil size={13} className="text-slate-500 group-hover:text-green-400 transition-colors" />
                </button>
              )}
            </div>

            {/* Avatar quick-change */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Ảnh đại diện
              </label>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 hover:border-green-500/40 rounded-xl py-3 px-4 text-sm transition-all group"
              >
                <img
                  src={pendingAvatar}
                  alt="current avatar"
                  className="w-8 h-8 rounded-lg bg-slate-700 object-cover"
                />
                <span className="text-slate-400 group-hover:text-white transition-colors flex-1 text-left">
                  {pendingAvatar !== profile.avatar ? 'Đã chọn ảnh mới ✓' : 'Thay đổi ảnh đại diện'}
                </span>
                <ImagePlus size={15} className="text-slate-500 group-hover:text-green-400 transition-colors shrink-0" />
              </button>
            </div>

            {/* Feedback messages */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm mb-4">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm mb-4">
                <Check size={14} className="shrink-0" /> {success}
              </div>
            )}

            {/* Action buttons */}
            {hasChanges ? (
              <div className="flex gap-2.5">
                <button
                  onClick={handleDiscard}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-all border border-slate-700/50"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 size={15} className="animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save size={15} /> Lưu thay đổi</>
                  )}
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full bg-slate-800/50 text-slate-600 font-bold py-3 rounded-xl text-sm cursor-not-allowed border border-slate-800"
              >
                Chưa có thay đổi
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          © ĐẢO PHIM · Xem phim miễn phí
        </p>

        {/* ─── Nạp tiền ─────────────────────────────────────────────── */}
        <div className="w-full max-w-sm mt-4">
          {/* Balance card */}
          <div className="bg-gradient-to-br from-green-600/20 via-green-500/10 to-indigo-600/10 border border-green-500/20 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-green-400" />
                <span className="text-sm font-bold text-slate-300">Số dư tài khoản</span>
              </div>
              <button
                onClick={async () => {
                  const fresh = await getUserProfile(profile.uid);
                  if (fresh) setProfile(fresh);
                }}
                className="text-slate-500 hover:text-green-400 transition-colors"
                title="Làm mới số dư"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-2xl font-black text-green-400 mt-2">
              {formatVND(profile.balance || 0)}
            </p>
          </div>

          {/* ─── VIP Shop ─────────────────────────────────────────── */}
          {/* VIP status badge */}
          {isVipActive(profile.vipExpiry) && profile.vipTier && (() => {
            const meta = VIP_META[profile.vipTier!];
            return (
              <div className={`flex items-center gap-3 bg-gradient-to-r ${meta.gradient} bg-opacity-10 border border-white/10 rounded-2xl px-4 py-3 mb-1`}>
                <Crown size={20} className="text-white shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{meta.label} · Chặn QC đang bật</p>
                  <p className="text-xs text-white/70">{vipExpiryText(profile.vipExpiry)}</p>
                </div>
                <ShieldCheck size={18} className="text-white/80 shrink-0" />
              </div>
            );
          })()}

          {/* Toggle VIP Shop */}
          <button
            onClick={() => setShowVipShop(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl text-sm font-bold text-white hover:border-amber-400/50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              Mua VIP · Chặn quảng cáo
            </div>
            <ChevronDown size={16} className={`text-amber-500 transition-transform ${showVipShop ? 'rotate-180' : ''}`} />
          </button>

          {showVipShop && (
            <div className="mt-2 bg-slate-900/90 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs text-slate-400 text-center">Mua VIP để <span className="text-amber-300 font-bold">tắt hoàn toàn quảng cáo</span>. Gói mua bằng số dư tài khoản.</p>

              {/* 3 gói */}
              {(['UVIP', 'SVIP', 'SSVIP'] as VipTier[]).map(tier => {
                const meta = VIP_META[tier];
                const price = vipPrices[tier];
                const canAfford = (profile.balance || 0) >= price;
                return (
                  <div key={tier} className={`flex items-center gap-3 bg-gradient-to-r ${meta.gradient} p-0.5 rounded-2xl`}>
                    <div className="flex-1 flex items-center justify-between bg-slate-900/90 rounded-[14px] px-4 py-3 gap-3">
                      <div>
                        <p className={`text-sm font-black ${meta.color} flex items-center gap-1.5`}>
                          <span>{meta.icon}</span> {meta.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Chặn QC · {meta.days} ngày</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{price.toLocaleString('vi-VN')}₫</p>
                        <button
                          onClick={() => handleBuyVip(tier)}
                          disabled={vipLoading || !canAfford}
                          className={`mt-1.5 flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}
                        >
                          <Zap size={11} />
                          {vipLoading ? '...' : canAfford ? 'Mua ngay' : 'Không đủ tiền'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {vipMsg && (
                <div className={`text-xs text-center font-bold px-3 py-2 rounded-xl ${vipMsg.ok ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {vipMsg.text}
                </div>
              )}

              <p className="text-[10px] text-slate-600 text-center">Gói VIP cộng dồn thời gian nếu còn hạn. Admin không bị QC.</p>
            </div>
          )}

          {/* Nạp thẻ — chuyển sang trang duyệt thủ công */}
          <a
            href="/nap-the"
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/90 border border-slate-700/60 rounded-2xl text-sm font-bold text-white hover:border-green-500/40 transition-all"
          >
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-green-400" />
              Nạp thẻ cào
            </div>
            <span className="text-[11px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold">Duyệt thủ công</span>
          </a>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatar={pendingAvatar}
          onSelect={(url) => {
            setPendingAvatar(url);
            setShowAvatarPicker(false);
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
