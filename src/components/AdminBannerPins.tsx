import React, { useEffect, useState } from 'react';
import { Search, Pin, PinOff, Loader2 } from 'lucide-react';
import { movieApi } from '../services/api';
import { BannerPin, getBannerPins, pinApiMovie, unpinApiMovie } from '../lib/bannerPins';

// Admin: tìm phim API → ghim / bỏ ghim lên banner trang chủ
export default function AdminBannerPins({ showToast }: { showToast?: (m: string) => void }) {
  const [pins, setPins] = useState<BannerPin[]>([]);
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState('');

  const reload = () => getBannerPins().then(setPins).catch(() => {});
  useEffect(() => { reload(); }, []);

  const search = async () => {
    const q = kw.trim();
    if (!q) return;
    setSearching(true);
    try {
      const r = await movieApi.searchMovies(q, 1, 12);
      setResults(r?.items || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const isPinned = (slug: string) => pins.some(p => p.slug === slug);
  const toggle = async (m: any) => {
    setBusy(m.slug);
    try {
      if (isPinned(m.slug)) { await unpinApiMovie(m.slug); showToast?.('Đã bỏ ghim'); }
      else { await pinApiMovie(m); showToast?.('Đã ghim lên banner'); }
      await reload();
    } catch (e: any) { showToast?.('Lỗi: ' + (e?.message || e)); }
    setBusy('');
  };

  const row = (m: any) => (
    <div key={m.slug} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5">
      <img src={movieApi.getImageUrl(m.thumb_url || m.poster_url)} alt="" referrerPolicy="no-referrer"
        className="w-12 h-16 rounded-lg object-cover bg-slate-700 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{m.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{m.origin_name} {m.year ? `· ${m.year}` : ''}</p>
      </div>
      <button onClick={() => toggle(m)} disabled={busy === m.slug}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
          isPinned(m.slug) ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:border-indigo-400'}`}>
        {busy === m.slug ? <Loader2 size={13} className="animate-spin" /> : isPinned(m.slug) ? <PinOff size={13} /> : <Pin size={13} />}
        {isPinned(m.slug) ? 'Bỏ ghim' : 'Ghim'}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input value={kw} onChange={e => setKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Tìm phim API cần ghim (VD: Conan)..." className="input-field text-sm flex-1" />
        <button onClick={search} className="btn-primary text-sm px-4 flex items-center gap-1.5">
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Tìm
        </button>
      </div>

      {results.length > 0 && <div className="flex flex-col gap-2">{results.map(row)}</div>}

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Đang ghim ({pins.length})</p>
        {pins.length === 0
          ? <p className="text-sm text-slate-500">Chưa ghim phim API nào.</p>
          : <div className="flex flex-col gap-2">{pins.map(p => row(p))}</div>}
      </div>
    </div>
  );
}
