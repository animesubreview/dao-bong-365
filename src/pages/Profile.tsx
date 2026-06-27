import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Bell, Star, LayoutGrid, MonitorPlay, Clock, BookmarkPlus, Heart,
  ChevronRight, LogIn, UserPlus, LogOut, Crown, Settings, Wallet,
} from 'lucide-react';
import { onAuthChange, logout, getUserProfile, UserProfile } from '../lib/auth';
import { isVipActive, vipExpiryText } from '../lib/vip';

useSEO;

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useSEO({ title: 'Tài khoản', url: '/profile' });

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      if (u) {
        const profile = await getUserProfile(u.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const vipActive = user ? isVipActive(user) : false;
  const vipText = user ? vipExpiryText(user) : '';

  const MENU_ITEMS = [
    { icon: Bell,         label: 'Thông báo',            to: '/profile#notifs' },
    { icon: Crown,        label: 'Nâng cấp RoX',         to: '/mua-vip',       accent: true },
    { icon: LayoutGrid,   label: 'Menu',                  to: '/type/phim-bo' },
    { icon: MonitorPlay,  label: 'Xem chung',             to: '/cinema' },
    { icon: Clock,        label: 'Đang xem',              to: '/history' },
    { icon: BookmarkPlus, label: 'Danh sách phim của tôi',to: '/favorites' },
    { icon: Heart,        label: 'Yêu thích',             to: '/favorites' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Top Header */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-6">
          <User size={22} className="text-slate-300" />
          <h1 className="text-2xl font-black text-white">Tài khoản</h1>
        </div>

        {/* Login/Register or User info */}
        {user ? (
          /* Logged in */
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 mb-1">
            <img src={user.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.username}`}
              alt={user.username} className="w-14 h-14 rounded-full bg-slate-700 border-2 border-slate-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-base truncate">{user.username}</p>
              <p className="text-slate-500 text-xs truncate">{user.email}</p>
              {vipActive && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/30">
                  <Crown size={9} /> VIP · {vipText}
                </span>
              )}
              {user.coins !== undefined && (
                <p className="text-slate-500 text-[11px] mt-0.5">
                  <Wallet size={10} className="inline mr-0.5" />
                  {user.coins.toLocaleString()} xu
                </p>
              )}
            </div>
            <Link to="/profile/edit" className="shrink-0 w-9 h-9 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center">
              <Settings size={15} className="text-slate-400" />
            </Link>
          </div>
        ) : (
          /* Not logged in */
          <div className="flex gap-3 mb-1">
            <Link to="/auth"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black py-3.5 rounded-2xl text-sm transition-all">
              <LogIn size={16} /> Đăng nhập
            </Link>
            <Link to="/auth?mode=register"
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-black py-3.5 rounded-2xl text-sm transition-all">
              <UserPlus size={16} /> Đăng ký
            </Link>
          </div>
        )}
      </div>

      {/* Menu list */}
      <div className="px-4">
        <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl overflow-hidden">
          {MENU_ITEMS.map((item, i) => (
            <Link key={item.label} to={item.to}
              className="flex items-center gap-4 px-4 py-4 hover:bg-slate-800/40 transition-colors"
              style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <item.icon size={20}
                className={item.accent ? 'text-yellow-400' : 'text-slate-400'} />
              <span className={`flex-1 text-sm font-semibold ${item.accent ? 'text-yellow-300' : 'text-slate-200'}`}>
                {item.label}
              </span>
              <ChevronRight size={16} className="text-slate-600" />
            </Link>
          ))}
        </div>

        {/* Extra links */}
        <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl overflow-hidden mt-3">
          <Link to="/nap-tien"
            className="flex items-center gap-4 px-4 py-4 hover:bg-slate-800/40 transition-colors">
            <Wallet size={20} className="text-green-400" />
            <span className="flex-1 text-sm font-semibold text-slate-200">Nạp xu</span>
            <ChevronRight size={16} className="text-slate-600" />
          </Link>
          <Link to="/mua-vip"
            className="flex items-center gap-4 px-4 py-4 hover:bg-slate-800/40 transition-colors border-t border-white/5">
            <Crown size={20} className="text-yellow-400" />
            <span className="flex-1 text-sm font-semibold text-slate-200">Gói VIP</span>
            <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">HOT</span>
            <ChevronRight size={16} className="text-slate-600" />
          </Link>
        </div>

        {/* Logout */}
        {user && (
          <button onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/40 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-all">
            <LogOut size={16} /> Đăng xuất
          </button>
        )}

        {/* Flag */}
        <div className="mt-6 flex justify-center">
          <div className="bg-red-600 text-white text-xs font-bold px-5 py-2 rounded-full">
            🇻🇳 Hoàng Sa &amp; Trường Sa là của Việt Nam!
          </div>
        </div>
      </div>
    </div>
  );
}
