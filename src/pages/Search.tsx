import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import { ManualMovieCard, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeManualMovies } from '../lib/manualMovies';
import { Search as SearchIcon, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

function dec(s: string) {
  return (s||'').replace(/&#039;/g,"'").replace(/&amp;/g,'&');
}

const isNguonC = (movie: Movie) => movie._id?.startsWith('nc-');

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [manualResults, setManualResults] = useState<ManualMovie[]>([]);
  const [allManual, setAllManual] = useState<ManualMovie[]>([]);

  useSEO({
    title: query ? `Tìm kiếm: ${query}` : 'Tìm kiếm phim',
    description: query ? `Kết quả tìm kiếm "${query}" tại Đảo Phim.` : 'Tìm kiếm phim tại Đảo Phim.',
    url: query ? `/search?q=${encodeURIComponent(query)}` : '/search',
    noIndex: true,
  });

  useEffect(() => {
    const unsub = subscribeManualMovies(setAllManual);
    return unsub;
  }, []);

  useEffect(() => {
    if (!query) { setResults([]); setManualResults([]); setPagination(null); return; }
    const q = query.toLowerCase();
    setManualResults(allManual.filter(m =>
      m.name?.toLowerCase().includes(q) || m.originName?.toLowerCase().includes(q)
    ));
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await (movieApi as any).searchMoviesCombined?.(query, page) || await movieApi.searchMovies(query, page, 24);
        setResults(res.items || []);
        setPagination(res.pagination || null);
      } catch { setResults([]); setPagination(null); }
      finally { setLoading(false); }
    };
    fetch();
    window.scrollTo(0, 0);
  }, [query, page, allManual]);

  const setQuery = (q: string) => setSearchParams(q ? { q } : {});
  const handlePage = (p: number) => setSearchParams(query ? { q: query, page: String(p) } : { page: String(p) });

  const browseMovies = results.slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 pb-20 px-4">
      {/* Search bar - big, like CôBePhim */}
      <div className="pt-4 pb-5">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm phim, diễn viên..."
              defaultValue={query}
              onKeyDown={e => e.key === 'Enter' && setQuery((e.target as HTMLInputElement).value.trim())}
              className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all"
            />
          </div>
          <button
            onClick={() => {
              const inp = document.querySelector<HTMLInputElement>('input[placeholder="Tìm phim, diễn viên..."]');
              if (inp) setQuery(inp.value.trim());
            }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-2xl text-sm transition-all shrink-0">
            Tìm
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
      )}

      {/* Results */}
      {!loading && query && (
        <>
          {(manualResults.length > 0 || results.length > 0) ? (
            <>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal size={15} className="text-slate-400" />
                <span className="text-base font-black text-white">Kết quả tìm kiếm</span>
                <span className="text-sm text-slate-500 ml-1">"{query}"</span>
              </div>

              {/* 2-col grid like CôBePhim */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {manualResults.map(m => (
                  <ManualMovieCard key={m.id} movie={m} />
                ))}
                {results.map(m => (
                  <MovieCard key={m._id} movie={m} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-8">
                  <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 disabled:opacity-40 hover:border-green-500/50 hover:text-green-400 transition-all">
                    <ChevronLeft size={15}/> Trước
                  </button>
                  <span className="text-sm text-slate-400 font-semibold">
                    {page} / {pagination.totalPages}
                  </span>
                  <button onClick={() => handlePage(page + 1)} disabled={page >= pagination.totalPages}
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 disabled:opacity-40 hover:border-green-500/50 hover:text-green-400 transition-all">
                    Sau <ChevronRight size={15}/>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <SearchIcon size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-500 font-semibold">Không tìm thấy kết quả</p>
              <p className="text-slate-600 text-sm mt-1">Thử tên khác hoặc tên gốc tiếng Anh</p>
            </div>
          )}
        </>
      )}

      {/* Browse section (no query) - like CôBePhim */}
      {!query && !loading && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="grid grid-cols-2 gap-1 text-slate-500">
              <div className="w-2 h-2 rounded-sm bg-current" />
              <div className="w-2 h-2 rounded-sm bg-current" />
              <div className="w-2 h-2 rounded-sm bg-current" />
              <div className="w-2 h-2 rounded-sm bg-current" />
            </div>
            <span className="text-lg font-black text-white">Duyệt tìm</span>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            <SlidersHorizontal size={13} className="text-slate-500" />
            <span className="text-sm text-slate-500 font-semibold">Bộ lọc</span>
          </div>
          {/* Quick category filters */}
          <div className="flex gap-2 flex-wrap mb-5">
            {[
              { label: 'Phim bộ', to: '/type/phim-bo' },
              { label: 'Phim lẻ', to: '/type/phim-le' },
              { label: 'Anime', to: '/type/hoat-hinh' },
              { label: 'Chiếu rạp', to: '/type/phim-chieu-rap' },
              { label: 'TV Shows', to: '/type/tv-shows' },
            ].map(cat => (
              <Link key={cat.label} to={cat.to}
                className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/60 text-sm font-semibold text-slate-300 hover:border-green-500/50 hover:text-green-400 transition-all">
                {cat.label}
              </Link>
            ))}
          </div>
          {/* Browse latest movies 2 col */}
          <BrowseLatest />
        </>
      )}
    </div>
  );
}

function BrowseLatest() {
  const [movies, setMovies] = useState<Movie[]>([]);
  useEffect(() => {
    movieApi.getNewUpdates(1).then(r => setMovies(r.items.slice(0,10))).catch(()=>{});
  }, []);
  if (!movies.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4">
      {movies.map(m => <MovieCard key={m._id} movie={m} />)}
    </div>
  );
}
