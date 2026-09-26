import React, { useEffect, useState } from 'react';
import {
  Film, Clock, Tv, PlusCircle, Bell, Wrench, CreditCard, KeyRound, Palette,
  CheckCircle2, XCircle, Loader2, Wifi, RefreshCw, ChevronRight,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { subscribeTVChannels } from '../../lib/liveTV';
import { runFirebaseHealthCheck, HealthStep } from '../../lib/firebaseUtils';

interface Props {
  movieCount: number;
  upcomingCount: number;
  onNavigate: (id: string) => void;
  onQuickAddMovie: () => void;
  children?: React.ReactNode; // phần "Người dùng trực tuyến" chi tiết
}

function StatTile({ icon: Icon, label, value, tone, onClick }: {
  icon: React.ComponentType<any>; label: string; value: React.ReactNode; tone: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="text-left rounded-2xl border border-white/[.07] bg-[#121622] p-4 active:scale-[0.98] hover:border-white/15 transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tone}`}><Icon size={19} /></div>
      <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-1.5 font-medium">{label}</p>
    </button>
  );
}

const QUICK = [
  { id: '__add_movie',           label: 'Thêm phim',       icon: PlusCircle, tone: 'from-orange-500 to-amber-500' },
  { id: 'section-notifications', label: 'Gửi thông báo',   icon: Bell,       tone: 'from-sky-500 to-blue-600' },
  { id: 'section-manual-topup',  label: 'Duyệt nạp thẻ',   icon: CreditCard, tone: 'from-emerald-500 to-green-600' },
  { id: 'section-vipkeys',       label: 'Tạo key VIP',     icon: KeyRound,   tone: 'from-fuchsia-500 to-purple-600' },
  { id: 'section-maintenance',   label: 'Bảo trì website', icon: Wrench,     tone: 'from-rose-500 to-red-600' },
  { id: 'section-brand',         label: 'Logo & tên site', icon: Palette,    tone: 'from-indigo-500 to-violet-600' },
];

export function Dashboard({ movieCount, upcomingCount, onNavigate, onQuickAddMovie, children }: Props) {
  const [tvCount, setTvCount] = useState<number | null>(null);
  const [steps, setSteps] = useState<HealthStep[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => subscribeTVChannels(list => setTvCount(list.length)), []);

  const check = async () => {
    setChecking(true);
    setSteps([]);
    try { await runFirebaseHealthCheck(setSteps); } finally { setChecking(false); }
  };

  const allOk = steps.length > 0 && steps.every(s => s.ok);
  const anyFail = steps.some(s => !s.ok);
  const projectId = (db as any)?.app?.options?.projectId || '—';

  return (
    <div className="flex flex-col gap-5">
      {/* Số liệu nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile icon={Film} label="Phim thủ công" value={movieCount} tone="bg-orange-500/15 text-orange-400" onClick={() => onNavigate('section-movies')} />
        <StatTile icon={Clock} label="Phim sắp chiếu" value={upcomingCount} tone="bg-sky-500/15 text-sky-400" onClick={() => onNavigate('section-upcoming')} />
        <StatTile icon={Tv} label="Kênh TV" value={tvCount ?? '…'} tone="bg-violet-500/15 text-violet-400" onClick={() => onNavigate('section-tv')} />
      </div>

      {/* Thao tác nhanh */}
      <section>
        <h2 className="text-sm font-bold text-slate-300 mb-2.5 px-1">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK.map(q => {
            const Icon = q.icon;
            return (
              <button key={q.id} onClick={() => q.id === '__add_movie' ? onQuickAddMovie() : onNavigate(q.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-[#121622] p-3 text-left active:scale-[0.97] hover:border-white/15 transition-all">
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${q.tone} flex items-center justify-center shrink-0 shadow-lg`}>
                  <Icon size={17} className="text-white" />
                </span>
                <span className="text-[13px] font-semibold text-slate-200 leading-tight">{q.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Kiểm tra kết nối Firebase */}
      <section className="rounded-2xl border border-white/[.07] bg-[#121622] p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            anyFail ? 'bg-red-500/15 text-red-400' : allOk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[.06] text-slate-300'}`}>
            <Wifi size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-white">Kết nối Firebase</h2>
            <p className="text-xs text-slate-500 mt-0.5 break-all">Project: {projectId}</p>
            <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
              Bấm kiểm tra để thử đọc – ghi – đọc lại dữ liệu thật. Nếu lưu phim / cài đặt không được, kết quả ở đây sẽ chỉ ra nguyên nhân.
            </p>
          </div>
        </div>

        <button onClick={check} disabled={checking}
          className="mt-4 w-full sm:w-auto px-5 min-h-[44px] rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center justify-center gap-2">
          {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {checking ? 'Đang kiểm tra…' : steps.length ? 'Kiểm tra lại' : 'Kiểm tra ngay'}
        </button>

        {steps.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {steps.map((s, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border ${
                s.ok ? 'bg-emerald-500/[.06] border-emerald-500/20' : 'bg-red-500/[.07] border-red-500/25'}`}>
                {s.ok ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-100">{s.label}</p>
                  {!s.ok && <p className="text-[12.5px] text-red-300 mt-0.5 leading-relaxed">{s.detail}</p>}
                </div>
                {s.ms > 0 && <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">{s.ms}ms</span>}
              </li>
            ))}
          </ul>
        )}
        {allOk && !checking && (
          <p className="mt-3 text-[13px] text-emerald-400 font-semibold">✅ Firebase hoạt động tốt — đọc và ghi dữ liệu đều thành công.</p>
        )}
      </section>

      {children}
    </div>
  );
}
