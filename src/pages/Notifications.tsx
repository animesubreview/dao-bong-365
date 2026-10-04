import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import {
  Bell, Info, AlertTriangle, CheckCircle, AlertCircle,
  CheckCheck, ExternalLink, Loader2,
} from 'lucide-react';
import {
  subscribeNotifications, filterActiveNotifications, markAsRead, markAllAsRead,
  getReadIds, SiteNotification,
} from '../lib/notifications';
import { cn } from '../lib/utils';

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-green-400',   bg: 'bg-green-500/10' },
  success: { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  error:   { icon: AlertCircle,   color: 'text-red-400',     bg: 'bg-red-500/10' },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export default function Notifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<SiteNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => getReadIds());
  const [tab, setTab] = useState<'phim' | 'cong_dong'>('phim');

  useSEO({
    title: 'Thông báo',
    description: 'Xem tất cả thông báo mới nhất từ Đảo Phim.',
    url: '/notifications',
    noIndex: true,
  });

  useEffect(() => {
    const unsub = subscribeNotifications((notifs) => {
      setAll(notifs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const active = filterActiveNotifications(all);
  const list = active.filter(n => (n.category || 'phim') === tab)
    .sort((a, b) => b.createdAt - a.createdAt);
  const unreadInTab = list.filter(n => !readIds.includes(n.id));

  const handleMarkAllRead = () => {
    markAllAsRead(list.map(n => n.id));
    setReadIds(getReadIds());
  };

  const handleOpen = (n: SiteNotification) => {
    if (!readIds.includes(n.id)) {
      markAsRead(n.id);
      setReadIds(getReadIds());
    }
    if (n.targetUrl) {
      if (n.targetUrl.startsWith('http')) {
        window.open(n.targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.targetUrl);
      }
    }
  };

  const TABS: { key: 'phim' | 'cong_dong'; label: string }[] = [
    { key: 'phim', label: 'Phim' },
    { key: 'cong_dong', label: 'Cộng đồng' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-6">
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Tiêu đề + nút Đã đọc ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-green-400" />
            <h1 className="text-xl font-black text-white">Thông báo</h1>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadInTab.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border border-slate-700 text-slate-300 hover:border-green-500/50 hover:text-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCheck size={14} /> Đã đọc
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-5">
          {TABS.map(t => {
            const count = active.filter(n => (n.category || 'phim') === t.key && !readIds.includes(n.id)).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all',
                  tab === t.key ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
                    tab === t.key ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  )}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Danh sách ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-slate-600 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-[#181818] rounded-full flex items-center justify-center text-slate-600">
              <Bell size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Chưa có thông báo nào</h3>
              <p className="text-slate-500 text-sm">
                {tab === 'phim' ? 'Thông báo về phim mới sẽ hiện ở đây.' : 'Thông báo cộng đồng sẽ hiện ở đây.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              const isUnread = !readIds.includes(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all',
                    isUnread
                      ? 'bg-slate-900/80 border-slate-700/50 hover:border-green-500/40'
                      : 'bg-slate-900/30 border-slate-800/40 opacity-70 hover:opacity-100'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                    <Icon size={19} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm truncate', isUnread ? 'font-bold text-white' : 'font-semibold text-slate-300')}>
                        {n.title}
                      </p>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 whitespace-pre-wrap">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-600">{timeAgo(n.createdAt)}</span>
                      {n.targetUrl && (
                        <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
                          Xem thêm <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
