import React, { useEffect, useState } from 'react';
import {
  Activity, Film, Users, Menu as MenuIcon, X, LogOut, ExternalLink, Shield, Palette, Radio, Clock,
  Edit3, Pin, Languages, Tv, Megaphone, Bell, Crown, KeyRound, Globe, Wrench, CreditCard, Info,
  AlertCircle, ChevronRight, LayoutGrid,
} from 'lucide-react';
import type { FirestoreErrorEvent } from '../../lib/firebaseUtils';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Điều hướng Admin — gom nhóm theo công việc để dễ tìm
 * ────────────────────────────────────────────────────────────────────────── */
export interface NavItem { id: string; label: string; icon: React.ComponentType<any>; desc: string }
export interface NavGroup { title: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [
      { id: 'section-realtime', label: 'Tổng quan', icon: Activity, desc: 'Người đang xem, kiểm tra kết nối Firebase' },
    ],
  },
  {
    title: 'Phim & phát sóng',
    items: [
      { id: 'section-movies',     label: 'Phim thủ công',   icon: Film,      desc: 'Thêm / sửa / xóa phim tự đăng' },
      { id: 'section-upcoming',   label: 'Phim sắp chiếu',  icon: Clock,     desc: 'Lịch phim & anime sắp ra mắt' },
      { id: 'section-override',   label: 'Sửa phim API',    icon: Edit3,     desc: 'Chỉnh thông tin phim từ KKPhim' },
      { id: 'section-pinned',     label: 'Ghim phim',       icon: Pin,       desc: 'Ghim phim lên đầu trang chủ' },
      { id: 'section-bilingual',  label: 'Phim song ngữ',   icon: Languages, desc: 'Mục phim song ngữ ở trang chủ' },
      { id: 'section-tv',         label: 'TV trực tuyến',   icon: Tv,        desc: 'Kênh truyền hình' },
      { id: 'section-livestream', label: 'Livestream',      icon: Radio,     desc: 'Bật/tắt phát trực tiếp, duyệt đăng ký' },
    ],
  },
  {
    title: 'Nội dung & quảng cáo',
    items: [
      { id: 'section-notifications', label: 'Thông báo',        icon: Bell,      desc: 'Gửi thông báo tới người dùng' },
      { id: 'section-ads',           label: 'Quảng cáo',        icon: Megaphone, desc: 'Banner, popup, quảng cáo click' },
      { id: 'section-brand',         label: 'Logo & thương hiệu', icon: Palette, desc: 'Tên site, logo, liên hệ, cảnh báo copy' },
    ],
  },
  {
    title: 'Thành viên & doanh thu',
    items: [
      { id: 'section-members',      label: 'Thành viên',  icon: Users,      desc: 'Tài khoản, số dư, khóa/mở khóa' },
      { id: 'section-manual-topup', label: 'Nạp thẻ',     icon: CreditCard, desc: 'Duyệt yêu cầu nạp tiền thủ công' },
      { id: 'section-vip',          label: 'Gói VIP',     icon: Crown,      desc: 'Giá các gói VIP' },
      { id: 'section-vipkeys',      label: 'Key VIP',     icon: KeyRound,   desc: 'Tạo và quản lý key VIP' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { id: 'section-maintenance', label: 'Bảo trì',   icon: Wrench, desc: 'Bật/tắt chế độ bảo trì website' },
      { id: 'section-geoblock',    label: 'Chặn IP',   icon: Globe,  desc: 'Chặn truy cập từ nước ngoài' },
      { id: 'section-guide',       label: 'Hướng dẫn', icon: Info,   desc: 'Ghi chú sử dụng' },
    ],
  },
];

export const NAV_SECTIONS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

// 4 mục hay dùng nhất hiện ở thanh điều hướng dưới (mobile)
const BOTTOM_TABS = ['section-realtime', 'section-movies', 'section-members', 'section-manual-topup'];

/* ─────────────────────────────────────────────────────────────────────────────
 *  Banner cảnh báo lỗi Firebase (hiện khi đọc/ghi Firestore bị từ chối / mất mạng)
 * ────────────────────────────────────────────────────────────────────────── */
