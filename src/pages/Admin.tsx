import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Upload, Film, Globe, Image, Type, Save, Eye, EyeOff, 
  Plus, Trash2, Edit3, Check, X, AlertCircle, ChevronDown, ChevronUp,
  Facebook, Youtube, Phone, Mail, User, Palette, Layout, Shield,
  RefreshCw, Link as LinkIcon, Info, Lock, LogOut, KeyRound,
  Bell, BellPlus, Users, Ban, UserCheck, Clock, Megaphone, MonitorPlay,
  Wallet, PlusCircle, MinusCircle, CreditCard, Wrench, Crown, Activity, Wifi,
  History, Search, Radio, Trash,
} from 'lucide-react';
import { getAdBanners, createAdBanner, updateAdBanner, deleteAdBanner, AdBannerData } from '../components/AdBanner';
import { createPopupAd, updatePopupAd, deletePopupAd, PopupAdData } from '../components/PopupAd';
import { getClickAdConfig, saveClickAdConfig, ClickAdConfig, DEFAULT_CLICK_AD } from '../lib/clickAd';
import { getVipPrices, saveVipPrices, VipPrices, DEFAULT_VIP_PRICES, VIP_META, VIP_DAYS } from '../lib/vip';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { fetchSiteSettings, saveSiteSettings as saveSiteSettingsFirestore } from '../lib/siteSettings';
import { db } from '../lib/firebase';
import { getAllUsers, banUser as apiBanUser, unbanUser as apiUnbanUser, deleteUserProfile, setUserRole, addUserBalance, UserProfile } from '../lib/auth';
import {
  subscribeNotifications, createNotification, deleteNotification, updateNotification,
  SiteNotification,
} from '../lib/notifications';
import { formatVND } from '../lib/topup';
import {
  subscribeManualTopupRequests,
  approveManualTopup,
  rejectManualTopup,
  formatVND as fmtVND,
  getStatusInfo as getTopupStatusInfo,
  CARD_TELCOS as MANUAL_TELCOS,
  ManualTopupRequest,
} from '../lib/manualTopup';
import {
  createManualMovie, updateManualMovie, deleteManualMovie, subscribeManualMovies, ManualMovie, ManualEpisode,
} from '../lib/manualMovies';
import {
  createUpcomingMovie, updateUpcomingMovie, deleteUpcomingMovie, subscribeUpcomingMovies, UpcomingMovie,
} from '../lib/upcomingMovies';
import {
  subscribeLiveConfig, updateLiveConfig, LiveConfig, DEFAULT_LIVE_CONFIG,
  subscribeLiveChat, deleteLiveChatMessage, clearLiveChat, LiveChatMessage,
} from '../lib/livestream';
import { cn } from '../lib/utils';
import { notifyManualMovie } from '../lib/telegramNotify';
import {
  getMovieOverride, saveMovieOverride, deleteMovieOverride,
  subscribeOverrides, MovieOverride,
} from '../lib/movieOverrides';
import {
  saveMaintenanceConfig, subscribeMaintenanceConfig,
  MaintenanceConfig, DEFAULT_MAINTENANCE,
} from '../lib/maintenance';
import {
  saveGeoblockConfig, subscribeGeoblockConfig,
  GeoblockConfig, DEFAULT_GEOBLOCK,
} from '../lib/geoblock';
import { subscribeOnlineUsers, PresenceStats } from '../lib/presence';

const ADMIN_USERNAME = 'daophim';
const ADMIN_PASSWORD = '0708';

const DEFAULT_SETTINGS = {
  siteName: 'ĐẢO PHIM',
  siteDescription: 'Website xem phim miễn phí với kho phim khổng lồ, cập nhật liên tục mỗi ngày.',
  logoType: 'icon' as 'icon' | 'image' | 'text',
  logoText: 'ĐẢO PHIM',
  logoImage: '',
  facebookUrl: 'https://web.facebook.com/tai.uc.251170',
  youtubeUrl: '',
  phone: '09 4601 7826',
  email: '',
  adsEmail: 'adsdaophim@gmail.com',
  adsTelegram: '',
  manualCopyWarning: 'Video thuộc bản quyền độc quyền của Đảo Phim. Nghiêm cấm sao chép, re-upload dưới mọi hình thức khi chưa được cho phép.',
  manualCopyWarningEnabled: true,
  authorName: 'Đức Tài',
  accentColor: 'indigo',
  adminPassword: '',
  isLocked: false,
};

const DEFAULT_MOVIES = (): ManualMovie[] => [];

// ManualMovie type imported from '../lib/manualMovies'

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all ${type === 'success' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300' : 'bg-red-950 border-red-500/40 text-red-300'}`}>
      {type === 'success' ? <Check size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
      {message}
      <button onClick={onClose} className="ml-2 text-current/60 hover:text-current"><X size={14} /></button>
    </div>
  );
}

