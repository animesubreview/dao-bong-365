import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// Menu tài khoản (mẫu #408): bung từ avatar, từng mục trượt vào lần lượt, điều hướng được bằng bàn phím.
const CSS = `
.am{position:relative}
.am-av{position:relative;width:38px;height:38px;padding:0;border:0;border-radius:50%;background:#1e293b;overflow:hidden;cursor:pointer;box-shadow:0 0 0 0 transparent;transition:box-shadow .3s,transform .45s cubic-bezier(.34,1.45,.64,1)}
.am-av:hover{transform:scale(1.06)}
.am-av:active{transform:scale(.94);transition-duration:.3s,.1s}
.am-av[aria-expanded="true"]{box-shadow:0 0 0 3px var(--bg,#0a0c12),0 0 0 5px #22c55e}
.am-av:focus-visible{outline:2px solid #22c55e;outline-offset:3px}
.am-av img{display:block;width:100%;height:100%;object-fit:cover}
.am-dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2.5px var(--bg,#0a0c12);pointer-events:none}
.am-m{position:absolute;right:0;top:calc(100% + 12px);width:230px;padding:6px;border-radius:16px;background:var(--surface,#10131c);box-shadow:inset 0 0 0 1px var(--border,rgba(255,255,255,.1)),0 22px 44px -18px rgba(0,0,0,.7),0 4px 12px -6px rgba(0,0,0,.4);transform-origin:calc(100% - 19px) -12px;transform:scale(.16);opacity:0;visibility:hidden;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .2s,visibility 0s .28s;z-index:60}
.am-m::before{content:"";position:absolute;right:15px;top:-5px;width:10px;height:10px;border-radius:2px;background:var(--surface,#10131c);box-shadow:-1px -1px 0 0 var(--border,rgba(255,255,255,.1));transform:rotate(45deg)}
.am.open .am-m{transform:none;opacity:1;visibility:visible;transition:transform .55s cubic-bezier(.34,1.45,.64,1),opacity .15s,visibility 0s}
.am-m>*{position:relative;opacity:0;transform:translateY(-6px);transition:opacity .15s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.am.open .am-m>*{opacity:1;transform:none;transition-delay:calc(70ms + var(--i)*30ms)}
.am-hd{display:flex;flex-direction:column;gap:2px;padding:8px 10px 10px}
.am-hd b{font-size:14px;font-weight:650;color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.am-hd span{font-size:12px;color:var(--text-muted,#9ca3af);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.am-it{display:flex;align-items:center;gap:10px;width:100%;height:36px;padding:0 10px;border:0;border-radius:10px;background:none;font-size:13.5px;font-weight:500;color:var(--text,#fff);text-align:left;cursor:pointer;text-decoration:none}
.am-it:hover,.am-it:focus-visible{background:var(--surface-2,#171b27);outline:none}
.am-it svg{width:18px;height:18px;flex:none;fill:none;stroke:var(--text-muted,#9ca3af);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.am-it.vip svg{stroke:#f5a524}
.am-it.out{color:#f87171}
.am-it.out svg{stroke:#f87171}
.am-it.out:hover,.am-it.out:focus-visible{background:rgba(248,113,113,.1)}
.am-hr{height:1px;margin:5px 4px;background:var(--border,rgba(255,255,255,.1))}
@media (prefers-reduced-motion:reduce){.am *{transition-duration:.001ms!important}}
`;

const ICONS = {
  user: <><circle cx="9" cy="6.2" r="3.2" /><path d="M3 16c.6-3.2 3-5 6-5s5.4 1.8 6 5" /></>,
  edit: <><path d="M3 15l.7-3.2L12 3.5a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L6.2 14.3z" /><path d="M10.8 4.8l2.4 2.4" /></>,
  history: <><circle cx="9" cy="9" r="7" /><path d="M9 5v4.2l2.8 1.6" /></>,
  heart: <path d="M9 15.2S2.5 11.3 2.5 6.8A3.3 3.3 0 0 1 9 5.6a3.3 3.3 0 0 1 6.5 1.2c0 4.5-6.5 8.4-6.5 8.4z" />,
  wallet: <><rect x="2" y="4.5" width="14" height="10" rx="2" /><path d="M2 7.5h14M12.5 11h1.5" /></>,
  crown: <path d="M2.5 13.5 2 5.5l4 3.2L9 4l3 4.7 4-3.2-.5 8z" />,
  out: <><path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5v9A1.5 1.5 0 0 0 4.5 15H7" /><path d="M11.5 12.5 15 9l-3.5-3.5M15 9H7.5" /></>,
};
const Ico = ({ d }: { d: keyof typeof ICONS }) => <svg viewBox="0 0 18 18" aria-hidden="true">{ICONS[d]}</svg>;

export default function AccountMenu({ username, email, avatar, onLogout }: {
  username: string; email?: string; avatar: string; onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
  const close = (back?: boolean) => { setOpen(false); if (back) btn.current?.focus({ preventScroll: true }); };
  const openAt = (at?: number) => {
    setOpen(true);
    if (at != null) setTimeout(() => { const l = items(); l[(at + l.length) % l.length]?.focus({ preventScroll: true }); }, 30);
  };

  useEffect(() => {
    if (!open) return;
    const out = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', out, true);
    return () => document.removeEventListener('pointerdown', out, true);
  }, [open]);

  const onBtnKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openAt(e.key === 'ArrowDown' ? 0 : -1); }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); close(); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const l = items(); const i = l.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); l[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); l[l.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close();
  };

  const link = (to: string, icon: keyof typeof ICONS, label: string, i: number, cls = '') => (
    <Link to={to} role="menuitem" tabIndex={-1} className={`am-it ${cls}`} style={{ ['--i' as any]: i }} onClick={() => close()}>
      <Ico d={icon} /><span>{label}</span>
    </Link>
  );

  return (
    <div ref={root} className={`am ${open ? 'open' : ''}`}>
      <style>{CSS}</style>
      <button ref={btn} type="button" className="am-av" aria-label="Mở menu tài khoản" aria-haspopup="menu" aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))} onKeyDown={onBtnKey}>
        <img src={avatar} alt={username} />
      </button>
      <span className="am-dot" aria-hidden="true" />
      <div ref={menu} className="am-m" role="menu" aria-label="Menu tài khoản" onKeyDown={onMenuKey}>
        <div className="am-hd" style={{ ['--i' as any]: 0 }}><b>{username}</b>{email && <span>{email}</span>}</div>
        {link('/profile', 'user', 'Hồ sơ', 1)}
        {link('/profile/edit', 'edit', 'Chỉnh sửa hồ sơ', 2)}
        {link('/history', 'history', 'Lịch sử xem', 3)}
        {link('/favorites', 'heart', 'Yêu thích', 4)}
        {link('/nap-tien', 'wallet', 'Nạp tiền', 5)}
        {link('/mua-vip', 'crown', 'Mua VIP', 6, 'vip')}
        <div className="am-hr" role="separator" style={{ ['--i' as any]: 7 }} />
        <button type="button" role="menuitem" tabIndex={-1} className="am-it out" style={{ ['--i' as any]: 8 }}
          onClick={async () => { close(); await onLogout(); }}>
          <Ico d="out" /><span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