function FirestoreErrorBanner({ onCheck }: { onCheck: () => void }) {
  const [err, setErr] = useState<FirestoreErrorEvent | null>(null);

  useEffect(() => {
    const h = (e: Event) => setErr((e as CustomEvent<FirestoreErrorEvent>).detail);
    window.addEventListener('firestore-error', h);
    return () => window.removeEventListener('firestore-error', h);
  }, []);

  if (!err) return null;
  return (
    <div className="mx-4 lg:mx-8 mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-3 items-start">
      <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-red-300">Firebase đang báo lỗi — dữ liệu có thể chưa được lưu</p>
        <p className="text-[13px] text-red-200/80 mt-0.5 leading-relaxed break-words">{err.message}</p>
        <div className="flex gap-2 mt-2.5">
          <button onClick={onCheck} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold">
            Kiểm tra kết nối
          </button>
          <button onClick={() => setErr(null)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold">
            Ẩn
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  Khung Admin: sidebar (PC) + top bar + thanh điều hướng dưới & menu (mobile)
 * ────────────────────────────────────────────────────────────────────────── */
interface ShellProps {
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ active, onNavigate, onLogout, headerRight, children }: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV_SECTIONS.find(s => s.id === active) || NAV_SECTIONS[0];

  const go = (id: string) => { setMenuOpen(false); onNavigate(id); };

  // Khóa cuộn nền khi mở menu mobile
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="adm min-h-screen bg-[#0b0e15] text-slate-200">
      {/* ── Sidebar (PC) ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col bg-[#0e121b] border-r border-white/[.06] z-40">
        <div className="px-5 h-16 flex items-center gap-3 border-b border-white/[.06] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <Shield size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-extrabold text-[15px]">Đảo Phim</p>
            <p className="text-[11px] font-semibold text-green-400/80">Bảng quản trị</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map(g => (
            <div key={g.title}>
              <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map(item => {
                  const Icon = item.icon;
                  const on = item.id === active;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-left transition-colors ${
                        on ? 'bg-green-500/10 text-green-400' : 'text-slate-400 hover:text-white hover:bg-white/[.04]'
                      }`}
                    >
                      <Icon size={17} className={on ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'} />
                      <span className="truncate">{item.label}</span>
                      {on && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[.06] flex flex-col gap-1.5 shrink-0">
          <a href="/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[.04]">
            <ExternalLink size={16} /> Xem website
          </a>
          <button onClick={onLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#0b0e15]/85 backdrop-blur-xl border-b border-white/[.06]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="h-14 lg:h-16 px-4 lg:px-8 flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} aria-label="Mở menu"
              className="lg:hidden w-10 h-10 -ml-1 rounded-xl bg-white/[.05] active:bg-white/10 flex items-center justify-center text-slate-200">
              <MenuIcon size={19} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] lg:text-xl font-extrabold text-white truncate leading-tight">{current.label}</h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">{current.desc}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">{headerRight}</div>
          </div>
        </header>

        <FirestoreErrorBanner onCheck={() => go('section-realtime')} />

        {/* ── Nội dung ────────────────────────────────────────────────── */}
        <main className="px-4 lg:px-8 py-5 max-w-[1100px] mx-auto pb-32 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ── Thanh điều hướng dưới (mobile) ───────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0e121b]/95 backdrop-blur-xl border-t border-white/[.08]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {BOTTOM_TABS.map(id => {
            const item = NAV_SECTIONS.find(s => s.id === id)!;
            const Icon = item.icon;
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)}
                className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold transition-colors ${on ? 'text-green-400' : 'text-slate-500 active:text-slate-300'}`}>
                <Icon size={21} strokeWidth={on ? 2.4 : 2} />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold ${!BOTTOM_TABS.includes(active) ? 'text-green-400' : 'text-slate-500 active:text-slate-300'}`}>
            <LayoutGrid size={21} />
            <span>Tất cả</span>
          </button>
        </div>
      </nav>

      {/* ── Menu đầy đủ (mobile) ─────────────────────────────────────── */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-3xl bg-[#0e121b] border-t border-white/10 px-4 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-extrabold text-lg">Tất cả chức năng</p>
              <button onClick={() => setMenuOpen(false)} aria-label="Đóng"
                className="w-9 h-9 rounded-xl bg-white/[.06] flex items-center justify-center text-slate-300"><X size={18} /></button>
            </div>

            {NAV_GROUPS.map(g => (
              <div key={g.title} className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">{g.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map(item => {
                    const Icon = item.icon;
                    const on = item.id === active;
                    return (
                      <button key={item.id} onClick={() => go(item.id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3.5 text-center min-h-[84px] transition-colors ${
                          on ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-white/[.06] bg-white/[.03] text-slate-300 active:bg-white/[.08]'
                        }`}>
                        <Icon size={22} />
                        <span className="text-[12px] font-semibold leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 mt-6">
              <a href="/" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[.05] text-slate-200 text-sm font-semibold">
                <ExternalLink size={16} /> Xem website
              </a>
              <button onClick={onLogout}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 text-red-400 text-sm font-semibold">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
