import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Film, ChevronRight } from 'lucide-react';
import { subscribeUpcomingMovies, UpcomingMovie } from '../lib/upcomingMovies';
import { subscribeManualMovies } from '../lib/manualMovies';
import { ManualMovie } from '../components/ManualMoviesSection';
import { movieApi } from '../services/api';
import { Movie } from '../types';

useSEO;

function dec(s: string) {
  return (s||'').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

// Generate next 7 days
function getWeekDays() {
  const days = [];
  const now = new Date();
  const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];
  const dayFull = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    days.push({
      key: `${d.getFullYear()}-${mm}-${dd}`,
      label: `${dd}/${mm}`,
      short: i === 0 ? 'Hôm nay' : dayNames[d.getDay()],
      full: i === 0 ? 'Hôm nay' : dayFull[d.getDay()],
      isToday: i === 0,
    });
  }
  return days;
}

interface ScheduleEntry {
  id: string;
  movieName: string;
  posterUrl?: string;
  embedUrl?: string;
  dayOfWeek: string;
  timeSlot: string;
  type: string;
  episode?: string;
  note?: string;
  isActive: boolean;
  createdAt: number;
}

const DAYS_MAP: Record<string,number> = { T2:1, T3:2, T4:3, T5:4, T6:5, T7:6, CN:0 };