function SectionCard({ id, title, icon: Icon, children, color = 'indigo' }: any) {
  const [open, setOpen] = useState(true);
  const accents: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-500 shadow-indigo-500/20',
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    orange: 'from-orange-500 to-amber-500 shadow-orange-500/20',
    pink: 'from-pink-500 to-rose-500 shadow-pink-500/20',
    green: 'from-green-500 to-emerald-500 shadow-green-500/20',
    blue: 'from-blue-500 to-indigo-500 shadow-blue-500/20',
    cyan: 'from-cyan-500 to-blue-500 shadow-cyan-500/20',
    red: 'from-red-500 to-orange-500 shadow-red-500/20',
    amber: 'from-amber-500 to-yellow-500 shadow-amber-500/20',
  };
  const accent = accents[color] || accents.indigo;
  return (
    <div id={id} className="bg-slate-900/70 border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl scroll-mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 group hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg`}>
            <Icon size={17} className="text-white" />
          </div>
          <h2 className="text-white font-black text-base tracking-wide" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.06em' }}>
            {title}
          </h2>
        </div>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${open ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-800 text-slate-500'} group-hover:bg-slate-700 group-hover:text-white`}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

function InputRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
      <div className="sm:w-44 shrink-0 pt-1">
        <label className="text-sm font-semibold text-slate-300">{label}</label>
        {hint && <p className="text-[11px] text-slate-600 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      onLogin();
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng!');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-yellow-500/6 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-sm ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-green-500/30">
            <Shield size={28} className="text-slate-950" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>
            ĐẢO PHIM <span className="text-green-400">ADMIN</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Đăng nhập để quản lý website</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Tên đăng nhập</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all"
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-green-500 hover:bg-green-400 active:scale-95 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            Đăng nhập
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-4">
          Trang quản trị chỉ dành cho Admin
        </p>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────────────────────────

// ─── Members Section ──────────────────────────────────────────────────────────
function MembersSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');

  // ─── Balance modal state ────────────────────────────────────────────────────
  const [balanceModal, setBalanceModal] = useState<{ uid: string; username: string; balance: number } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceType, setBalanceType] = useState<'add' | 'deduct'>('add');

  const refresh = async () => {
    const users = await getAllUsers();
    setUsers(users);
  };
  useEffect(() => { refresh(); }, []);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  const handleRole = async (u: UserProfile) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const label = newRole === 'admin' ? 'cấp quyền Admin' : 'thu hồi quyền Admin';
    if (!confirm(`Bạn muốn ${label} cho ${u.username}?`)) return;
    await setUserRole(u.uid, newRole);
    onToast(`Đã ${label} cho ${u.username}`, 'success');
    refresh();
  };
  const handleBan = async (u: UserProfile) => {
    if (u.isBanned) { await apiUnbanUser(u.uid); onToast(`Đã mở khóa ${u.username}`, 'success'); }
    else { await apiBanUser(u.uid); onToast(`Đã khóa ${u.username}`, 'success'); }
    refresh();
  };
  const handleDelete = async (u: UserProfile) => {
    if (!confirm(`Xóa tài khoản ${u.username}?`)) return;
    await deleteUserProfile(u.uid);
    onToast(`Đã xóa ${u.username}`, 'success');
    refresh();
  };

  const openBalanceModal = (u: UserProfile) => {
    setBalanceModal({ uid: u.uid, username: u.username, balance: u.balance || 0 });
    setBalanceAmount('');
    setBalanceNote('');
    setBalanceType('add');
  };

  const handleBalanceSubmit = async () => {
    if (!balanceModal) return;
    const amt = parseInt(balanceAmount.replace(/\D/g, ''), 10);
    if (!amt || amt <= 0) { onToast('Số tiền không hợp lệ!', 'error'); return; }

    setBalanceLoading(true);
    try {
      const finalAmt = balanceType === 'add' ? amt : -amt;
      const newBal = await addUserBalance(
        balanceModal.uid,
        finalAmt,
        balanceNote || (balanceType === 'add' ? 'Admin cộng tiền' : 'Admin trừ tiền')
      );
      onToast(
        `${balanceType === 'add' ? '✅ Đã cộng' : '✅ Đã trừ'} ${formatVND(amt)} cho ${balanceModal.username}. Số dư mới: ${formatVND(newBal)}`,
        'success'
      );
      setBalanceModal(null);
      refresh();
    } catch (e: any) {
      onToast('Lỗi: ' + (e.message || 'Không thể cập nhật số dư'), 'error');
    }
    setBalanceLoading(false);
  };

  return (
    <SectionCard title="Quản lý thành viên" icon={Users} color="indigo">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-slate-400">
            Tổng: <span className="text-white font-bold">{users.length}</span> thành viên
            {users.filter(u => u.role === 'admin').length > 0 && (
              <span className="ml-2 text-green-400">· {users.filter(u => u.role === 'admin').length} admin</span>
            )}
            {users.filter(u => u.isBanned).length > 0 && (
              <span className="ml-2 text-red-400">· {users.filter(u => u.isBanned).length} bị khóa</span>
            )}
          </p>
          <input
            type="text"
            placeholder="Tìm theo tên / email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-field text-sm max-w-[220px] py-2"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{users.length === 0 ? 'Chưa có thành viên nào đăng ký.' : 'Không tìm thấy thành viên.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginated.map(u => (
              <div key={u.uid} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${u.isBanned ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-800/40 border-slate-700/30'}`}>
                <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{u.username}</span>
                    {u.isBanned && <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">KHÓA</span>}
                    {u.role === 'admin' && <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ADMIN</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  <div className="text-[10px] mt-0.5 flex items-center gap-2">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    {/* Số dư */}
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Wallet size={9} />
                      {formatVND(u.balance || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Cộng / Trừ tiền */}
                  <button
                    onClick={() => openBalanceModal(u)}
                    className="btn-icon p-2.5 text-xs hover:border-green-500/40 hover:text-green-400"
                    title="Cộng / Trừ số dư"
                  >
                    <Wallet size={14} />
                  </button>
                  {/* Cấp / Thu hồi Admin */}
                  <button
                    onClick={() => handleRole(u)}
                    className={`btn-icon p-2.5 text-xs ${u.role === 'admin' ? 'border-green-500/40 text-green-400 hover:border-red-500/40 hover:text-red-400' : 'hover:border-green-500/40 hover:text-green-400'}`}
                    title={u.role === 'admin' ? 'Thu hồi Admin' : 'Cấp quyền Admin'}
                  >
                    <Shield size={14} />
                  </button>
                  {/* Khóa / Mở khóa */}
                  <button
                    onClick={() => handleBan(u)}
                    className={`btn-icon p-2.5 text-xs ${u.isBanned ? 'hover:border-emerald-500/40 hover:text-emerald-400' : 'hover:border-orange-500/40 hover:text-orange-400'}`}
                    title={u.isBanned ? 'Mở khóa' : 'Khóa tài khoản'}
                  >
                    {u.isBanned ? <UserCheck size={14} /> : <Ban size={14} />}
                  </button>
                  {/* Xóa */}
                  <button
                    onClick={() => handleDelete(u)}
                    className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400"
                    title="Xóa tài khoản"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Phân trang ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-icon px-3 py-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹ Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...'
                  ? <span key={`e${idx}`} className="text-slate-600 px-1">…</span>
                  : <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`btn-icon w-8 h-8 text-sm font-bold ${page === p ? 'border-green-500/60 text-green-400' : ''}`}
                    >{p}</button>
              )
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-icon px-3 py-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Sau ›
            </button>
            <span className="text-xs text-slate-500 ml-1">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
          </div>
        )}
      </div>

      {/* ─── Modal cộng/trừ tiền ──────────────────────────────────────────────── */}
      {balanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-green-400" />
                <span className="text-white font-black">Cập nhật số dư</span>
              </div>
              <button onClick={() => setBalanceModal(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* User info */}
              <div className="bg-slate-800/60 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">Tài khoản</p>
                <p className="text-white font-bold">{balanceModal.username}</p>
                <p className="text-green-400 text-sm font-black mt-1">
                  Số dư hiện tại: {formatVND(balanceModal.balance)}
                </p>
              </div>

              {/* Add / Deduct toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBalanceType('add')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    balanceType === 'add'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <PlusCircle size={15} /> Cộng tiền
                </button>
                <button
                  onClick={() => setBalanceType('deduct')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    balanceType === 'deduct'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <MinusCircle size={15} /> Trừ tiền
                </button>
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Chọn nhanh</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000].map(a => (
                    <button
                      key={a}
                      onClick={() => setBalanceAmount(String(a))}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        balanceAmount === String(a)
                          ? 'bg-green-500 text-slate-950 border-green-500'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/40 hover:border-green-500/30'
                      }`}
                    >
                      {a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Số tiền (VNĐ)</p>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="Nhập số tiền..."
                  min={1}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50 transition-colors"
                />
                {balanceAmount && parseInt(balanceAmount) > 0 && (
                  <p className={`text-xs mt-1 font-bold ${balanceType === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {balanceType === 'add' ? '+ ' : '- '}
                    {formatVND(parseInt(balanceAmount))}
                    {' → '}
                    {formatVND((balanceModal.balance || 0) + (balanceType === 'add' ? 1 : -1) * parseInt(balanceAmount))}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Ghi chú (tuỳ chọn)</p>
                <input
                  type="text"
                  value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="Lý do cộng/trừ tiền..."
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setBalanceModal(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm border border-slate-700/50 transition-all"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleBalanceSubmit}
                  disabled={balanceLoading || !balanceAmount || parseInt(balanceAmount) <= 0}
                  className={`flex-1 font-black py-3 rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                    balanceType === 'add'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                  }`}
                >
                  {balanceLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Đang xử lý...</>
                  ) : (
                    balanceType === 'add' ? <><PlusCircle size={14} /> Cộng tiền</> : <><MinusCircle size={14} /> Trừ tiền</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Notifications Section ────────────────────────────────────────────────────
const NOTIF_DEFAULTS = {
  title: '',
  message: '',
  type: 'info' as SiteNotification['type'],
  category: 'phim' as NonNullable<SiteNotification['category']>,
  active: true,
  showAsPopup: true,
  targetUrl: '',
  imageUrl: '',
  displayStyle: 'default' as 'default' | 'image_link',
  expiresAt: undefined as number | undefined,
};

function NotificationsSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [notifs, setNotifs] = useState<SiteNotification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...NOTIF_DEFAULTS });
  const [saving, setSaving] = useState(false);

  // Subscribe realtime từ Firebase
  useEffect(() => {
    const unsub = subscribeNotifications((all: SiteNotification[]) => setNotifs(all));
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { onToast('Vui lòng nhập tiêu đề thông báo', 'error'); return; }
    if (!form.message.trim()) { onToast('Vui lòng nhập nội dung thông báo', 'error'); return; }
    setSaving(true);
    try {
      await createNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        category: form.category,
        active: form.active,
        showAsPopup: form.displayStyle === 'image_link' ? true : form.showAsPopup,
        targetUrl: form.targetUrl.trim() || undefined,
        imageUrl: form.displayStyle === 'image_link' ? (form.imageUrl.trim() || undefined) : undefined,
        displayStyle: form.displayStyle,
        expiresAt: form.expiresAt,
      });
      setForm({ ...NOTIF_DEFAULTS });
      setShowForm(false);
      onToast('Đã gửi thông báo thành công! Tất cả người dùng sẽ thấy ngay.', 'success');
    } catch { onToast('Lỗi khi gửi thông báo', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateNotification(id, { active: !active });
    onToast(active ? 'Đã tắt thông báo' : 'Đã bật thông báo', 'success');
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    onToast('Đã xóa thông báo', 'success');
  };

  const TYPE_LABELS = { info: '📘 Thông tin', warning: '⚠️ Cảnh báo', success: '✅ Thành công', error: '🚨 Khẩn cấp' };
  const TYPE_COLORS: Record<string, string> = {
    info: 'text-blue-400 bg-blue-500/10',
    warning: 'text-green-400 bg-green-600/10',
    success: 'text-emerald-400 bg-emerald-500/10',
    error: 'text-red-400 bg-red-500/10',
  };

  return (
    <SectionCard title="Gửi thông báo" icon={Bell} color="pink">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Tổng: <span className="text-white font-bold">{notifs.length}</span> thông báo
            {' · '}<span className="text-emerald-400">{notifs.filter(n => n.active).length} đang bật</span>
          </p>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            {showForm ? <X size={15} /> : <BellPlus size={15} />}
            {showForm ? 'Đóng' : 'Tạo thông báo mới'}
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-800/40 border border-pink-500/20 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-white text-base">🔔 Tạo thông báo mới</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Loại thông báo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as SiteNotification['type'] }))}
                  className="input-field text-sm"
                >
                  <option value="info">📘 Thông tin</option>
                  <option value="warning">⚠️ Cảnh báo</option>
                  <option value="success">✅ Thành công / Tin vui</option>
                  <option value="error">🚨 Khẩn cấp</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Danh mục (trang Thông báo)</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as NonNullable<SiteNotification['category']> }))}
                  className="input-field text-sm"
                >
                  <option value="phim">🎬 Phim</option>
                  <option value="cong_dong">👥 Cộng đồng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Kiểu hiển thị</label>
                <select
                  value={form.displayStyle === 'image_link' ? 'image_link' : (form.showAsPopup ? 'popup' : 'banner')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'image_link') {
                      setForm(f => ({ ...f, displayStyle: 'image_link' as const, showAsPopup: true }));
                    } else {
                      setForm(f => ({ ...f, displayStyle: 'default' as const, showAsPopup: val === 'popup' }));
                    }
                  }}
                  className="input-field text-sm"
                >
                  <option value="popup">🪟 Popup (hộp thoại giữa màn hình)</option>
                  <option value="banner">📢 Banner (dải trên đầu trang)</option>
                  <option value="image_link">🖼️ Image Link (hình ảnh có link)</option>
                </select>
              </div>
            </div>

            {/* ── Trường bổ sung cho Image Link ── */}
            {form.displayStyle === 'image_link' && (
              <div className="flex flex-col gap-3 p-4 rounded-xl border border-violet-500/30 bg-violet-950/20">
                <p className="text-violet-400 text-xs font-black uppercase tracking-widest">🖼️ Cài đặt Image Link Popup</p>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">URL hình ảnh <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="https://i.imgur.com/abc123.jpg"
                  />
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="mt-2 w-full max-h-44 object-cover rounded-lg border border-slate-700"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Link đích khi nhấn vào ảnh</label>
                  <input
                    type="url"
                    value={form.targetUrl}
                    onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="https://daophim.online/phim/ten-phim"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Tiêu đề *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field text-sm"
                placeholder="VD: Bảo trì hệ thống, Phim mới ra mắt..."
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Nội dung *</label>
              <textarea
                rows={3}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="input-field text-sm resize-none"
                placeholder="Nội dung chi tiết của thông báo..."
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Link đính kèm (không bắt buộc)</label>
              <input
                value={form.targetUrl}
                onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                className="input-field text-sm"
                placeholder="https://... (sẽ hiện nút Xem thêm)"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center disabled:opacity-60">
                <Bell size={15} /> {saving ? 'Đang gửi...' : 'Gửi thông báo'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-icon px-4 text-sm text-slate-400">
                Hủy
              </button>
            </div>
          </div>
        )}

        {notifs.length > 0 ? (
          <div className="flex flex-col gap-2">
            {notifs.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 border rounded-xl transition-all ${n.active ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-900/40 border-slate-800/30 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${TYPE_COLORS[n.type]}`}>{TYPE_LABELS[n.type]}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">
                      {n.category === 'cong_dong' ? '👥 Cộng đồng' : '🎬 Phim'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {n.displayStyle === 'image_link' ? '🖼️ Image Link' : n.showAsPopup ? '🪟 Popup' : '📢 Banner'}
                    </span>
                    {!n.active && <span className="text-[10px] font-black text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">TẮT</span>}
                  </div>
                  <p className="text-sm font-bold text-white mt-1">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(n.id, n.active)}
                    className={`btn-icon p-2.5 ${n.active ? 'hover:border-slate-500/40 text-emerald-400' : 'hover:border-emerald-500/40 text-slate-500'}`}
                    title={n.active ? 'Tắt thông báo' : 'Bật thông báo'}
                  >
                    {n.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-600">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Chưa có thông báo nào.</p>
            <p className="text-xs mt-1">Nhấn "Tạo thông báo mới" để bắt đầu.</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Ads Management Section ───────────────────────────────────────────────────
const BANNER_DEFAULTS: Omit<AdBannerData, 'id' | 'createdAt'> = {
  title: '',
  mediaUrl: '',
  mediaType: 'image',
  linkUrl: 'https://',
  position: 'top',
  active: true,
};

const POPUP_DEFAULTS: Omit<PopupAdData, 'id' | 'createdAt'> = {
  title: '',
  mediaUrl: '',
  mediaType: 'image',
  linkUrl: 'https://',
  active: true,
};

function AdsSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [banners, setBanners] = useState<AdBannerData[]>([]);
  const [popups, setPopups] = useState<PopupAdData[]>([]);
  const [tab, setTab] = useState<'banner' | 'popup' | 'click'>('banner');

  // Click-ad config
  const [clickCfg, setClickCfg] = useState<ClickAdConfig>({ ...DEFAULT_CLICK_AD });
  const [clickSaving, setClickSaving] = useState(false);

  useEffect(() => {
    getClickAdConfig().then(setClickCfg);
  }, []);

  const saveClickCfg = async () => {
    setClickSaving(true);
    try {
      await saveClickAdConfig(clickCfg);
      onToast('Đã lưu cài đặt Click QC!', 'success');
    } catch { onToast('Lỗi khi lưu!', 'error'); }
    setClickSaving(false);
  };

  // Banner form
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState({ ...BANNER_DEFAULTS });
  const [editBannerId, setEditBannerId] = useState<string | null>(null);

  // Popup form
  const [showPopupForm, setShowPopupForm] = useState(false);
  const [popupForm, setPopupForm] = useState({ ...POPUP_DEFAULTS });
  const [editPopupId, setEditPopupId] = useState<string | null>(null);

  // Realtime listeners từ Firestore
  useEffect(() => {
    const qB = query(collection(db, 'ad_banners'), orderBy('createdAt', 'desc'));
    const unsubB = onSnapshot(qB, snap => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdBannerData)));
    });
    const qP = query(collection(db, 'popup_ads'), orderBy('createdAt', 'desc'));
    const unsubP = onSnapshot(qP, snap => {
      setPopups(snap.docs.map(d => ({ id: d.id, ...d.data() } as PopupAdData)));
    });
    return () => { unsubB(); unsubP(); };
  }, []);

  // ── Banner handlers ──────────────────────────────────────────────────────────
  const submitBanner = async () => {
    if (!bannerForm.mediaUrl.trim()) { onToast('Vui lòng nhập URL media (GIF/MP4)', 'error'); return; }
    if (!bannerForm.linkUrl.trim()) { onToast('Vui lòng nhập link chuyển trang', 'error'); return; }
    try {
      if (editBannerId) {
        await updateAdBanner(editBannerId, bannerForm);
        onToast('Đã cập nhật banner QC!', 'success');
      } else {
        await createAdBanner({ ...bannerForm, createdAt: Date.now() });
        onToast('Đã thêm banner QC!', 'success');
      }
      setBannerForm({ ...BANNER_DEFAULTS });
      setEditBannerId(null);
      setShowBannerForm(false);
    } catch { onToast('Lỗi khi lưu banner!', 'error'); }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Xóa banner QC này?')) return;
    try { await deleteAdBanner(id); onToast('Đã xóa banner QC!', 'success'); }
    catch { onToast('Lỗi khi xóa!', 'error'); }
  };

  const toggleBanner = async (b: AdBannerData) => {
    try { await updateAdBanner(b.id, { active: !b.active }); } catch {}
  };

  const editBanner = (b: AdBannerData) => {
    setBannerForm({ title: b.title, mediaUrl: b.mediaUrl, mediaType: b.mediaType, linkUrl: b.linkUrl, position: b.position, active: b.active });
    setEditBannerId(b.id);
    setShowBannerForm(true);
  };

  // ── Popup handlers ────────────────────────────────────────────────────────────
  const submitPopup = async () => {
    if (!popupForm.mediaUrl.trim()) { onToast('Vui lòng nhập URL media (GIF/MP4)', 'error'); return; }
    if (!popupForm.linkUrl.trim()) { onToast('Vui lòng nhập link chuyển trang', 'error'); return; }
    try {
      if (editPopupId) {
        await updatePopupAd(editPopupId, popupForm);
        onToast('Đã cập nhật popup QC!', 'success');
      } else {
        await createPopupAd({ ...popupForm, createdAt: Date.now() });
        onToast('Đã thêm popup QC!', 'success');
      }
      setPopupForm({ ...POPUP_DEFAULTS });
      setEditPopupId(null);
      setShowPopupForm(false);
    } catch { onToast('Lỗi khi lưu popup!', 'error'); }
  };

  const deletePopup = async (id: string) => {
    if (!confirm('Xóa popup QC này?')) return;
    try { await deletePopupAd(id); onToast('Đã xóa popup QC!', 'success'); }
    catch { onToast('Lỗi khi xóa!', 'error'); }
  };

  const togglePopup = async (p: PopupAdData) => {
    try { await updatePopupAd(p.id, { active: !p.active }); } catch {}
  };

  const editPopup = (p: PopupAdData) => {
    setPopupForm({ title: p.title, mediaUrl: p.mediaUrl, mediaType: p.mediaType, linkUrl: p.linkUrl, active: p.active });
    setEditPopupId(p.id);
    setShowPopupForm(true);
  };

  const POSITION_LABELS: Record<string, string> = { top: '⬆️ Trên trang', bottom: '⬇️ Dưới trang', middle: '↕️ Giữa trang' };

  return (
    <SectionCard title="Quản lý Quảng cáo (QC)" icon={Megaphone} color="orange">

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('banner')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === 'banner' ? 'bg-orange-500/20 border-orange-500/60 text-orange-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
        >
          🖼️ Banner QC ({banners.length})
        </button>
        <button
          onClick={() => setTab('popup')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === 'popup' ? 'bg-orange-500/20 border-orange-500/60 text-orange-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
        >
          🪟 Popup QC ({popups.length})
        </button>
        <button
          onClick={() => setTab('click')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === 'click' ? 'bg-orange-500/20 border-orange-500/60 text-orange-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
        >
          👆 Click QC
        </button>
      </div>

      {/* ── CLICK AD TAB ──────────────────────────────────────────────────────── */}
      {tab === 'click' && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-400">
            Khi user click vào bất kỳ đâu trên trang sẽ mở link QC trong tab mới. Tài khoản <span className="text-orange-400 font-bold">Admin</span> không bị ảnh hưởng.
          </p>

          {/* Bật/tắt */}
          <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Trạng thái Click QC</p>
              <p className="text-xs text-slate-500 mt-0.5">Bật để kích hoạt quảng cáo ẩn khi click</p>
            </div>
            <button
              onClick={() => setClickCfg(c => ({ ...c, enabled: !c.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${clickCfg.enabled ? 'bg-orange-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${clickCfg.enabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {/* Link QC */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-300">Link QC (URL mở khi click)</label>
            <p className="text-xs text-slate-500">Ví dụ: https://omg10.com/4/10101260</p>
            <input
              type="url"
              value={clickCfg.link}
              onChange={e => setClickCfg(c => ({ ...c, link: e.target.value }))}
              placeholder="https://..."
              className="admin-input w-full"
            />
          </div>

          {/* Cooldown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-300">Thời gian chờ giữa 2 lần hiện (giây)</label>
            <p className="text-xs text-slate-500">Sau khi hiện QC, phải chờ bao lâu trước khi hiện lại. Mặc định: 60 giây</p>
            <input
              type="number"
              min={5}
              max={3600}
              value={clickCfg.cooldown}
              onChange={e => setClickCfg(c => ({ ...c, cooldown: Math.max(5, parseInt(e.target.value) || 60) }))}
              className="admin-input w-40"
            />
          </div>

          {/* Lưu */}
          <button
            onClick={saveClickCfg}
            disabled={clickSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold rounded-xl transition-colors w-fit"
          >
            <Save size={15} />
            {clickSaving ? 'Đang lưu...' : 'Lưu cài đặt Click QC'}
          </button>

          {/* Preview */}
          {clickCfg.link && (
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-sm">
              <p className="text-slate-400 mb-1">🔗 Link hiện tại:</p>
              <a href={clickCfg.link} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 break-all font-mono text-xs">
                {clickCfg.link}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── BANNER TAB ────────────────────────────────────────────────────────── */}
      {tab === 'banner' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-400">
              Banner GIF/MP4 tích hợp link, hiển thị trong trang. &nbsp;
              <span className="text-emerald-400">{banners.filter(b => b.active).length} đang bật</span>
            </p>
            <button
              onClick={() => { setBannerForm({ ...BANNER_DEFAULTS }); setEditBannerId(null); setShowBannerForm(v => !v); }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              {showBannerForm ? <X size={15} /> : <Plus size={15} />}
              {showBannerForm ? 'Đóng' : 'Thêm banner'}
            </button>
          </div>

          {showBannerForm && (
            <div className="bg-slate-800/40 border border-orange-500/20 rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="font-bold text-white text-base">{editBannerId ? '✏️ Sửa banner QC' : '➕ Thêm banner QC mới'}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Loại media</label>
                  <select
                    value={bannerForm.mediaType}
                    onChange={e => setBannerForm(f => ({ ...f, mediaType: e.target.value as 'gif' | 'mp4' | 'image' }))}
                    className="input-field text-sm"
                  >
                    <option value="image">🖼️ Ảnh (JPG/PNG/WEBP)</option>
                    <option value="gif">✨ GIF (ảnh động)</option>
                    <option value="mp4">🎬 MP4 (video)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Vị trí hiển thị</label>
                  <select
                    value={bannerForm.position}
                    onChange={e => setBannerForm(f => ({ ...f, position: e.target.value as AdBannerData['position'] }))}
                    className="input-field text-sm"
                  >
                    <option value="top">⬆️ Trên trang (trước banner phim)</option>
                    <option value="middle">↕️ Giữa trang (giữa các section)</option>
                    <option value="bottom">⬇️ Dưới trang (sau danh sách phim)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên banner (để nhận diện)</label>
                <input
                  value={bannerForm.title}
                  onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="VD: Banner tháng 4, QC game..."
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  URL media ({bannerForm.mediaType === 'mp4' ? 'link .mp4' : 'link .gif'})
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Bắt buộc</span>
                </label>
                <input
                  value={bannerForm.mediaUrl}
                  onChange={e => setBannerForm(f => ({ ...f, mediaUrl: e.target.value }))}
                  className="input-field text-sm"
                  placeholder={bannerForm.mediaType === 'mp4' ? 'https://example.com/ad.mp4' : bannerForm.mediaType === 'gif' ? 'https://example.com/ad.gif' : 'https://example.com/banner.jpg'}
                />
                <p className="text-[11px] text-slate-600 mt-1">Dán link trực tiếp tới file GIF hoặc MP4 (CDN, hosting, v.v.)</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  Link chuyển trang khi ấn vào
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Bắt buộc</span>
                </label>
                <input
                  value={bannerForm.linkUrl}
                  onChange={e => setBannerForm(f => ({ ...f, linkUrl: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="https://example.com/..."
                />
              </div>

              {/* Preview */}
              {bannerForm.mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700/40 bg-slate-900">
                  <p className="text-[10px] text-slate-500 px-3 pt-2 pb-1">👁️ Xem trước:</p>
                  {bannerForm.mediaType === 'mp4' ? (
                    <video src={bannerForm.mediaUrl} autoPlay loop muted playsInline className="w-full max-h-40 object-contain" />
                  ) : (
                    <img src={bannerForm.mediaUrl} alt="preview" className="w-full max-h-40 object-contain" />
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={submitBanner} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                  <Check size={16} /> {editBannerId ? 'Cập nhật banner' : 'Thêm banner'}
                </button>
                <button onClick={() => { setShowBannerForm(false); setBannerForm({ ...BANNER_DEFAULTS }); setEditBannerId(null); }} className="btn-icon px-4 text-sm text-slate-400">
                  Hủy
                </button>
              </div>
            </div>
          )}

          {banners.length > 0 ? (
            <div className="flex flex-col gap-2">
              {banners.map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${b.active ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-900/40 border-slate-800/30 opacity-60'}`}>
                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/40">
                    {b.mediaUrl ? (
                      b.mediaType === 'mp4'
                        ? <video src={b.mediaUrl} muted className="w-full h-full object-cover" />
                        : <img src={b.mediaUrl} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600"><MonitorPlay size={14} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{b.title || 'Banner QC'}</span>
                      <span className="text-[10px] font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{b.mediaType.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-500">{POSITION_LABELS[b.position]}</span>
                      {!b.active && <span className="text-[10px] font-black text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">TẮT</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">🔗 {b.linkUrl}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editBanner(b)} className="btn-icon p-2.5 hover:border-orange-500/40 hover:text-orange-400" title="Sửa"><Edit3 size={14} /></button>
                    <button onClick={() => toggleBanner(b)} className={`btn-icon p-2.5 ${b.active ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`} title={b.active ? 'Tắt' : 'Bật'}>{b.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => deleteBanner(b.id)} className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400" title="Xóa"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-600">
              <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có banner QC nào.</p>
              <p className="text-xs mt-1">Nhấn "Thêm banner" để bắt đầu.</p>
            </div>
          )}
        </div>
      )}

      {/* ── POPUP TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'popup' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-400">
              Popup xuất hiện <span className="text-green-400 font-bold">1 lần</span> khi người dùng bấm vào phim muốn xem. &nbsp;
              <span className="text-emerald-400">{popups.filter(p => p.active).length} đang bật</span>
            </p>
            <button
              onClick={() => { setPopupForm({ ...POPUP_DEFAULTS }); setEditPopupId(null); setShowPopupForm(v => !v); }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              {showPopupForm ? <X size={15} /> : <Plus size={15} />}
              {showPopupForm ? 'Đóng' : 'Thêm popup'}
            </button>
          </div>

          <div className="bg-green-600/5 border border-green-600/20 rounded-xl px-4 py-3 text-[12px] text-green-300/80">
            ℹ️ Popup hiện <strong>1 lần duy nhất mỗi phiên</strong> khi người dùng nhấn vào chi tiết phim. Chỉ popup đầu tiên đang <strong>bật</strong> sẽ được hiển thị.
          </div>

          {showPopupForm && (
            <div className="bg-slate-800/40 border border-orange-500/20 rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="font-bold text-white text-base">{editPopupId ? '✏️ Sửa popup QC' : '➕ Thêm popup QC mới'}</h3>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Loại media</label>
                <select
                  value={popupForm.mediaType}
                  onChange={e => setPopupForm(f => ({ ...f, mediaType: e.target.value as 'gif' | 'mp4' | 'image' }))}
                  className="input-field text-sm"
                >
                  <option value="image">🖼️ Ảnh (JPG/PNG/WEBP)</option>
                  <option value="gif">✨ GIF (ảnh động)</option>
                  <option value="mp4">🎬 MP4 (video)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên popup (để nhận diện)</label>
                <input
                  value={popupForm.title}
                  onChange={e => setPopupForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="VD: QC tháng 4, Quảng cáo game..."
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  URL media ({popupForm.mediaType === 'mp4' ? 'link .mp4' : 'link .gif'})
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Bắt buộc</span>
                </label>
                <input
                  value={popupForm.mediaUrl}
                  onChange={e => setPopupForm(f => ({ ...f, mediaUrl: e.target.value }))}
                  className="input-field text-sm"
                  placeholder={popupForm.mediaType === 'mp4' ? 'https://example.com/popup.mp4' : popupForm.mediaType === 'gif' ? 'https://example.com/popup.gif' : 'https://example.com/popup.jpg'}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  Link chuyển trang khi ấn vào popup
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Bắt buộc</span>
                </label>
                <input
                  value={popupForm.linkUrl}
                  onChange={e => setPopupForm(f => ({ ...f, linkUrl: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="https://example.com/..."
                />
              </div>

              {/* Preview */}
              {popupForm.mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700/40 bg-slate-900">
                  <p className="text-[10px] text-slate-500 px-3 pt-2 pb-1">👁️ Xem trước:</p>
                  {popupForm.mediaType === 'mp4' ? (
                    <video src={popupForm.mediaUrl} autoPlay loop muted playsInline className="w-full max-h-48 object-contain" />
                  ) : (
                    <img src={popupForm.mediaUrl} alt="preview" className="w-full max-h-48 object-contain" />
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={submitPopup} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                  <Check size={16} /> {editPopupId ? 'Cập nhật popup' : 'Thêm popup'}
                </button>
                <button onClick={() => { setShowPopupForm(false); setPopupForm({ ...POPUP_DEFAULTS }); setEditPopupId(null); }} className="btn-icon px-4 text-sm text-slate-400">
                  Hủy
                </button>
              </div>
            </div>
          )}

          {popups.length > 0 ? (
            <div className="flex flex-col gap-2">
              {popups.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${p.active ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-900/40 border-slate-800/30 opacity-60'}`}>
                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/40">
                    {p.mediaUrl ? (
                      p.mediaType === 'mp4'
                        ? <video src={p.mediaUrl} muted className="w-full h-full object-cover" />
                        : <img src={p.mediaUrl} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600"><MonitorPlay size={14} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {idx === 0 && p.active && <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ĐANG DÙNG</span>}
                      <span className="text-sm font-bold text-white truncate">{p.title || 'Popup QC'}</span>
                      <span className="text-[10px] font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{p.mediaType.toUpperCase()}</span>
                      {!p.active && <span className="text-[10px] font-black text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">TẮT</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">🔗 {p.linkUrl}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editPopup(p)} className="btn-icon p-2.5 hover:border-orange-500/40 hover:text-orange-400" title="Sửa"><Edit3 size={14} /></button>
                    <button onClick={() => togglePopup(p)} className={`btn-icon p-2.5 ${p.active ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`} title={p.active ? 'Tắt' : 'Bật'}>{p.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => deletePopup(p.id)} className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400" title="Xóa"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-600">
              <MonitorPlay size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có popup QC nào.</p>
              <p className="text-xs mt-1">Nhấn "Thêm popup" để bắt đầu.</p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}



// ── VipSection ────────────────────────────────────────────────────────────────
function VipSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [prices, setPrices] = useState<VipPrices>({ ...DEFAULT_VIP_PRICES });
  const [saving, setSaving] = useState(false);

  useEffect(() => { getVipPrices().then(setPrices); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveVipPrices(prices);
      onToast('Đã lưu giá VIP!', 'success');
    } catch { onToast('Lỗi khi lưu!', 'error'); }
    setSaving(false);
  };

  return (
    <SectionCard title="Gói VIP · Chặn Quảng Cáo" icon={Crown} color="orange">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-slate-400">
          User mua VIP bằng số dư tài khoản sẽ được <span className="text-amber-400 font-bold">tắt hoàn toàn quảng cáo</span> trong thời hạn gói.
          Admin luôn miễn QC. Thay đổi giá có hiệu lực ngay.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {(['UVIP', 'SVIP', 'SSVIP'] as const).map(tier => {
            const meta = VIP_META[tier];
            return (
              <div key={tier} className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
                <div className="flex-1">
                  <p className={`text-sm font-black ${meta.color} flex items-center gap-2`}>
                    <span>{meta.icon}</span> {tier}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Chặn QC · {meta.days} ngày</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={prices[tier]}
                    onChange={e => setPrices(p => ({ ...p, [tier]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="admin-input w-32 text-right"
                  />
                  <span className="text-xs text-slate-500">₫</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold rounded-xl transition-colors w-fit"
        >
          <Save size={15} />
          {saving ? 'Đang lưu...' : 'Lưu giá VIP'}
        </button>

        <div className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4 text-xs text-slate-500 flex flex-col gap-1">
          <p className="font-bold text-amber-400 mb-1">📌 Lưu ý</p>
          <p>• Giá VIP tính bằng VNĐ, trừ từ số dư tài khoản người dùng.</p>
          <p>• Người dùng nạp tiền qua thẻ cào, sau đó dùng số dư để mua gói.</p>
          <p>• Gói VIP cộng dồn thời gian nếu user còn VIP hạn cũ.</p>
          <p>• Admin luôn được miễn QC, không cần mua VIP.</p>
        </div>
      </div>
    </SectionCard>
  );
}

// ── MaintenanceSection ────────────────────────────────────────────────────────

// ── RealtimeUsersSection ─────────────────────────────────────────────────────
function RealtimeUsersSection() {
  const [stats, setStats] = React.useState<PresenceStats>({ total: 0, byDevice: { mobile: 0, desktop: 0, tablet: 0, other: 0 } });
  const [loading, setLoading] = React.useState(true);
  const [blink, setBlink] = React.useState(false);

  useEffect(() => {
    const unsub = subscribeOnlineUsers(s => {
      setStats(s);
      setLoading(false);
      setBlink(true);
      setTimeout(() => setBlink(false), 600);
    });
    return unsub;
  }, []);

  const devices = [
    { key: 'mobile', label: 'Mobile', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/30', icon: '📱' },
    { key: 'desktop', label: 'Desktop', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', icon: '🖥️' },
    { key: 'tablet', label: 'Tablet', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30', icon: '📲' },
    { key: 'other', label: 'Khác', color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-600/30', icon: '🔌' },
  ] as const;

  return (
    <SectionCard title="Người dùng trực tuyến (Realtime)" icon={Activity} color="emerald">
      {/* Tổng số */}
      <div className={`flex items-center gap-4 mb-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 transition-all duration-300 ${blink ? 'border-emerald-400/60 bg-emerald-500/20' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Users size={26} className="text-white" />
          </div>
          {/* pulse dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${loading ? 'hidden' : ''}`} />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Đang truy cập (30 phút gần nhất)</p>
          {loading ? (
            <div className="flex gap-1 items-center mt-1">
              <div className="w-8 h-7 bg-slate-700 rounded animate-pulse" />
              <span className="text-slate-600 text-sm">đang tải...</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tabular-nums" style={{ fontFamily: 'Bebas Neue, monospace' }}>{stats.total}</span>
              <span className="text-slate-400 text-sm font-semibold">người dùng</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <Wifi size={14} />
          <span>Live</span>
        </div>
      </div>

      {/* Phân theo thiết bị */}
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Theo thiết bị</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {devices.map(d => {
          const count = stats.byDevice[d.key];
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          return (
            <div key={d.key} className={`flex flex-col gap-2 p-4 rounded-xl border ${d.bg}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{d.icon}</span>
                <span className={`text-xs font-bold ${d.color}`}>{pct}%</span>
              </div>
              <div>
                <p className={`text-xl font-black tabular-nums ${d.color}`} style={{ fontFamily: 'Bebas Neue, monospace' }}>
                  {loading ? <span className="w-5 h-5 inline-block bg-slate-700 rounded animate-pulse align-middle" /> : count}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{d.label}</p>
              </div>
              {/* progress bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${d.key === 'mobile' ? 'bg-sky-400' : d.key === 'desktop' ? 'bg-emerald-400' : d.key === 'tablet' ? 'bg-purple-400' : 'bg-slate-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-600 mt-4 flex items-center gap-1.5">
        <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
        Cập nhật tự động mỗi 30 giây • Dựa trên Firestore Presence
      </p>
    </SectionCard>
  );
}

function MaintenanceSection() {
  const [cfg, setCfg] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeMaintenanceConfig(setCfg);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveMaintenanceConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      console.error('Save maintenance error:', e);
      // Vẫn thành công nếu localStorage đã lưu
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File tối đa 5MB!'); return; }
    const reader = new FileReader();
    reader.onload = ev => setCfg(c => ({ ...c, mediaUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <SectionCard title="Bảo Trì Website" icon={Wrench} color="red">
      {/* Toggle on/off */}
      <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-slate-700/40 mb-5">
        <div>
          <p className="text-sm font-black text-white">Chế độ Bảo Trì</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {cfg.enabled ? '🔴 Đang bật — người dùng thấy trang bảo trì' : '🟢 Đang tắt — website hoạt động bình thường'}
          </p>
        </div>
        <button
          onClick={() => setCfg(c => ({ ...c, enabled: !c.enabled }))}
          className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${cfg.enabled ? 'bg-red-500 border-red-400' : 'bg-slate-700 border-slate-600'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${cfg.enabled ? 'left-7' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Tiêu đề */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">Tiêu đề bảo trì</label>
          <input value={cfg.title} onChange={e => setCfg(c => ({ ...c, title: e.target.value }))}
            className="input-field text-sm" placeholder="Website Đang Bảo Trì" />
        </div>

        {/* Nội dung */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">Thông báo</label>
          <textarea rows={3} value={cfg.message} onChange={e => setCfg(c => ({ ...c, message: e.target.value }))}
            className="input-field text-sm resize-none" placeholder="Chúng tôi đang nâng cấp hệ thống..." />
        </div>

        {/* Thời gian kết thúc */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block flex items-center gap-1">
            <Clock size={11} /> Thời gian kết thúc bảo trì (đếm ngược)
          </label>
          <input type="datetime-local" value={cfg.endTime ? cfg.endTime.slice(0,16) : ''}
            onChange={e => setCfg(c => ({ ...c, endTime: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            className="input-field text-sm" />
          {cfg.endTime && <p className="text-[11px] text-green-400 mt-1">⏱ Sẽ đếm ngược đến: {new Date(cfg.endTime).toLocaleString('vi-VN')}</p>}
        </div>

        {/* Media type */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-2 block">Hiển thị khi bảo trì</label>
          <div className="grid grid-cols-3 gap-2">
            {(['none','image','video'] as const).map(type => (
              <button key={type} onClick={() => setCfg(c => ({ ...c, mediaType: type }))}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${cfg.mediaType === type ? 'bg-green-600/20 border-green-600/60 text-green-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}>
                {type === 'none' ? '🚫 Không có' : type === 'image' ? '🖼 Ảnh' : '🎬 Video'}
              </button>
            ))}
          </div>
        </div>

        {/* Media upload/URL */}
        {cfg.mediaType !== 'none' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold block">
              URL {cfg.mediaType === 'image' ? 'Ảnh' : 'Video'} (hoặc tải lên)
            </label>
            <input value={cfg.mediaUrl} onChange={e => setCfg(c => ({ ...c, mediaUrl: e.target.value }))}
              className="input-field text-sm" placeholder={cfg.mediaType === 'image' ? 'https://... hoặc tải lên bên dưới' : 'https://... link video mp4'} />
            {cfg.mediaType === 'image' && (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 hover:border-green-600/40 transition-all">
                  📁 Tải ảnh từ máy
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </>
            )}
            {/* Preview */}
            {cfg.mediaUrl && cfg.mediaType === 'image' && (
              <div className="rounded-xl overflow-hidden border border-slate-700/40 max-h-40">
                <img src={cfg.mediaUrl} alt="preview" className="w-full max-h-40 object-cover" />
              </div>
            )}
            {cfg.mediaUrl && cfg.mediaType === 'video' && (
              <div className="rounded-xl overflow-hidden border border-slate-700/40">
                <video src={cfg.mediaUrl} controls muted className="w-full max-h-40" />
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <button onClick={save} disabled={saving}
          className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-500 text-slate-950'} disabled:opacity-60`}>
          {saving ? '⏳ Đang lưu...' : saved ? '✅ Đã lưu!' : '💾 Lưu cài đặt bảo trì'}
        </button>
      </div>
    </SectionCard>
  );
}



// ── GeoblockSection ───────────────────────────────────────────────────────────
function GeoblockSection() {
  const [cfg, setCfg] = useState<GeoblockConfig>(DEFAULT_GEOBLOCK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return subscribeGeoblockConfig(setCfg);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveGeoblockConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      console.error('Save geoblock error:', e);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Chặn IP Nước Ngoài" icon={Globe} color="cyan">
      {/* Toggle on/off */}
      <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-slate-700/40 mb-5">
        <div>
          <p className="text-sm font-black text-white">Chặn IP Nước Ngoài</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {cfg.enabled
              ? '🔴 Đang bật — chỉ IP Việt Nam mới xem được'
              : '🟢 Đang tắt — tất cả IP đều truy cập được'}
          </p>
        </div>
        <button
          onClick={() => setCfg(c => ({ ...c, enabled: !c.enabled }))}
          className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${cfg.enabled ? 'bg-cyan-500 border-cyan-400' : 'bg-slate-700 border-slate-600'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${cfg.enabled ? 'left-7' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl mb-5 text-xs text-cyan-300 leading-relaxed">
        <p className="font-bold mb-1">ℹ️ Thông tin</p>
        <p>Khi bật, người dùng có IP ngoài Việt Nam sẽ thấy trang thông báo không thể truy cập. Tính năng áp dụng ngay lập tức cho mọi người dùng mới.</p>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'} disabled:opacity-60`}
      >
        {saving ? '⏳ Đang lưu...' : saved ? '✅ Đã lưu!' : '💾 Lưu cài đặt'}
      </button>
    </SectionCard>
  );
}


// ─── Navigation sections map ─────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'section-realtime',     label: 'Tổng quan',         icon: Activity },
  { id: 'section-brand',        label: 'Logo & Thương hiệu', icon: Palette },
  { id: 'section-movies',       label: 'Phim thủ công',     icon: Film },
  { id: 'section-livestream',   label: 'Livestream',        icon: Radio },
  { id: 'section-upcoming',     label: 'Phim sắp chiếu',    icon: Clock },
  { id: 'section-override',     label: 'Sửa phim API',      icon: Edit3 },
  { id: 'section-ads',          label: 'Quảng cáo',         icon: Megaphone },
  { id: 'section-members',      label: 'Thành viên',        icon: Users },
  { id: 'section-notifications',label: 'Thông báo',         icon: Bell },
  { id: 'section-vip',          label: 'Gói VIP',           icon: Crown },
  { id: 'section-geoblock',     label: 'Chặn IP',           icon: Globe },
  { id: 'section-maintenance',  label: 'Bảo trì',           icon: Wrench },
  { id: 'section-manual-topup', label: 'Nạp thẻ TC',        icon: CreditCard },
  { id: 'section-guide',        label: 'Hướng dẫn',         icon: Info },
];

// ─── Livestream Section (bật/tắt phát trực tiếp + chat realtime) ─────────────
function LivestreamAdminSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [config, setConfig] = useState<LiveConfig>(DEFAULT_LIVE_CONFIG);
  const [form, setForm] = useState<LiveConfig>(DEFAULT_LIVE_CONFIG);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);

  useEffect(() => {
    const unsub = subscribeLiveConfig(cfg => { setConfig(cfg); setForm(cfg); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeLiveChat(setMessages);
    return unsub;
  }, []);

  const handleToggle = async () => {
    const next = !config.enabled;
    await updateLiveConfig({ ...form, enabled: next });
    onToast(next ? '🔴 Đã BẬT phát trực tiếp!' : '⚪ Đã TẮT phát trực tiếp', next ? 'success' : 'error');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLiveConfig(form);
      onToast('✅ Đã lưu cấu hình livestream!');
    } catch {
      onToast('Lỗi khi lưu!', 'error');
    }
    setSaving(false);
  };

  const handleDeleteMsg = async (id: string) => {
    await deleteLiveChatMessage(id);
  };

  const handleClearChat = async () => {
    if (!confirm('Xóa toàn bộ tin nhắn chat của phòng livestream?')) return;
    await clearLiveChat();
    onToast('🧹 Đã xóa toàn bộ chat!');
  };

  return (
    <SectionCard title="Phát Trực Tiếp (Livestream)" icon={Radio} color="red">
      <div className="flex flex-col gap-4">

        {/* Trạng thái + nút bật/tắt */}
        <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <p className="text-white font-bold text-sm">
                {config.enabled ? 'Đang phát trực tiếp' : 'Livestream đang tắt'}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {config.enabled ? 'Người xem sẽ thấy banner nổi bật ở trang chủ' : 'Bật lên để hiện banner + trang xem trực tiếp'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={cn('w-14 h-8 rounded-full transition-colors relative shrink-0', config.enabled ? 'bg-red-500' : 'bg-slate-700')}
          >
            <span className={cn('absolute top-1 w-6 h-6 rounded-full bg-white transition-transform shadow', config.enabled ? 'translate-x-7' : 'translate-x-1')} />
          </button>
        </div>

        {/* Form cấu hình */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Link nhúng (embed) *</label>
            <input
              value={form.embedUrl}
              onChange={e => setForm(f => ({ ...f, embedUrl: e.target.value }))}
              className="input-field text-sm"
              placeholder="https://www.youtube.com/watch?v=... hoặc link Facebook Live / link nhúng khác"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Hỗ trợ YouTube, Facebook Live, hoặc link nhúng khác (VD: abyssplayer...). Link YouTube được chặn tua đầy đủ nhất (ẩn cả thanh tua gốc); các link khác sẽ bị khóa vùng thanh tua ở đáy video bằng lớp phủ, có thể che luôn nút play/pause gốc của player đó.
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Tiêu đề</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field text-sm" placeholder="VD: Trực tiếp sự kiện ra mắt phim" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">URL Poster (banner trang chủ)</label>
            <input value={form.posterUrl} onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))} className="input-field text-sm" placeholder="https://example.com/poster.jpg" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Mô tả</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm resize-none" placeholder="Nội dung ngắn gọn về buổi phát trực tiếp..." />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center disabled:opacity-50">
            <Check size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>

        {/* Chat moderation */}
        <div className="border-t border-slate-800/60 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              Chat realtime <span className="text-slate-500 text-xs font-normal">({messages.length} tin nhắn)</span>
            </p>
            {messages.length > 0 && (
              <button onClick={handleClearChat} className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1">
                <Trash size={12} /> Xóa toàn bộ
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {messages.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-4">Chưa có tin nhắn nào</p>
            ) : (
              [...messages].reverse().map(m => (
                <div key={m.id} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
                  <img src={m.avatar} className="w-6 h-6 rounded-full bg-slate-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-green-400 mr-1.5">{m.username}</span>
                    <span className="text-xs text-slate-300 break-words">{m.text}</span>
                  </div>
                  <button onClick={() => handleDeleteMsg(m.id)} className="text-slate-600 hover:text-red-400 shrink-0" title="Xóa tin nhắn">
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Manual Topup Section ─────────────────────────────────────────────────────
function ManualTopupSection({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [requests, setRequests] = useState<ManualTopupRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [approveAmounts, setApproveAmounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = subscribeManualTopupRequests(setRequests);
    return () => unsub();
  }, []);

  const handleApprove = async (req: ManualTopupRequest) => {
    const actualAmount = approveAmounts[req.id] ?? req.amount;
    const note = notes[req.id] || 'Admin đã duyệt';
    setLoading(prev => ({ ...prev, [req.id]: true }));
    const result = await approveManualTopup(req.id, actualAmount, note);
    setLoading(prev => ({ ...prev, [req.id]: false }));
    if (result.ok) onToast(`✅ Đã duyệt & cộng ${fmtVND(actualAmount)} cho @${req.username}`, 'success');
    else onToast(`❌ ${result.error}`, 'error');
  };

  const handleReject = async (req: ManualTopupRequest) => {
    const note = notes[req.id] || 'Thẻ không hợp lệ';
    setLoading(prev => ({ ...prev, [req.id]: true }));
    const result = await rejectManualTopup(req.id, note);
    setLoading(prev => ({ ...prev, [req.id]: false }));
    if (result.ok) onToast(`🚫 Đã từ chối yêu cầu của @${req.username}`, 'error');
    else onToast(`❌ ${result.error}`, 'error');
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <SectionCard title="Quản lý nạp thẻ thủ công" icon={CreditCard} color="emerald">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Chờ duyệt', count: requests.filter(r => r.status === 'pending').length,  color: 'text-yellow-400' },
          { label: 'Đã duyệt',  count: requests.filter(r => r.status === 'approved').length, color: 'text-emerald-400' },
          { label: 'Từ chối',   count: requests.filter(r => r.status === 'rejected').length, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
            <p className={`text-xl font-black ${stat.color}`}>{stat.count}</p>
            <p className="text-slate-500 text-[11px]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['pending', 'all', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              filter === f
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:border-slate-600'
            }`}
          >
            {f === 'all' ? 'Tất cả' : f === 'pending' ? `Chờ duyệt${pendingCount > 0 ? ` (${pendingCount})` : ''}` : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.map(req => {
          const telcoInfo = MANUAL_TELCOS.find(t => t.value === req.telco);
          const statusInfo = getTopupStatusInfo(req.status);
          const isLoading = loading[req.id];
          return (
            <div key={req.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${telcoInfo?.color || 'bg-slate-500'}`} />
                  <span className="text-white font-bold text-sm">{telcoInfo?.label || req.telco}</span>
                  <span className="text-emerald-400 font-bold text-sm">{fmtVND(req.amount)}</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* User */}
              <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                <span className="text-slate-500">User:</span>
                <span className="text-white font-bold">@{req.username}</span>
                <span className="text-slate-600 text-[10px] ml-auto font-mono">{req.uid.slice(0, 14)}…</span>
              </div>

              {/* Card info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                  <p className="text-slate-600 mb-0.5">Serial</p>
                  <p className="text-white font-mono font-bold break-all">{req.serial}</p>
                </div>
                <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                  <p className="text-slate-600 mb-0.5">Mã thẻ (PIN)</p>
                  <p className="text-white font-mono font-bold break-all">{req.code}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-600">Gửi: {new Date(req.createdAt).toLocaleString('vi-VN')}</p>

              {/* Admin actions - chỉ khi pending */}
              {req.status === 'pending' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 flex-shrink-0 w-28">Cộng tiền (VNĐ):</label>
                    <input
                      type="number"
                      value={approveAmounts[req.id] ?? req.amount}
                      onChange={e => setApproveAmounts(prev => ({ ...prev, [req.id]: Number(e.target.value) }))}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      min={0}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Ghi chú cho user (tuỳ chọn)..."
                    value={notes[req.id] || ''}
                    onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                    >
                      {isLoading
                        ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                        : '✅'
                      }
                      Duyệt & cộng tiền
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 border border-red-500/30 disabled:opacity-50 text-red-300 text-sm font-bold transition-colors"
                    >
                      🚫 Từ chối
                    </button>
                  </div>
                </div>
              )}

              {/* Note khi đã xử lý */}
              {req.status !== 'pending' && req.note && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${statusInfo.bg} ${statusInfo.color}`}>
                  <span className="opacity-70">Ghi chú: </span>{req.note}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-sm">
            {filter === 'pending' ? '🎉 Không có yêu cầu nào đang chờ duyệt.' : 'Không có yêu cầu nào.'}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Admin Sidebar ────────────────────────────────────────────────────────────
function AdminSidebar({ activeSection, onNavigate, onLogout, onSave, onReset, drawerOpen, setDrawerOpen }: any) {
  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25 shrink-0">
            <Shield size={17} className="text-slate-950" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.06em' }}>ĐẢO PHIM</p>
            <p className="text-slate-500 text-[10px] font-semibold">ADMIN PANEL</p>
          </div>
        </div>
        <button onClick={() => setDrawerOpen(false)} className="md:hidden text-slate-500 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_SECTIONS.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-0.5 text-left ${
                isActive
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-slate-800/70 flex flex-col gap-2">
        <button
          onClick={onSave}
          className="w-full bg-green-500 hover:bg-green-400 active:scale-95 text-slate-950 font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
        >
          <Save size={14} /> Lưu tất cả
        </button>
        <div className="flex gap-2">
          <button onClick={onReset} className="flex-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700/50">
            <RefreshCw size={11} /> Reset
          </button>
          <button onClick={onLogout} className="flex-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700/50">
            <LogOut size={11} /> Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-slate-900/95 border-r border-slate-800/60 flex-col z-40 backdrop-blur-xl">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <aside className={`md:hidden fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800/60 flex flex-col z-50 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent />
      </aside>
    </>
  );
}

export default function Admin() {
  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1');

  if (!isAuthed) {
    return <LoginScreen onLogin={() => setIsAuthed(true)} />;
  }

  return <AdminPanel onLogout={() => { sessionStorage.removeItem('admin_auth'); setIsAuthed(false); }} />;
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [settings, setSettings] = useState<typeof DEFAULT_SETTINGS>(() => {
    try { const v = localStorage.getItem('site_settings'); return v ? { ...DEFAULT_SETTINGS, ...JSON.parse(v) } : DEFAULT_SETTINGS; } catch { return DEFAULT_SETTINGS; }
  });

  // Lấy cấu hình thật từ Firestore khi vào trang Admin (localStorage chỉ là cache hiển thị tạm)
  useEffect(() => {
    fetchSiteSettings().then((data) => {
      if (data && Object.keys(data).length > 0) {
        setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...data }));
      }
    });
  }, []);

  const [movies, setMovies] = useState<ManualMovie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<UpcomingMovie[]>([]);

  // Load phim từ Firestore realtime — mọi người dùng đều thấy ngay
  useEffect(() => {
    const unsub = subscribeManualMovies(setMovies);
    return unsub;
  }, []);

  // Load phim sắp chiếu từ collection riêng
  useEffect(() => {
    const unsub = subscribeUpcomingMovies(setUpcomingMovies);
    return unsub;
  }, []);

  // Subscribe yêu cầu nạp thẻ thủ công realtime
  useEffect(() => {
    const unsub = subscribeManualTopupRequests(() => {}); // handled inside component
    return () => unsub();
  }, []);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [movieForm, setMovieForm] = useState<Partial<ManualMovie>>({});
  const [movieEpisodes, setMovieEpisodes] = useState<ManualEpisode[]>([{ label: 'Full', embedUrl: '' }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMovieForm, setShowMovieForm] = useState(false);

  // State cho form phim sắp chiếu riêng
  const [upcomingForm, setUpcomingForm] = useState<Partial<UpcomingMovie>>({});
  const [editingUpcomingId, setEditingUpcomingId] = useState<string | null>(null);
  const [showUpcomingForm, setShowUpcomingForm] = useState(false);

  // State cho movie overrides
  const [overrides, setOverrides] = useState<MovieOverride[]>([]);
  const [overrideForm, setOverrideForm] = useState<Partial<MovieOverride>>({});
  const [overrideSearchSlug, setOverrideSearchSlug] = useState('');
  const [overrideSearching, setOverrideSearching] = useState(false);
  const [overrideApiMovie, setOverrideApiMovie] = useState<any>(null);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  useEffect(() => {
    const unsub = subscribeOverrides(setOverrides);
    return unsub;
  }, []);

  const searchMovieForOverride = async () => {
    if (!overrideSearchSlug.trim()) return;
    setOverrideSearching(true);
    try {
      const { movieApi } = await import('../services/api');
      const res = await movieApi.getMovieDetail(overrideSearchSlug.trim());
      if (res.movie) {
        setOverrideApiMovie(res.movie);
        // Load existing override if any
        const existing = await getMovieOverride(overrideSearchSlug.trim());
        setOverrideForm(existing || {
          slug: overrideSearchSlug.trim(),
          name: res.movie.name || '',
          origin_name: res.movie.origin_name || '',
          content: res.movie.content || '',
          year: String(res.movie.year || ''),
          quality: res.movie.quality || '',
          lang: res.movie.lang || '',
          time: res.movie.time || '',
          status: res.movie.status || '',
          actor: res.movie.actor || [],
          director: res.movie.director || [],
        });
        setShowOverrideForm(true);
      } else {
        showToast('Không tìm thấy phim!', 'error');
      }
    } catch {
      showToast('Lỗi khi tìm phim!', 'error');
    }
    setOverrideSearching(false);
  };

  const saveOverride = async () => {
    if (!overrideForm.slug) return;
    try {
      await saveMovieOverride({
        ...overrideForm,
        slug: overrideForm.slug,
        updatedAt: Date.now(),
      } as MovieOverride);
      showToast('✅ Đã lưu chỉnh sửa phim!');
      setShowOverrideForm(false);
      setOverrideApiMovie(null);
      setOverrideSearchSlug('');
    } catch {
      showToast('Lỗi khi lưu!', 'error');
    }
  };

  const deleteOverride = async (slug: string) => {
    if (!confirm('Xóa chỉnh sửa? Phim sẽ về data gốc từ API.')) return;
    try {
      await deleteMovieOverride(slug);
      showToast('Đã xóa, phim về data gốc!');
    } catch {
      showToast('Lỗi!', 'error');
    }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Sidebar navigation state ──────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('section-realtime');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const saveSettings = async () => {
    try {
      await saveSiteSettingsFirestore(settings);
      showToast('Đã lưu cài đặt thành công! (áp dụng cho mọi người dùng)');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi lưu cài đặt lên máy chủ!', 'error');
    }
  };

  // saveMovies không còn dùng localStorage — Firestore subscription tự cập nhật state

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('File quá lớn! Tối đa 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings(s => ({ ...s, logoImage: ev.target?.result as string, logoType: 'image' }));
      showToast('Đã tải logo lên!');
    };
    reader.readAsDataURL(file);
  };

  const submitMovie = async () => {
    const validEpisodes = movieEpisodes.filter(e => e.embedUrl.trim());
    const firstEpisodeUrl = validEpisodes[0]?.embedUrl || movieForm.embedUrl || '';
    if (!movieForm.name || !firstEpisodeUrl) { showToast('Vui lòng điền tên phim và ít nhất 1 link nhúng!', 'error'); return; }
    try {
      // Helper: strip undefined values so Firestore doesn't reject
      const clean = <T extends object>(obj: T): T =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

      if (editingId) {
        const updateData = clean({
          name: movieForm.name || '',
          originName: movieForm.originName || '',
          year: movieForm.year || new Date().getFullYear().toString(),
          quality: movieForm.quality || 'HD',
          lang: movieForm.lang || 'Vietsub',
          type: movieForm.type || 'phim-le',
          status: movieForm.status || 'Hoàn thành',
          posterUrl: movieForm.posterUrl || '',
          embedUrl: firstEpisodeUrl,
          episodes: validEpisodes.length > 1 ? validEpisodes : undefined,
          description: movieForm.description || '',
          isUpcoming: movieForm.isUpcoming || false,
          releaseDate: movieForm.releaseDate || '',
          upcomingType: movieForm.upcomingType || 'movie',
          airingDay: movieForm.airingDay || '',
          airingTime: movieForm.airingTime || '',
          watermarkEnabled: movieForm.watermarkEnabled || false,
          watermarkType: movieForm.watermarkType || 'marquee',
          watermarkText: movieForm.watermarkText || '',
          watermarkLogoUrl: movieForm.watermarkLogoUrl || '',
          watermarkPosition: movieForm.watermarkPosition || 'bottom',
        });
        await updateManualMovie(editingId, updateData as Partial<ManualMovie>);
        showToast('Đã cập nhật phim!');
      } else {
        const newMovie = clean({
          name: movieForm.name || '',
          originName: movieForm.originName || '',
          year: movieForm.year || new Date().getFullYear().toString(),
          quality: movieForm.quality || 'HD',
          lang: movieForm.lang || 'Vietsub',
          type: movieForm.type || 'phim-le',
          status: movieForm.status || 'Hoàn thành',
          posterUrl: movieForm.posterUrl || '',
          embedUrl: firstEpisodeUrl,
          episodes: validEpisodes.length > 1 ? validEpisodes : undefined,
          description: movieForm.description || '',
          isUpcoming: movieForm.isUpcoming || false,
          releaseDate: movieForm.releaseDate || '',
          upcomingType: movieForm.upcomingType || 'movie',
          airingDay: movieForm.airingDay || '',
          airingTime: movieForm.airingTime || '',
          watermarkEnabled: movieForm.watermarkEnabled || false,
          watermarkType: movieForm.watermarkType || 'marquee',
          watermarkText: movieForm.watermarkText || '',
          watermarkLogoUrl: movieForm.watermarkLogoUrl || '',
          watermarkPosition: movieForm.watermarkPosition || 'bottom',
          createdAt: Date.now(),
        });
        const newId = await createManualMovie(newMovie as Omit<ManualMovie, 'id'>);
        showToast('Đã thêm phim mới! 🎬');
        notifyManualMovie({ ...newMovie, id: newId || '' } as ManualMovie);
      }
    } catch (err) {
      console.error('[submitMovie] Lỗi:', err);
      showToast('Lỗi khi lưu phim: ' + (err instanceof Error ? err.message : String(err)), 'error');
      return;
    }
    setMovieForm({});
    setMovieEpisodes([{ label: 'Full', embedUrl: '' }]);
    setEditingId(null);
    setShowMovieForm(false);
  };

  const deleteMovie = async (id: string) => {
    if (!confirm('Xóa phim này?')) return;
    try {
      await deleteManualMovie(id);
      showToast('Đã xóa phim!');
    } catch { showToast('Lỗi khi xóa phim!', 'error'); }
  };

  const editMovie = (movie: ManualMovie) => {
    setMovieForm(movie);
    // Restore episodes: use existing episodes array, or create from embedUrl fallback
    if (movie.episodes && movie.episodes.length > 0) {
      setMovieEpisodes(movie.episodes);
    } else {
      setMovieEpisodes([{ label: 'Full', embedUrl: movie.embedUrl || '' }]);
    }
    setEditingId(movie.id);
    setShowMovieForm(true);
    setTimeout(() => { const el = document.getElementById("movie-form-section"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  };

  // ── CRUD phim sắp chiếu (collection riêng) ──
  const submitUpcoming = async () => {
    if (!upcomingForm.name) { showToast('Vui lòng điền tên phim!', 'error'); return; }
    try {
      if (editingUpcomingId) {
        await updateUpcomingMovie(editingUpcomingId, upcomingForm as Partial<UpcomingMovie>);
        showToast('Đã cập nhật phim sắp chiếu!');
      } else {
        await createUpcomingMovie({
          name: upcomingForm.name || '',
          originName: upcomingForm.originName || '',
          year: upcomingForm.year || new Date().getFullYear().toString(),
          posterUrl: upcomingForm.posterUrl || '',
          description: upcomingForm.description || '',
          releaseDate: upcomingForm.releaseDate || '',
          upcomingType: upcomingForm.upcomingType || 'movie',
          trailerUrl: upcomingForm.trailerUrl || '',
          genres: upcomingForm.genres || [],
          createdAt: Date.now(),
        });
        showToast('Đã thêm phim sắp chiếu!');
      }
    } catch { showToast('Lỗi khi lưu!', 'error'); return; }
    setUpcomingForm({});
    setEditingUpcomingId(null);
    setShowUpcomingForm(false);
  };

  const deleteUpcomingItem = async (id: string) => {
    if (!confirm('Xóa phim sắp chiếu này?')) return;
    try {
      await deleteUpcomingMovie(id);
      showToast('Đã xóa!');
    } catch { showToast('Lỗi khi xóa!', 'error'); }
  };

  const editUpcoming = (movie: UpcomingMovie) => {
    setUpcomingForm(movie);
    setEditingUpcomingId(movie.id);
    setShowUpcomingForm(true);
    setTimeout(() => { const el = document.getElementById("upcoming-form-section"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  };

  const resetSettings = async () => {
    if (!confirm('Khôi phục cài đặt mặc định?')) return;
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('site_settings');
    try { await saveSiteSettingsFirestore(DEFAULT_SETTINGS); } catch (e) { console.error(e); }
    window.dispatchEvent(new Event('site_settings_updated'));
    showToast('Đã khôi phục cài đặt mặc định!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onLogout={onLogout}
        onSave={saveSettings}
        onReset={resetSettings}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />

      {/* Mobile overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 min-h-screen">
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 md:hidden">
          {/* Top row */}
          <div className="h-14 flex items-center justify-between px-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300"
            >
              <Layout size={16} />
            </button>
            <span className="text-white font-black text-sm tracking-widest" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {NAV_SECTIONS.find(s => s.id === activeSection)?.label?.toUpperCase() || 'ADMIN PANEL'}
            </span>
            <button onClick={saveSettings} className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors">
              <Save size={12} /> Lưu
            </button>
          </div>
          {/* Scrollable section tabs */}
          <div className="flex overflow-x-auto scrollbar-hide px-3 pb-2 gap-2">
            {NAV_SECTIONS.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); window.scrollTo({ top: 0 }); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 ${
                    isActive
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={11} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page title — desktop */}
        <div className="hidden md:flex items-center justify-between px-8 pt-8 pb-2">
          <div>
            <h1 className="text-4xl font-black text-white tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {NAV_SECTIONS.find(s => s.id === activeSection)?.label || 'Quản lý'} <span className="animated-gradient-text">Admin</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Cài đặt website và quản lý nội dung</p>
          </div>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="pt-24 md:pt-0 pb-20 px-4 md:px-8 max-w-4xl mx-auto flex flex-col gap-4">

          {/* REALTIME USERS */}
          {activeSection === 'section-realtime' && (
          <div id="section-realtime">
            <RealtimeUsersSection />
          </div>
          )}

          {/* LOGO & THƯƠNG HIỆU */}
          {activeSection === 'section-brand' && (
          <div id="section-brand">
            <SectionCard title="Logo & Thương hiệu" icon={Palette} color="indigo">
              <div className="flex flex-col gap-5 pt-4">
                <InputRow label="Kiểu Logo" hint="Chọn cách hiển thị logo">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'icon', label: '🎬 Icon mặc định' },
                    { value: 'image', label: '🖼️ Hình ảnh' },
                    { value: 'text', label: '✏️ Chỉ chữ' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings(s => ({ ...s, logoType: opt.value as any }))}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${settings.logoType === opt.value ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </InputRow>

              {settings.logoType === 'image' && (
                <InputRow label="Upload Logo" hint="PNG/SVG, tối đa 2MB">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-sm text-slate-300 hover:bg-slate-700 transition-all">
                        <Upload size={16} /> Chọn ảnh logo
                      </button>
                      {settings.logoImage && (
                        <button onClick={() => setSettings(s => ({ ...s, logoImage: '' }))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                          <X size={14} /> Xóa
                        </button>
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    {settings.logoImage && (
                      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40 w-fit">
                        <img src={settings.logoImage} alt="Logo preview" className="h-10 object-contain" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Hoặc nhập URL ảnh</label>
                      <input type="url" placeholder="https://example.com/logo.png" value={settings.logoImage} onChange={e => setSettings(s => ({ ...s, logoImage: e.target.value }))} className="input-field text-sm" />
                    </div>
                  </div>
                </InputRow>
              )}

              {settings.logoType === 'text' && (
                <InputRow label="Chữ Logo">
                  <input type="text" value={settings.logoText} onChange={e => setSettings(s => ({ ...s, logoText: e.target.value }))} className="input-field" placeholder="ĐẢO PHIM" />
                </InputRow>
              )}

              <InputRow label="Tên Website">
                <input type="text" value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} className="input-field" placeholder="ĐẢO PHIM" />
              </InputRow>

              <InputRow label="Mô tả Website" hint="Hiển thị ở footer">
                <textarea rows={3} value={settings.siteDescription} onChange={e => setSettings(s => ({ ...s, siteDescription: e.target.value }))} className="input-field resize-none" placeholder="Website xem phim..." />
              </InputRow>

              <InputRow label="Email đặt quảng cáo" hint="Hiển thị ở phần liên hệ đặt ads cuối trang">
                <input type="email" value={settings.adsEmail} onChange={e => setSettings(s => ({ ...s, adsEmail: e.target.value }))} className="input-field" placeholder="adsdaophim@gmail.com" />
              </InputRow>

              <InputRow label="Telegram đặt quảng cáo" hint="Username Telegram (không cần @), hiển thị thêm nút Telegram cạnh email ở footer. Để trống nếu không muốn hiện.">
                <input type="text" value={settings.adsTelegram || ''} onChange={e => setSettings(s => ({ ...s, adsTelegram: e.target.value.replace(/^@/, '') }))} className="input-field" placeholder="daophim_ads" />
              </InputRow>

              <InputRow label="Cảnh báo copy (trang Up phim thủ công)" hint="Hiển thị dưới video ở trang xem phim up thủ công.">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, manualCopyWarningEnabled: !s.manualCopyWarningEnabled }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors shrink-0',
                      settings.manualCopyWarningEnabled ? 'bg-green-500' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                        settings.manualCopyWarningEnabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                  <span className="text-sm text-slate-300">
                    {settings.manualCopyWarningEnabled ? 'Đang bật — hiện trên trang xem phim' : 'Đang tắt — ẩn hoàn toàn'}
                  </span>
                </div>
                <textarea rows={2} value={settings.manualCopyWarning || ''} onChange={e => setSettings(s => ({ ...s, manualCopyWarning: e.target.value }))} className="input-field resize-none" placeholder="Video thuộc bản quyền độc quyền..." disabled={!settings.manualCopyWarningEnabled} />
              </InputRow>
            </div>
            </SectionCard>
          </div>
          )}

          {/* QUẢN LÝ PHIM THỦ CÔNG */}
          {activeSection === 'section-movies' && (
          <div id="section-movies" className="flex flex-col gap-6">
            <SectionCard title="Quản lý phim thủ công" icon={Film} color="orange">
              <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Tổng: <span className="text-white font-bold">{movies.length}</span> phim thủ công
                </p>
                <button onClick={() => { setMovieForm({}); setMovieEpisodes([{ label: 'Full', embedUrl: '' }]); setEditingId(null); setShowMovieForm(v => !v); }} className="btn-primary flex items-center gap-2 text-sm py-2">
                  {showMovieForm ? <X size={16} /> : <Plus size={16} />}
                  {showMovieForm ? 'Đóng form' : 'Thêm phim mới'}
                </button>
              </div>

              {showMovieForm && (
                <div id="movie-form-section" className="bg-slate-800/40 border border-indigo-500/30 rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-white text-base">{editingId ? '✏️ Chỉnh sửa phim' : '➕ Thêm phim mới'}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên phim *</label>
                      <input value={movieForm.name || ''} onChange={e => setMovieForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Tên tiếng Việt" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên gốc</label>
                      <input value={movieForm.originName || ''} onChange={e => setMovieForm(f => ({ ...f, originName: e.target.value }))} className="input-field text-sm" placeholder="Original title" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Năm</label>
                      <input value={movieForm.year || ''} onChange={e => setMovieForm(f => ({ ...f, year: e.target.value }))} className="input-field text-sm" placeholder="2025" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Chất lượng</label>
                      <select value={movieForm.quality || 'HD'} onChange={e => setMovieForm(f => ({ ...f, quality: e.target.value }))} className="input-field text-sm">
                        <option>HD</option><option>FHD</option><option>4K</option><option>CAM</option><option>SD</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Ngôn ngữ</label>
                      <select value={movieForm.lang || 'Vietsub'} onChange={e => setMovieForm(f => ({ ...f, lang: e.target.value }))} className="input-field text-sm">
                        <option>Vietsub</option><option>Lồng Tiếng</option><option>Thuyết Minh</option><option>Nguyên bản</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Loại phim</label>
                      <select value={movieForm.type || 'phim-le'} onChange={e => setMovieForm(f => ({ ...f, type: e.target.value }))} className="input-field text-sm">
                        <option value="phim-le">Phim lẻ</option>
                        <option value="phim-bo">Phim bộ</option>
                        <option value="hoat-hinh">Hoạt hình</option>
                        <option value="phim-chieu-rap">Chiếu rạp</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      URL Poster / Thumbnail
                    </label>
                    <input value={movieForm.posterUrl || ''} onChange={e => setMovieForm(f => ({ ...f, posterUrl: e.target.value }))} className="input-field text-sm" placeholder="https://example.com/poster.jpg" />
                  </div>
                  {/* ── Multi-episode editor ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        Danh sách tập *
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Bắt buộc</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setMovieEpisodes(eps => [...eps, { label: `Tập ${eps.length + 1}`, embedUrl: '' }])}
                        className="text-[11px] bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                      >
                        + Thêm tập
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {movieEpisodes.map((ep, idx) => {
                        const isM3u8 = /\.m3u8($|\?)/i.test(ep.embedUrl.trim());
                        return (
                        <div key={idx} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                          <input
                            value={ep.label}
                            onChange={e => setMovieEpisodes(eps => eps.map((ep2, i) => i === idx ? { ...ep2, label: e.target.value } : ep2))}
                            className="input-field text-sm w-24 shrink-0"
                            placeholder="Tập 1"
                          />
                          <div className="flex-1 min-w-0 relative">
                            <input
                              value={ep.embedUrl}
                              onChange={e => setMovieEpisodes(eps => eps.map((ep2, i) => i === idx ? { ...ep2, embedUrl: e.target.value } : ep2))}
                              className={`input-field text-sm w-full ${isM3u8 ? 'pr-16' : ''}`}
                              placeholder="https://player.phim.vn/embed/... hoặc https://cdn.example.com/video.m3u8"
                            />
                            {isM3u8 && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded-full font-bold pointer-events-none select-none">M3U8</span>
                            )}
                          </div>
                          {movieEpisodes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setMovieEpisodes(eps => eps.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-300 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-base font-bold"
                              title="Xóa tập"
                            >×</button>
                          )}
                        </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">Phim lẻ: 1 tập "Full". Phim bộ: thêm từng tập (Tập 1, Tập 2...). Hỗ trợ link embed và link M3U8 (.m3u8).</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Mô tả</label>
                    <textarea rows={3} value={movieForm.description || ''} onChange={e => setMovieForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm resize-none" placeholder="Nội dung phim..." />
                  </div>

                  {/* ── Phim sắp chiếu ── */}
                  <div className="border border-green-600/30 rounded-xl p-4 bg-green-600/5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 text-sm font-black">🎬 Phim Sắp Chiếu</span>
                      <span className="text-[10px] text-slate-500">(Hiển thị vào section "Anime/Phim Sắp Chiếu")</span>
                    </div>
                    {/* Toggle sắp chiếu */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400 font-semibold">Đánh dấu là Sắp Chiếu</label>
                      <button
                        onClick={() => setMovieForm(f => ({ ...f, isUpcoming: !f.isUpcoming }))}
                        className={`w-11 h-6 rounded-full border transition-all relative ${movieForm.isUpcoming ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${movieForm.isUpcoming ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {movieForm.isUpcoming && (
                      <>
                        {/* Ngày ra mắt */}
                        <div>
                          <label className="text-xs text-slate-400 font-semibold mb-1 block">Ngày / Thời gian ra mắt</label>
                          <input value={movieForm.releaseDate || ''} onChange={e => setMovieForm(f => ({ ...f, releaseDate: e.target.value }))}
                            className="input-field text-sm" placeholder="VD: 15/06/2025 hoặc Quý 3 2025" />
                        </div>
                        {/* Loại sắp chiếu */}
                        <div>
                          <label className="text-xs text-slate-400 font-semibold mb-1 block">Phân loại</label>
                          <select value={movieForm.upcomingType || 'anime'} onChange={e => setMovieForm(f => ({ ...f, upcomingType: e.target.value as any }))} className="input-field text-sm">
                            <option value="anime">Anime Sắp Chiếu</option>
                            <option value="movie">Phim Lẻ Sắp Chiếu</option>
                            <option value="series">Phim Bộ Sắp Chiếu</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  {/* ── Lịch chiếu ── */}
                  <div className="border border-blue-600/30 rounded-xl p-4 bg-blue-600/5 flex flex-col gap-3">
                    <span className="text-blue-400 text-sm font-black">📅 Lịch Chiếu (tùy chọn)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 font-semibold mb-1 block">Ngày chiếu</label>
                        <select value={movieForm.airingDay || ''} onChange={e => setMovieForm(f => ({ ...f, airingDay: e.target.value }))} className="input-field text-sm">
                          <option value="">-- Không có --</option>
                          <option value="Thứ 2">Thứ 2</option>
                          <option value="Thứ 3">Thứ 3</option>
                          <option value="Thứ 4">Thứ 4</option>
                          <option value="Thứ 5">Thứ 5</option>
                          <option value="Thứ 6">Thứ 6</option>
                          <option value="Thứ 7">Thứ 7</option>
                          <option value="Chủ nhật">Chủ nhật</option>
                          <option value="Hàng ngày">Hàng ngày</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-semibold mb-1 block">Giờ chiếu</label>
                        <input value={movieForm.airingTime || ''} onChange={e => setMovieForm(f => ({ ...f, airingTime: e.target.value }))} className="input-field text-sm" placeholder="VD: 9:30 Tối" />
                      </div>
                    </div>
                  </div>

                  {/* ── Bảo vệ phim (Watermark) ── */}
                  <div className="border border-orange-500/30 rounded-xl p-4 bg-orange-500/5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={14} className="text-orange-400" />
                      <span className="text-orange-400 text-sm font-black">🛡️ Bảo Vệ Phim (Watermark)</span>
                    </div>
                    {/* Toggle bật/tắt */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400 font-semibold">Bật watermark cho phim này</label>
                      <button
                        onClick={() => setMovieForm(f => ({ ...f, watermarkEnabled: !f.watermarkEnabled }))}
                        className={`w-11 h-6 rounded-full border transition-all relative ${movieForm.watermarkEnabled ? 'bg-orange-500 border-orange-400' : 'bg-slate-700 border-slate-600'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${movieForm.watermarkEnabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {movieForm.watermarkEnabled && (
                      <>
                        {/* Loại watermark */}
                        <div>
                          <label className="text-xs text-slate-400 font-semibold mb-1 block">Kiểu bảo vệ</label>
                          <select
                            value={movieForm.watermarkType || 'marquee'}
                            onChange={e => setMovieForm(f => ({ ...f, watermarkType: e.target.value as any }))}
                            className="input-field text-sm"
                          >
                            <option value="marquee">📜 Dòng chữ chạy ngang</option>
                            <option value="logo">🏷️ Logo cố định góc</option>
                            <option value="both">✨ Cả hai (chữ chạy + logo)</option>
                          </select>
                        </div>
                        {/* Nội dung chữ chạy */}
                        {(movieForm.watermarkType === 'marquee' || movieForm.watermarkType === 'both' || !movieForm.watermarkType) && (
                          <>
                            <div>
                              <label className="text-xs text-slate-400 font-semibold mb-1 block">Nội dung chữ chạy</label>
                              <input
                                value={movieForm.watermarkText || ''}
                                onChange={e => setMovieForm(f => ({ ...f, watermarkText: e.target.value }))}
                                className="input-field text-sm"
                                placeholder="VD: Chỉ xem tại ĐảoPhim.com • Không reup!"
                              />
                              <p className="text-[10px] text-slate-600 mt-1">Để trống = dùng tên phim + tên site tự động</p>
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 font-semibold mb-1 block">Vị trí chữ chạy</label>
                              <select
                                value={movieForm.watermarkPosition || 'bottom'}
                                onChange={e => setMovieForm(f => ({ ...f, watermarkPosition: e.target.value as any }))}
                                className="input-field text-sm"
                              >
                                <option value="top">Trên cùng</option>
                                <option value="bottom">Dưới cùng</option>
                                <option value="random">Ngẫu nhiên (khó xóa hơn)</option>
                              </select>
                            </div>
                          </>
                        )}
                        {/* Logo URL riêng */}
                        {(movieForm.watermarkType === 'logo' || movieForm.watermarkType === 'both') && (
                          <div>
                            <label className="text-xs text-slate-400 font-semibold mb-1 block">URL Logo riêng (tùy chọn)</label>
                            <input
                              value={movieForm.watermarkLogoUrl || ''}
                              onChange={e => setMovieForm(f => ({ ...f, watermarkLogoUrl: e.target.value }))}
                              className="input-field text-sm"
                              placeholder="Để trống = dùng logo site mặc định"
                            />
                          </div>
                        )}
                        <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                          <AlertCircle size={13} className="text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-orange-300 leading-relaxed">
                            Watermark hiện đè lên player, giúp bảo vệ nguồn phim khỏi bị reup lên nơi khác.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={submitMovie} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                      <Check size={16} /> {editingId ? 'Cập nhật phim' : 'Thêm phim'}
                    </button>
                    <button onClick={() => { setShowMovieForm(false); setMovieForm({}); setMovieEpisodes([{ label: 'Full', embedUrl: '' }]); setEditingId(null); }} className="btn-icon px-4 text-sm text-slate-400">
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {movies.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {movies.map(movie => (
                    <div
                      key={movie.id}
                      onClick={() => editMovie(movie)}
                      className={`flex items-center gap-3 p-3 border rounded-xl transition-all cursor-pointer active:scale-[0.98] ${editingId === movie.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-800/40 border-slate-700/30 hover:border-indigo-500/40 hover:bg-slate-800/70'}`}
                    >
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.name} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                          <Film size={16} className="text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{movie.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{movie.year}</span>
                          <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">{movie.quality}</span>
                          <span>{movie.lang}</span>
                        </div>
                        <div className="text-[10px] text-indigo-400 mt-1 font-bold">
                          {editingId === movie.id ? '✏️ Đang chỉnh sửa...' : 'Nhấn để sửa'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); editMovie(movie); }}
                          className="btn-icon p-2.5 hover:border-indigo-500/40 hover:text-indigo-400"
                          title="Sửa"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteMovie(movie.id); }}
                          className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-600">
                  <Film size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chưa có phim thủ công nào.</p>
                  <p className="text-xs mt-1">Nhấn "Thêm phim mới" để bắt đầu.</p>
                </div>
              )}
            </div>

            </SectionCard>
          </div>
          )}

          {/* LIVESTREAM — tách riêng, độc lập hoàn toàn với Phim thủ công */}
          {activeSection === 'section-livestream' && (
          <div id="section-livestream">
            <LivestreamAdminSection onToast={showToast} />
          </div>
          )}

          {/* PHIM SẮP CHIẾU RẠP */}
          {activeSection === 'section-upcoming' && (
          <div id="section-upcoming">
            <SectionCard title="Phim Sắp Chiếu Rạp" icon={Film} color="green">
              <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Tổng: <span className="text-white font-bold">{upcomingMovies.length}</span> phim sắp chiếu
                  <span className="text-xs text-green-400 ml-2">• Hiển thị trên trang chủ cho mọi người</span>
                </p>
                <button onClick={() => { setUpcomingForm({ upcomingType: 'movie' }); setEditingUpcomingId(null); setShowUpcomingForm(v => !v); }} className="btn-primary flex items-center gap-2 text-sm py-2">
                  {showUpcomingForm ? <X size={16} /> : <Plus size={16} />}
                  {showUpcomingForm ? 'Đóng form' : 'Thêm phim sắp chiếu'}
                </button>
              </div>

              {showUpcomingForm && (
                <div id="upcoming-form-section" className="bg-slate-800/40 border border-green-500/30 rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-white text-base">{editingUpcomingId ? '✏️ Chỉnh sửa' : '🎬 Thêm phim sắp chiếu'}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên phim *</label>
                      <input value={upcomingForm.name || ''} onChange={e => setUpcomingForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Tên tiếng Việt" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên gốc</label>
                      <input value={upcomingForm.originName || ''} onChange={e => setUpcomingForm(f => ({ ...f, originName: e.target.value }))} className="input-field text-sm" placeholder="Original title" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Năm</label>
                      <input value={upcomingForm.year || ''} onChange={e => setUpcomingForm(f => ({ ...f, year: e.target.value }))} className="input-field text-sm" placeholder="2026" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Loại</label>
                      <select value={upcomingForm.upcomingType || 'movie'} onChange={e => setUpcomingForm(f => ({ ...f, upcomingType: e.target.value as any }))} className="input-field text-sm">
                        <option value="movie">🎬 Phim Lẻ Sắp Chiếu Rạp</option>
                        <option value="anime">🌸 Anime Sắp Chiếu</option>
                        <option value="series">📺 Phim Bộ Sắp Chiếu</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">📅 Ngày ra mắt</label>
                      <input value={upcomingForm.releaseDate || ''} onChange={e => setUpcomingForm(f => ({ ...f, releaseDate: e.target.value }))} className="input-field text-sm" placeholder="VD: 22/5/2026 hoặc Quý 3 2026" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">🔗 Trailer URL</label>
                      <input value={upcomingForm.trailerUrl || ''} onChange={e => setUpcomingForm(f => ({ ...f, trailerUrl: e.target.value }))} className="input-field text-sm" placeholder="https://youtube.com/..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">URL Poster</label>
                    <input value={upcomingForm.posterUrl || ''} onChange={e => setUpcomingForm(f => ({ ...f, posterUrl: e.target.value }))} className="input-field text-sm" placeholder="https://example.com/poster.jpg" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Mô tả</label>
                    <textarea rows={3} value={upcomingForm.description || ''} onChange={e => setUpcomingForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm resize-none" placeholder="Nội dung phim..." />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={submitUpcoming} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                      <Check size={16} /> {editingUpcomingId ? 'Cập nhật' : 'Thêm phim'}
                    </button>
                    <button onClick={() => { setShowUpcomingForm(false); setUpcomingForm({}); setEditingUpcomingId(null); }} className="btn-icon px-4 text-sm text-slate-400">
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {upcomingMovies.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {upcomingMovies.map(movie => (
                    <div key={movie.id} onClick={() => editUpcoming(movie)}
                      className={`flex items-center gap-3 p-3 border rounded-xl transition-all cursor-pointer active:scale-[0.98] ${editingUpcomingId === movie.id ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-800/40 border-slate-700/30 hover:border-green-500/40 hover:bg-slate-800/70'}`}>
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.name} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                          <Film size={16} className="text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{movie.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          {movie.releaseDate && <span className="text-green-400 font-bold">📅 {movie.releaseDate}</span>}
                          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold">
                            {movie.upcomingType === 'movie' ? '🎬 Chiếu rạp' : movie.upcomingType === 'anime' ? '🌸 Anime' : '📺 Phim bộ'}
                          </span>
                        </div>
                        <div className="text-[10px] text-green-400 mt-1 font-bold">
                          {editingUpcomingId === movie.id ? '✏️ Đang chỉnh sửa...' : 'Nhấn để sửa'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={e => { e.stopPropagation(); editUpcoming(movie); }} className="btn-icon p-2.5 hover:border-green-500/40 hover:text-green-400"><Edit3 size={15} /></button>
                        <button onClick={e => { e.stopPropagation(); deleteUpcomingItem(movie.id); }} className="btn-icon p-2.5 hover:border-red-500/40 hover:text-red-400"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-600">
                  <Film size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chưa có phim sắp chiếu nào.</p>
                  <p className="text-xs mt-1 text-slate-500">Thêm phim để hiển thị section "Phim Sắp Chiếu Rạp" trên trang chủ cho mọi người xem.</p>
                </div>
              )}
            </div>

            </SectionCard>
          </div>
          )}

          {/* CHỈNH SỬA PHIM API */}
          {activeSection === 'section-override' && (
          <div id="section-override">
            <SectionCard title="Chỉnh sửa thông tin phim API" icon={Film} color="blue">
              <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-400">
                Tìm phim theo slug → chỉnh sửa tên, mô tả, diễn viên... → lưu lên Firestore. Web sẽ hiển thị thông tin đã chỉnh thay vì data gốc từ KKPhim.
              </p>

              {/* Search box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={overrideSearchSlug}
                  onChange={e => setOverrideSearchSlug(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMovieForOverride()}
                  className="input-field flex-1 text-sm"
                  placeholder="Nhập slug phim, VD: cu-soc, doraemon-movie-45..."
                />
                <button
                  onClick={searchMovieForOverride}
                  disabled={overrideSearching}
                  className="btn-primary px-4 text-sm whitespace-nowrap"
                >
                  {overrideSearching ? '...' : '🔍 Tìm'}
                </button>
              </div>

              {/* Edit form */}
              {showOverrideForm && overrideApiMovie && (
                <div className="bg-slate-800/40 border border-blue-500/30 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    {overrideApiMovie.thumb_url && (
                      <img src={overrideApiMovie.thumb_url.startsWith('http') ? overrideApiMovie.thumb_url : `https://phimimg.com/${overrideApiMovie.thumb_url}`}
                        alt="" className="w-12 h-16 object-cover rounded-lg" />
                    )}
                    <div>
                      <p className="font-bold text-white text-sm">{overrideApiMovie.name}</p>
                      <p className="text-xs text-slate-500">slug: {overrideForm.slug}</p>
                      <p className="text-[10px] text-blue-400 mt-1">✏️ Đang chỉnh sửa — data gốc từ KKPhim API</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên tiếng Việt</label>
                      <input type="text" value={overrideForm.name || ''} onChange={e => setOverrideForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder={overrideApiMovie.name} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Tên gốc</label>
                      <input type="text" value={overrideForm.origin_name || ''} onChange={e => setOverrideForm(f => ({ ...f, origin_name: e.target.value }))} className="input-field text-sm" placeholder={overrideApiMovie.origin_name} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Năm</label>
                      <input type="text" value={overrideForm.year || ''} onChange={e => setOverrideForm(f => ({ ...f, year: e.target.value }))} className="input-field text-sm" placeholder={String(overrideApiMovie.year)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Chất lượng</label>
                      <select value={overrideForm.quality || ''} onChange={e => setOverrideForm(f => ({ ...f, quality: e.target.value }))} className="input-field text-sm">
                        <option value="">-- Giữ nguyên ({overrideApiMovie.quality}) --</option>
                        <option value="HD">HD</option>
                        <option value="FHD">FHD</option>
                        <option value="4K">4K</option>
                        <option value="CAM">CAM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Ngôn ngữ</label>
                      <select value={overrideForm.lang || ''} onChange={e => setOverrideForm(f => ({ ...f, lang: e.target.value }))} className="input-field text-sm">
                        <option value="">-- Giữ nguyên ({overrideApiMovie.lang}) --</option>
                        <option value="Vietsub">Vietsub</option>
                        <option value="Lồng Tiếng">Lồng Tiếng</option>
                        <option value="Thuyết Minh">Thuyết Minh</option>
                        <option value="Nguyên Bản">Nguyên Bản</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Thời lượng</label>
                      <input type="text" value={overrideForm.time || ''} onChange={e => setOverrideForm(f => ({ ...f, time: e.target.value }))} className="input-field text-sm" placeholder={overrideApiMovie.time || 'VD: 45 phút/tập'} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">Trạng thái</label>
                      <select value={overrideForm.status || ''} onChange={e => setOverrideForm(f => ({ ...f, status: e.target.value }))} className="input-field text-sm">
                        <option value="">-- Giữ nguyên --</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="ongoing">Đang chiếu</option>
                        <option value="trailer">Trailer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1 block">URL Poster</label>
                      <input type="url" value={overrideForm.poster_url || ''} onChange={e => setOverrideForm(f => ({ ...f, poster_url: e.target.value }))} className="input-field text-sm" placeholder="https://..." />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Mô tả / Nội dung phim</label>
                    <textarea rows={4} value={overrideForm.content || ''} onChange={e => setOverrideForm(f => ({ ...f, content: e.target.value }))}
                      className="input-field text-sm resize-none w-full" placeholder="Nhập mô tả phim bằng tiếng Việt..." />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Diễn viên (mỗi tên 1 dòng)</label>
                    <textarea rows={3} value={(overrideForm.actor || []).join('\n')} onChange={e => setOverrideForm(f => ({ ...f, actor: e.target.value.split('\n').filter(Boolean) }))}
                      className="input-field text-sm resize-none w-full font-mono" placeholder={overrideApiMovie.actor?.join('\n') || 'Tên diễn viên...'} />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Đạo diễn (mỗi tên 1 dòng)</label>
                    <textarea rows={2} value={(overrideForm.director || []).join('\n')} onChange={e => setOverrideForm(f => ({ ...f, director: e.target.value.split('\n').filter(Boolean) }))}
                      className="input-field text-sm resize-none w-full font-mono" placeholder={overrideApiMovie.director?.join('\n') || 'Tên đạo diễn...'} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={saveOverride} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                      <Check size={16} /> Lưu chỉnh sửa
                    </button>
                    <button onClick={() => { setShowOverrideForm(false); setOverrideApiMovie(null); }} className="btn-icon px-4 text-sm text-slate-400">
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Override list */}
              {overrides.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Phim đã chỉnh sửa ({overrides.length})</p>
                  {overrides.map(ov => (
                    <div key={ov.slug} className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:border-blue-500/30 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{ov.name || ov.slug}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{ov.slug}</p>
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          {ov.name && <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">Tên</span>}
                          {ov.content && <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Mô tả</span>}
                          {ov.actor?.length && <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">Diễn viên</span>}
                          {ov.quality && <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded">{ov.quality}</span>}
                          {ov.lang && <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded">{ov.lang}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setOverrideSearchSlug(ov.slug); setOverrideForm(ov); setShowOverrideForm(true); setOverrideApiMovie({ name: ov.name, slug: ov.slug, thumb_url: ov.thumb_url || '' }); }}
                          className="btn-icon p-2 hover:border-blue-500/40 hover:text-blue-400"><Edit3 size={14} /></button>
                        <button onClick={() => deleteOverride(ov.slug)}
                          className="btn-icon p-2 hover:border-red-500/40 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </SectionCard>
          </div>
          )}

          {/* Player Studio link — shown within override section */}
          {activeSection === 'section-override' && (
          <div className="flex justify-center">
            <a href="/daophim/player-studio" target="_blank"
              className="flex items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm hover:bg-green-500/20 transition-all">
              🎬 Mở Player Studio — Chỉnh logo & giao diện player
            </a>
          </div>
          )}

          {/* QUẢNG CÁO */}
          {activeSection === 'section-ads' && (
          <div id="section-ads">
            <AdsSection onToast={(msg, t) => setToast({ message: msg, type: t })} />
          </div>
          )}

          {/* THÀNH VIÊN */}
          {activeSection === 'section-members' && (
          <div id="section-members">
            <MembersSection onToast={(msg, t) => setToast({ message: msg, type: t })} />
          </div>
          )}

          {/* THÔNG BÁO */}
          {activeSection === 'section-notifications' && (
          <div id="section-notifications">
            <NotificationsSection onToast={(msg, t) => setToast({ message: msg, type: t })} />
          </div>
          )}

          {/* GÓI VIP */}
          {activeSection === 'section-vip' && (
          <div id="section-vip">
            <VipSection onToast={(msg, t) => setToast({ message: msg, type: t })} />
          </div>
          )}

          {/* CHẶN IP */}
          {activeSection === 'section-geoblock' && (
          <div id="section-geoblock">
            <GeoblockSection />
          </div>
          )}

          {/* BẢO TRÌ */}
          {activeSection === 'section-maintenance' && (
          <div id="section-maintenance">
            <MaintenanceSection />
          </div>
          )}

          {/* HƯỚNG DẪN */}
          {activeSection === 'section-manual-topup' && (
          <div id="section-manual-topup">
            <ManualTopupSection onToast={(msg, t) => setToast({ message: msg, type: t })} />
          </div>
          )}

          {activeSection === 'section-guide' && (
          <div id="section-guide">
            <SectionCard title="Hướng dẫn & Thông tin" icon={Info} color="pink">
              <div className="flex flex-col gap-4 text-sm text-slate-400">
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                <h4 className="text-indigo-300 font-bold mb-2">🎬 Về logo</h4>
                <ul className="flex flex-col gap-1.5 text-slate-500 text-[13px]">
                  <li>• <strong className="text-slate-400">Icon mặc định</strong>: Dùng icon clapperboard có gradient đẹp</li>
                  <li>• <strong className="text-slate-400">Hình ảnh</strong>: Upload ảnh PNG/SVG hoặc dán URL (max 2MB)</li>
                  <li>• <strong className="text-slate-400">Chỉ chữ</strong>: Hiển thị text với hiệu ứng gradient</li>
                </ul>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                <h4 className="text-orange-300 font-bold mb-2">📹 Về phim thủ công</h4>
                <ul className="flex flex-col gap-1.5 text-slate-500 text-[13px]">
                  <li>• Phim thủ công được lưu trên trình duyệt (localStorage)</li>
                  <li>• Embed URL hỗ trợ: YouTube, Google Drive, phim lậu, v.v.</li>
                  <li>• Phim thủ công hiển thị trong mục "Phim mới cập nhật" và các section trên trang chủ</li>
                </ul>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
                <h4 className="text-slate-300 font-bold mb-2">💾 Lưu ý</h4>
                <p className="text-slate-500 text-[13px]">Tất cả cài đặt được lưu vào localStorage của trình duyệt. Xóa cache trình duyệt sẽ mất dữ liệu. Nên export backup định kỳ.</p>
              </div>
            </div>

            </SectionCard>
          </div>
          )}

          {/* Footer save buttons — only for brand/settings section */}
          {activeSection === 'section-brand' && (
          <div className="flex justify-end gap-3 pt-2 pb-4">
            <button onClick={resetSettings} className="btn-icon flex items-center gap-2 text-sm text-slate-400 px-4 py-2.5">
              <RefreshCw size={16} /> Khôi phục mặc định
            </button>
            <button onClick={saveSettings} className="btn-primary flex items-center gap-2 px-8">
              <Save size={18} /> Lưu cài đặt
            </button>
          </div>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
