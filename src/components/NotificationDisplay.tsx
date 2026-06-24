import React, { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import {
  subscribeNotifications, getDismissedIds, dismissNotification,
  filterActiveNotifications, SiteNotification,
} from '../lib/notifications';

const TYPE_CONFIG = {
  info: {
    bg: 'bg-blue-950/90',
    border: 'border-blue-500/40',
    text: 'text-blue-200',
    icon: Info,
    iconColor: 'text-blue-400',
    bannerBg: 'bg-blue-600/20',
    dot: 'bg-blue-400',
  },
  warning: {
    bg: 'bg-green-950/90',
    border: 'border-green-600/40',
    text: 'text-green-200',
    icon: AlertTriangle,
    iconColor: 'text-green-400',
    bannerBg: 'bg-green-700/15',
    dot: 'bg-green-500',
  },
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/40',
    text: 'text-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    bannerBg: 'bg-emerald-600/15',
    dot: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-500/40',
    text: 'text-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-400',
    bannerBg: 'bg-red-600/15',
    dot: 'bg-red-400',
  },
};

// ── Image-Link Popup ──────────────────────────────────────────────────────────
function ImageLinkPopup({ notif, onDismiss }: { notif: SiteNotification; onDismiss: () => void }) {
  const hasLink = !!notif.targetUrl;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onDismiss} />
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-700/40"
        style={{ animation: 'imgPopIn .28s cubic-bezier(.17,.67,.35,1.1)' }}
      >
        <style>{`
          @keyframes imgPopIn {
            from { opacity: 0; transform: scale(.88) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Nút đóng nổi góc trên phải */}
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Hình ảnh — nhấn vào sẽ nhảy đến link */}
        {notif.imageUrl ? (
          hasLink ? (
            <a href={notif.targetUrl} target="_blank" rel="noopener noreferrer" onClick={onDismiss}>
              <img
                src={notif.imageUrl}
                alt={notif.title || 'Thông báo'}
                className="w-full h-auto max-h-[380px] object-cover block cursor-pointer hover:brightness-90 transition-all"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ) : (
            <img
              src={notif.imageUrl}
              alt={notif.title || 'Thông báo'}
              className="w-full h-auto max-h-[380px] object-cover block"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <div className="w-full h-36 bg-slate-800 flex items-center justify-center">
            <ImageIcon size={44} className="text-slate-600" />
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-900 px-4 py-3.5">
          {notif.title && (
            <h3 className="text-white font-black text-base leading-snug mb-1 pr-2">{notif.title}</h3>
          )}
          {notif.message && (
            <p className="text-slate-400 text-xs leading-relaxed mb-3 whitespace-pre-wrap">{notif.message}</p>
          )}
          <div className="flex gap-2">
            {hasLink && (
              <a
                href={notif.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDismiss}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black bg-green-500 hover:bg-green-400 text-slate-950 transition-colors"
              >
                <ExternalLink size={14} /> Xem ngay
              </a>
            )}
            <button
              onClick={onDismiss}
              className={`${hasLink ? '' : 'flex-1'} px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Popup thông báo thường ────────────────────────────────────────────────────
function NotificationPopup({ notif, onDismiss }: { notif: SiteNotification; onDismiss: () => void }) {
  const cfg = TYPE_CONFIG[notif.type];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onDismiss} />
      <div className={`relative w-full max-w-md rounded-2xl border ${cfg.bg} ${cfg.border} shadow-2xl p-6`}
        style={{ animation: 'popIn .25s cubic-bezier(.17,.67,.35,1.1)' }}>
        <style>{`@keyframes popIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }`}</style>
        <button onClick={onDismiss} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-11 h-11 rounded-xl ${cfg.bannerBg} border ${cfg.border} flex items-center justify-center shrink-0`}>
            <Icon size={22} className={cfg.iconColor} />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.iconColor}`}>
                Thông báo từ Admin
              </span>
            </div>
            <h3 className={`font-black text-lg leading-snug ${cfg.text}`}>{notif.title}</h3>
          </div>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{notif.message}</p>
        <div className="flex gap-2 mt-5">
          {notif.targetUrl && (
            <a href={notif.targetUrl} target="_blank" rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border ${cfg.border} ${cfg.text} ${cfg.bg} hover:opacity-80 transition-opacity`}>
              <ExternalLink size={15} /> Xem thêm
            </a>
          )}
          <button onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-black bg-green-500 hover:bg-green-400 text-slate-950 transition-colors">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────
function NotificationBanner({ notif, onDismiss }: { notif: SiteNotification; onDismiss: () => void }) {
  const cfg = TYPE_CONFIG[notif.type];
  const Icon = cfg.icon;

  return (
    <div className={`w-full border-b ${cfg.border} ${cfg.bannerBg} px-4 py-2.5 flex items-center gap-3`}>
      <div className={`w-5 h-5 rounded-full ${cfg.dot} flex items-center justify-center shrink-0`}>
        <Icon size={11} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`font-black text-sm ${cfg.text} mr-2`}>{notif.title}</span>
        <span className="text-slate-400 text-xs truncate hidden sm:inline">{notif.message}</span>
      </div>
      {notif.targetUrl && (
        <a href={notif.targetUrl} target="_blank" rel="noopener noreferrer"
          className={`shrink-0 text-xs font-bold ${cfg.text} hover:underline flex items-center gap-1`}>
          Chi tiết <ExternalLink size={11} />
        </a>
      )}
      <button onClick={onDismiss} className="shrink-0 text-slate-500 hover:text-white transition-colors ml-1">
        <X size={16} />
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NotificationDisplay() {
  const [active, setActive] = useState<SiteNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeNotifications((all) => {
      const dismissed = getDismissedIds();
      const visible = filterActiveNotifications(all).filter(n => !dismissed.includes(n.id));
      setActive(visible);
    });
    return unsub;
  }, []);

  const dismiss = (id: string) => {
    dismissNotification(id);
    setActive(prev => prev.filter(n => n.id !== id));
  };

  if (active.length === 0) return null;

  const imageLinkPopups = active.filter(n => n.showAsPopup && n.displayStyle === 'image_link');
  const normalPopups    = active.filter(n => n.showAsPopup && n.displayStyle !== 'image_link');
  const banners         = active.filter(n => !n.showAsPopup);

  return (
    <>
      {banners.length > 0 && (
        <div className="fixed top-14 left-0 right-0 z-40 flex flex-col">
          {banners.map(n => (
            <NotificationBanner key={n.id} notif={n} onDismiss={() => dismiss(n.id)} />
          ))}
        </div>
      )}
      {imageLinkPopups.length > 0 && (
        <ImageLinkPopup notif={imageLinkPopups[0]} onDismiss={() => dismiss(imageLinkPopups[0].id)} />
      )}
      {imageLinkPopups.length === 0 && normalPopups.length > 0 && (
        <NotificationPopup notif={normalPopups[0]} onDismiss={() => dismiss(normalPopups[0].id)} />
      )}
    </>
  );
}