export default function CinemaPage() {
  const days = getWeekDays();
  const [activeDay, setActiveDay] = useState(0);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingMovie[]>([]);
  const [manualMovies, setManualMovies] = useState<ManualMovie[]>([]);
  const [cinemaMovies, setCinemaMovies] = useState<Movie[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('schedule_entries');
      if (stored) setSchedules(JSON.parse(stored).filter((s:ScheduleEntry) => s.isActive));
    } catch {}
    const unsub1 = subscribeUpcomingMovies(setUpcoming);
    const unsub2 = subscribeManualMovies(setManualMovies);
    movieApi.getMoviesByType('phim-chieu-rap', 1, 20).then(r => setCinemaMovies(r.items)).catch(()=>{});
    return () => { unsub1(); unsub2(); };
  }, []);

  // Get schedules for selected day
  const selectedDate = new Date();
  selectedDate.setDate(new Date().getDate() + activeDay);
  const selectedDayOfWeek = selectedDate.getDay(); // 0=Sun

  const daySchedules = schedules.filter(s => {
    const mapped = DAYS_MAP[s.dayOfWeek];
    return mapped === selectedDayOfWeek;
  }).sort((a,b) => a.timeSlot.localeCompare(b.timeSlot));

  // Upcoming movies for today section
  const upcomingMovies = upcoming.filter(m => m.upcomingType === 'movie').slice(0,6);
  const upcomingSeries = upcoming.filter(m => m.upcomingType === 'series').slice(0,6);

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Calendar size={16} className="text-green-400" />
        </div>
        <h1 className="text-xl font-black text-white">Lịch chiếu</h1>
      </div>

      {/* Day tabs - horizontal scroll like image 14 */}
      <div className="overflow-x-auto px-4 mb-5" style={{ scrollbarWidth:'none' }}>
        <div className="flex gap-2 min-w-max">
          {days.map((day, i) => (
            <button key={day.key} onClick={() => setActiveDay(i)}
              className="flex flex-col items-center px-4 py-2.5 rounded-xl transition-all shrink-0 relative"
              style={{
                background: activeDay === i ? 'transparent' : 'transparent',
                borderBottom: activeDay === i ? '2px solid #22c55e' : '2px solid transparent',
                color: activeDay === i ? '#22c55e' : '#64748b',
              }}>
              <span className="text-[11px] font-semibold">{day.label}</span>
              <span className={`text-sm font-black ${activeDay === i ? 'text-green-400' : 'text-slate-400'}`}>{day.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule list for selected day */}
      <div className="px-4">
        {daySchedules.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6">
            {daySchedules.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 bg-slate-900/80 rounded-2xl p-3 border border-slate-800/60">
                {/* Poster */}
                {entry.posterUrl ? (
                  <img src={entry.posterUrl} alt={entry.movieName}
                    className="w-14 h-[84px] object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-14 h-[84px] bg-slate-800 rounded-xl shrink-0 flex items-center justify-center">
                    <Film size={20} className="text-slate-600" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm leading-tight line-clamp-2">{entry.movieName}</p>
                  {entry.episode && (
                    <p className="text-green-400 text-xs font-semibold mt-0.5">{entry.episode}</p>
                  )}
                  {entry.note && (
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">{entry.note}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock size={11} className="text-slate-500" />
                    <span className="text-green-400 text-xs font-bold">{entry.timeSlot}</span>
                  </div>
                </div>
                {/* Link to movie */}
                {entry.embedUrl && (
                  <a href={entry.embedUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-9 h-9 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <ChevronRight size={16} className="text-green-400" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Calendar size={36} className="text-slate-700" />
            <p className="text-slate-500 text-sm font-semibold">Chưa có lịch chiếu cho ngày này</p>
            <p className="text-slate-700 text-xs">Admin có thể thêm lịch trong trang Quản lý</p>
          </div>
        )}

        {/* Phim chiếu rạp section */}
        {cinemaMovies.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Mãn Nhãn với Phim Chiếu Rạp</h2>
              <Link to="/type/phim-chieu-rap"
                className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:border-green-500/50 hover:text-white transition-all">
                <ChevronRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cinemaMovies.slice(0,4).map(m => (
                <Link key={m._id} to={`/phim/${m.slug}`}
                  className="group relative rounded-xl overflow-hidden bg-slate-800" style={{aspectRatio:'16/9'}}>
                  <img src={movieApi.getImageUrl(m.thumb_url||m.poster_url)} alt={dec(m.name)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    {m.quality && <span className="text-[8px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded mr-1">{m.quality}</span>}
                    <p className="text-white text-[11px] font-bold line-clamp-1 mt-1">{dec(m.name)}</p>
                    <p className="text-slate-400 text-[9px] truncate">{dec(m.origin_name)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Phim Sắp Tới */}
        {upcomingMovies.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Phim Sắp Tới Trên Rổ</h2>
              <Link to="/type/phim-chieu-rap"
                className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:border-green-500/50 hover:text-white transition-all">
                <ChevronRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {upcomingMovies.map(m => (
                <div key={m.id} className="relative rounded-xl overflow-hidden bg-slate-800" style={{aspectRatio:'2/3'}}>
                  {m.posterUrl && (
                    <img src={m.posterUrl} alt={m.name}
                      className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-0 right-0 px-2">
                    <span className="text-[9px] font-black bg-slate-800/90 text-white px-1.5 py-0.5 rounded">Sắp chiếu</span>
                    <p className="text-white text-[11px] font-bold line-clamp-1 mt-1">{m.name}</p>
                    <p className="text-slate-400 text-[9px] truncate">{m.originName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anime/Series sắp chiếu */}
        {upcomingSeries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-black text-white mb-4">Phim Bộ Sắp Chiếu</h2>
            <div className="flex flex-col gap-2">
              {upcomingSeries.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/40">
                  {m.posterUrl ? (
                    <img src={m.posterUrl} alt={m.name} className="w-12 h-16 object-cover rounded-lg shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-12 h-16 bg-slate-800 rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm line-clamp-1">{m.name}</p>
                    <p className="text-slate-500 text-[11px] truncate">{m.originName}</p>
                    {m.releaseDate && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar size={10} className="text-green-400" />
                        <span className="text-green-400 text-[10px] font-bold">{m.releaseDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {schedules.length === 0 && cinemaMovies.length === 0 && upcomingMovies.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-4">
            <Calendar size={48} className="text-slate-700" />
            <p className="text-slate-500 font-semibold">Chưa có lịch chiếu</p>
          </div>
        )}
      </div>
    </div>
  );
}
