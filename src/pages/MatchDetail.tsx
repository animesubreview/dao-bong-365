import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Radio, Calendar, MapPin, Trophy } from 'lucide-react';
import { footballApi } from '../services/footballApi';
import { getManualMatchByFixtureId, ManualMatchLink } from '../lib/manualMatches';
import { FixtureItem, isLive, isFinished } from '../types/football';
import FootballPlayer from '../components/FootballPlayer';
import BottomNav from '../components/BottomNav';
import { usePageTitle } from '../lib/utils';


export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [fixture, setFixture] = useState<FixtureItem | null>(null);
  const [manual, setManual] = useState<ManualMatchLink | null>(null);
  const [activeSource, setActiveSource] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fixtureId = Number(id);

  async function load() {
    try {
      const [f, m] = await Promise.all([
        footballApi.getFixtureById(fixtureId),
        getManualMatchByFixtureId(fixtureId),
      ]);
      setFixture(f);
      setManual(m);
      if (!f) setError('Không tìm thấy thông tin trận đấu');
    } catch (e: any) {
      setError(e.message || 'Lỗi tải dữ liệu trận đấu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [fixtureId]);

  usePageTitle(
    fixture ? `${fixture.teams.home.name} vs ${fixture.teams.away.name} - Trực tiếp - Đảo Bóng 365` : 'Đảo Bóng 365'
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-400 mb-4">{error || 'Không tìm thấy trận đấu'}</p>
        <Link to="/" className="text-green-400 hover:underline">← Về trang chủ</Link>
      </div>
    );
  }

  const s = fixture.fixture.status.short;
  const sources = manual?.sources || [];
  const currentSource = sources[activeSource];

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-6">
      <div className="px-3 md:px-6 pt-6 pb-2">
        <Link to="/" className="inline-flex items-center gap-1 text-slate-400 hover:text-green-400 text-sm">
          <ArrowLeft size={16} /> Quay lại
        </Link>
      </div>

      {/* Player */}
      {currentSource ? (
        <div className="md:mx-3 md:rounded-xl overflow-hidden border-y md:border border-slate-800">
          <FootballPlayer
            key={currentSource.url}
            src={currentSource.url}
            isM3u8={currentSource.isM3u8}
            title={`${fixture.teams.home.name} vs ${fixture.teams.away.name}`}
          />
        </div>
      ) : (
        <div className="md:mx-3 md:rounded-xl border-y md:border border-slate-800 bg-slate-900 p-10 text-center">
          <Radio size={28} className="mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400 text-sm">Chưa có link trực tiếp cho trận này. Vui lòng quay lại gần giờ thi đấu.</p>
        </div>
      )}

      {/* Source switcher */}
      {sources.length > 0 && (
        <div className="px-3 md:px-3 py-3 flex gap-2 flex-wrap">
          {sources.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveSource(i)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                i === activeSource
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 md:px-6">
        {/* Score card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-slate-400">
            <img src={fixture.league.logo} className="w-4 h-4 object-contain" alt="" />
            {fixture.league.name} • {fixture.league.round}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex flex-col items-center gap-2">
              <img src={fixture.teams.home.logo} className="w-14 h-14 object-contain" alt="" />
              <span className="text-white font-bold text-center text-sm">{fixture.teams.home.name}</span>
            </div>
            <div className="shrink-0 text-center">
              {isLive(s) && (
                <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold mb-1">
                  <Radio size={11} className="animate-pulse" /> {fixture.fixture.status.elapsed}'
                </span>
              )}
              {isFinished(s) && <div className="text-slate-400 text-xs font-bold mb-1">Kết thúc</div>}
              {!isLive(s) && !isFinished(s) && (
                <div className="text-green-400 text-xs font-bold mb-1">
                  {new Date(fixture.fixture.date).toLocaleString('vi-VN')}
                </div>
              )}
              <div className="text-3xl font-black text-white">
                {fixture.goals.home ?? '-'} : {fixture.goals.away ?? '-'}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <img src={fixture.teams.away.logo} className="w-14 h-14 object-contain" alt="" />
              <span className="text-white font-bold text-center text-sm">{fixture.teams.away.name}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-sm text-slate-400 space-y-2 mb-5">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-green-500" />
            {new Date(fixture.fixture.date).toLocaleString('vi-VN')}
          </div>
          {fixture.fixture.venue?.name && (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-green-500" />
              {fixture.fixture.venue.name}{fixture.fixture.venue.city ? `, ${fixture.fixture.venue.city}` : ''}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-yellow-500" />
            {fixture.league.name}
          </div>
        </div>
      </div>

      {/* Bottom sticky nav (mobile) */}
      <BottomNav />
    </div>
  );
}
