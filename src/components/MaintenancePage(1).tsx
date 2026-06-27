import React, { useState, useEffect } from 'react';
import { Wrench, Clock, RefreshCw } from 'lucide-react';
import { MaintenanceConfig } from '../lib/maintenance';

function Countdown({ endTime }: { endTime: string }) {
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    if (!endTime) return;
    const calc = () => setDiff(Math.max(0, new Date(endTime).getTime() - Date.now()));
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  if (!endTime || diff <= 0) return null;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      {[
        { val: h, label: 'Giờ' },
        { val: m, label: 'Phút' },
        { val: s, label: 'Giây' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 bg-sky-600/20 border border-sky-600/40 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-black text-sky-400 tabular-nums">
              {String(val).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function MaintenancePage({ config }: { config: MaintenanceConfig }) {
  const [dots, setDots] = useState('');

  // Hiệu ứng dấu chấm nhấp nháy
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i}
            className="absolute rounded-full bg-sky-500/5 animate-pulse"
            style={{
              width: Math.random() * 200 + 50,
              height: Math.random() * 200 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Media (ảnh/video) */}
      {config.mediaType === 'image' && config.mediaUrl && (
        <div className="relative w-full max-w-sm mb-6 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <img src={config.mediaUrl} alt="maintenance" className="w-full object-cover max-h-48" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
      )}
      {config.mediaType === 'video' && config.mediaUrl && (
        <div className="relative w-full max-w-sm mb-6 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <video src={config.mediaUrl} autoPlay loop muted playsInline className="w-full max-h-48 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
      )}

      {/* Icon + text */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Animated wrench icon */}
        <div className="relative mb-5">
          <div className="w-20 h-20 bg-sky-600/10 border border-sky-600/30 rounded-3xl flex items-center justify-center">
            <Wrench size={36} className="text-sky-400 animate-bounce" />
          </div>
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-3xl border-2 border-sky-500/20 animate-spin"
            style={{ animationDuration: '3s' }} />
        </div>

        <h1 className="text-2xl font-black text-white mb-2 leading-tight">
          {config.title || 'Website Đang Bảo Trì'}
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          {config.message || 'Chúng tôi đang nâng cấp hệ thống.'}
        </p>

        {/* Animated dots */}
        <p className="text-sky-400 font-bold text-sm mb-1">
          Vui lòng quay lại sau{dots}
        </p>

        {/* Countdown */}
        {config.endTime && <Countdown endTime={config.endTime} />}

        {/* Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-slate-950 font-black px-6 py-3 rounded-full transition-all active:scale-95 text-sm"
        >
          <RefreshCw size={15} /> Thử lại ngay
        </button>

        {/* Progress bar */}
        {config.endTime && new Date(config.endTime).getTime() > Date.now() && (
          <div className="mt-5 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full animate-pulse"
              style={{ width: `${Math.min(100, Math.max(5, 100 - (new Date(config.endTime).getTime() - Date.now()) / 36000))}%` }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Clock size={11} />
          {config.endTime
            ? <span>Dự kiến hoàn thành: {new Date(config.endTime).toLocaleString('vi-VN')}</span>
            : <span>Thời gian bảo trì chưa xác định</span>
          }
        </div>
      </div>
    </div>
  );
}
