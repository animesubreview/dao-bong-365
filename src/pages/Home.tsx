import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Calendar, Trophy, RefreshCw, ChevronDown } from 'lucide-react';
import { footballApi, hasApiKey, LEAGUE_WORLD_CUP, SEASON_WORLD_CUP_2026 } from '../services/footballApi';
import { FixtureItem, isLive, isFinished } from '../types/football';
import { usePageTitle } from '../lib/utils';
import BottomNav from '../components/BottomNav';

const PAGE_SIZE = 10;

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
  return null;
}

function MatchCard({ f }: { f: FixtureItem }) {
  const s = f.fixture.status.short;
  return (
    <Link
      to={`/tran-dau/${f.fixture.id}`}
      className="block bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-green-700/60 transition-colors mb-3"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
          <img src={f.league.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
          <span className="truncate">{f.league.name}</span>
        </div>
        <div className="shrink-0 text-xs font-semibold text-slate-400">
          {fmtTime(f.fixture.date)} - {fmtDate(f.fixture.date)}
        </div>
      </div>

      <div className="px-4 py-4 flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <img src={f.teams.home.logo} alt="" className="w-8 h-8 object-contain shrink-0" />
          <span className="truncate text-sm text-white font-semibold">{f.teams.home.name}</span>
        </div>

        <div className="shrink-0 px-3 flex flex-col items-center gap-1">
          <StatusBadge f={f} />
          <div className="text-lg font-black text-white">
            {f.goals.home !== null ? `${f.goals.home} - ${f.goals.away}` : 'VS'}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
          <span className="truncate text-sm text-white font-semibold text-right">{f.teams.away.name}</span>
          <img src={f.teams.away.logo} alt="" className="w-8 h-8 object-contain shrink-0" />
        </div>
      </div>

      {isLive(s) && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-green-400 text-xs font-bold">
          <Radio size={12} className="animate-pulse" /> Xem trực tiếp
        </div>
      )}
    </Link>
  );
}

function Section({
  id, title, icon, items, loading, empty,
}: {
  id: string; title: string; icon: React.ReactNode; items: FixtureItem[]; loading: boolean; empty: string;
}) {
  const [page, setPage] = useState(1);
  const visible = items.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < items.length;

  return (
    <div id={id} className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-black text-white text-base tracking-wide uppercase">{title}</h2>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-green-500" size={22} /></div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
          {empty}
        </div>
      ) : (
        <>
          {visible.map(f => <MatchCard key={f.fixture.id} f={f} />)}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Xem thêm <ChevronDown size={15} />
            </button>
          )}
        </>
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
  const [wcNote, setWcNote] = useState('');

  async function loadAll() {
    if (!hasApiKey()) {
      setError('Chưa cấu hình VITE_API_FOOTBALL_KEY trong file .env');
      setLoading(false);
      return;
    }
    try {
      const [liveData, todayData] = await Promise.all([
        footballApi.getLiveFixtures(),
        footballApi.getFixturesByDate(todayStr()),
      ]);
      setLive(liveData);
      setToday(todayData);

      // World Cup: thử lấy theo league/season trước
      let wcData = await footballApi.getFixturesByLeague(LEAGUE_WORLD_CUP, SEASON_WORLD_CUP_2026);

      // Fallback: nếu rỗng, thử quét theo từng ngày trong giai đoạn World Cup (11/6 - 19/7/2026)
      // và lọc theo league id = 1, vì 1 số gói API chỉ trả dữ liệu khi truy vấn theo ngày.
      if (wcData.length === 0) {
        const sampleDates = ['2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25'];
        const results = await Promise.all(sampleDates.map(d => footballApi.getFixturesByDate(d).catch(() => [])));
        wcData = results.flat().filter(f => f.league.id === LEAGUE_WORLD_CUP);
      }

      if (wcData.length === 0) {
        setWcNote('Gói API hiện tại có thể chưa cấp quyền truy cập dữ liệu World Cup 2026 (một số gói free chỉ hỗ trợ vài giải nhất định). Bạn kiểm tra lại trên dashboard API-Football xem giải "World Cup" có nằm trong danh sách được phép truy cập của gói mình không.');
      } else {
        setWcNote('');
      }

      const wcSorted = wcData
        .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
      setWorldCup(wcSorted);
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

      {/* World Cup lên đầu tiên */}
      <Section
        id="worldcup"
        title="World Cup 2026"
        icon={<Trophy size={18} className="text-yellow-500" />}
        items={worldCup}
        loading={loading}
        empty={wcNote || 'Chưa có dữ liệu lịch thi đấu World Cup'}
      />

      <Section
        id="live"
        title="Đang diễn ra"
        icon={<Radio size={18} className="text-green-500" />}
        items={live}
        loading={loading}
        empty="Hiện không có trận nào đang diễn ra"
      />

      <Section
        id="today"
        title="Lịch thi đấu hôm nay"
        icon={<Calendar size={18} className="text-green-500" />}
        items={today}
        loading={loading}
        empty="Không có trận đấu hôm nay"
      />

      <BottomNav />
    </div>
  );
}
