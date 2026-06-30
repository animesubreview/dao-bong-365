import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Loader2 } from 'lucide-react';
import { movieApi } from '../services/api';
import { Movie } from '../types';

function dec(s: string) {
  return (s || '').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

const WEEKDAY_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Tạo 7 ngày: 6 ngày gần nhất trước hôm nay + hôm nay (giống dải tab trong ảnh mẫu)
function buildLastDays(count: number): { key: string; dayMonth: string; weekday: string }[] {
  const days: { key: string; dayMonth: string; weekday: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    days.push({ key: toDateKey(d), dayMonth: `${dd}/${mm}`, weekday: WEEKDAY_LABELS[d.getDay()] });
  }
  return days;
}

function EpisodeLabel({ movie }: { movie: Movie }) {
  const ep = movie.episode_current || '';
  if (!ep) return null;
  return <span className="text-slate-500 text-sm">{ep}</span>;
}

function ScheduleRow({ movie }: { movie: Movie }) {
  const [ok, setOk] = useState(false);
  return (
    <Link
      to={`/phim/${movie.slug}`}
      className="flex items-center gap-4 bg-slate-900/60 hover:bg-slate-800/70 rounded-2xl p-3 transition-colors"
    >
      <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0">
        <div className="absolute inset-0 bg-slate-800" />
        <img
          src={movieApi.getImageUrl(movie.poster_url || movie.thumb_url)}
          alt={dec(movie.name)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setOk(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: ok ? 1 : 0, transition: 'opacity 400ms ease' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-[15px] line-clamp-1">{dec(movie.name)}</div>
        <div className="mt-1"><EpisodeLabel movie={movie} /></div>
      </div>
    </Link>
  );
}

export default function SchedulePage() {
  const days = useMemo(() => buildLastDays(7), []);
  const [selectedDay, setSelectedDay] = useState(days[days.length - 1].key); // mặc định hôm nay
  const [byDate, setByDate] = useState<Map<string, Movie[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    movieApi.getScheduleByDate(8)
      .then((groups) => {
        if (!mounted) return;
        const map = new Map<string, Movie[]>();
        for (const g of groups) map.set(g.date, g.movies);
        setByDate(map);
        // Nếu hôm nay chưa có phim, tự chọn ngày gần nhất có dữ liệu
        if (!map.get(selectedDay)?.length) {
          const firstWithData = groups.find((g) => g.movies.length > 0);
          if (firstWithData) setSelectedDay(firstWithData.date);
        }
      })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moviesOfDay = byDate.get(selectedDay) || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="text-green-400" size={24} />
        <h1 className="text-xl md:text-2xl font-black text-white">Lịch chiếu</h1>
      </div>

      {/* Tabs ngày */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {days.map((d) => {
          const active = d.key === selectedDay;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDay(d.key)}
              className={`shrink-0 flex flex-col items-center justify-center gap-1 px-5 py-2.5 rounded-xl border-b-2 transition-colors ${
                active ? 'border-green-400 bg-slate-900/60' : 'border-transparent bg-slate-900/30'
              }`}
            >
              <span className={`text-sm ${active ? 'text-slate-300' : 'text-slate-500'}`}>{d.dayMonth}</span>
              <span className={`text-sm font-bold ${active ? 'text-green-400' : 'text-slate-300'}`}>{d.weekday}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm">Đang tải lịch chiếu...</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-slate-500 text-sm">
          Không thể tải lịch chiếu lúc này. Vui lòng thử lại sau.
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {moviesOfDay.map((m) => <ScheduleRow key={m._id || m.slug} movie={m} />)}
          {moviesOfDay.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">Chưa có phim cập nhật trong ngày này.</div>
          )}
        </div>
      )}
    </div>
  );
}
