import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Calendar, Trophy, RefreshCw } from 'lucide-react';
import { footballApi, hasApiKey, LEAGUE_WORLD_CUP, SEASON_WORLD_CUP_2026 } from '../services/footballApi';
import { FixtureItem, isLive, isFinished } from '../types/football';
import { usePageTitle } from '../lib/utils';
import BottomNav from '../components/BottomNav';

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function StatusBadge({ f }: { f: FixtureItem }) {
  const s = f.fixture.status.short;
  if (isLive(s)) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-green-600 text-white text-xs font-bold flex items-center gap-1">
        <Radio size={11} className="animate-pulse" /> {f.fixture.status.elapsed ?? ''}'
      </span>
    );
  }
  if (isFinished(s)) {
    return <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-xs font-bold">Kết thúc</span>;
  }
  return <span className="text-green-400 text-sm font-bold">{fmtTime(f.fixture.date)}</span>;
}

function MatchRow({ f }: { f: FixtureItem }) {
  return (
    <Link
      to={`/tran-dau/${f.fixture.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/60 last:border-0"
    >
      <div className="w-14 shrink-0 text-center">
        <StatusBadge f={f} />
        <div className="text-[10px] text-slate-500 mt-0.5">{fmtDate(f.fixture.date)}</div>
      </div>
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="truncate text-sm text-slate-100 font-medium text-right">{f.teams.home.name}</span>
          <img src={f.teams.home.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
        </div>
        <div className="shrink-0 px-3 py-1 rounded-lg bg-slate-800 font-black text-white text-sm min-w-[52px] text-center">
          {f.goals.home !== null ? `${f.goals.home} : ${f.goals.away}` : 'VS'}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img src={f.teams.away.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
          <span className="truncate text-sm text-slate-100 font-medium">{f.teams.away.name}</span>
        </div>
      </div>
      <Radio size={14} className="text-green-500 shrink-0" />
    </Link>
  );
}

function Section({ title, icon, items, loading, empty }: { title: string; icon: React.ReactNode; items: FixtureItem[]; loading: boolean; empty: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden mb-6">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
        {icon}
        <h2 className="font-bold text-white text-sm tracking-wide uppercase">{title}</h2>
      </div>
      {loading ? (
        <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-green-500" size={22} /></div>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-slate-500 text-sm">{empty}</p>
      ) : (
        items.map(f => <MatchRow key={f.fixture.id} f={f} />)
      )}
    </div>
  );
}

export default function Home() {
  usePageTitle('Đảo Bóng 365 - Trực tiếp bóng đá, lịch thi đấu, tỷ số World Cup 2026');

  const [live, setLive] = useState<FixtureItem[]>([]);
  const [today, setToday] = useState<FixtureItem[]>([]);
  const [worldCup, setWorldCup] = useState<FixtureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAll() {
    if (!hasApiKey()) {
      setError('Chưa cấu hình VITE_API_FOOTBALL_KEY trong file .env');
      setLoading(false);
      return;
    }
    try {
      const [liveData, todayData, wcData] = await Promise.all([
        footballApi.getLiveFixtures(),
        footballApi.getFixturesByDate(todayStr()),
        footballApi.getFixturesByLeague(LEAGUE_WORLD_CUP, SEASON_WORLD_CUP_2026),
      ]);
      setLive(liveData);
      setToday(todayData);
      const wcUpcoming = wcData
        .filter(f => !isFinished(f.fixture.status.short))
        .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
        .slice(0, 10);
      setWorldCup(wcUpcoming.length ? wcUpcoming : wcData.slice(0, 10));
    } catch (e: any) {
      setError(e.message || 'Không tải được dữ liệu trận đấu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 pb-20 md:pb-6">
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-green-900/40 via-slate-900 to-slate-950 border border-green-900/40 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚽</span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            ĐẢO <span className="text-green-400">BÓNG 365</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm md:text-base">
          Trực tiếp bóng đá, lịch thi đấu &amp; tỷ số cập nhật real-time — đồng hành cùng World Cup 2026.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-900 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div id="live">
        <Section
          title="Đang diễn ra"
          icon={<Radio size={16} className="text-green-500" />}
          items={live}
          loading={loading}
          empty="Hiện không có trận nào đang diễn ra"
        />
      </div>

      <div id="today">
        <Section
          title="Lịch thi đấu hôm nay"
          icon={<Calendar size={16} className="text-green-500" />}
          items={today}
          loading={loading}
          empty="Không có trận đấu hôm nay"
        />
      </div>

      <div id="worldcup">
        <Section
          title="World Cup 2026"
          icon={<Trophy size={16} className="text-yellow-500" />}
          items={worldCup}
          loading={loading}
          empty="Chưa có dữ liệu lịch thi đấu World Cup"
        />
      </div>

      <BottomNav />
    </div>
  );
}
