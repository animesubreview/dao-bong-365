import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import { ManualMovieCard, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeManualMovies } from '../lib/manualMovies';
import { Search as SearchIcon, Loader2, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn, usePageTitle } from '../lib/utils';

const isNguonC = (movie: Movie) => movie._id?.startsWith('nc-');

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [inputVal, setInputVal] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [nguoncCount, setNguoncCount] = useState(0);
  const [manualResults, setManualResults] = useState<ManualMovie[]>([]);
  const [allManual, setAllManual] = useState<ManualMovie[]>([]);

  const [browseMovies, setBrowseMovies] = useState<Movie[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  useSEO({
    title: query ? `Tìm kiếm: ${query}` : 'Tìm kiếm phim',
    description: query
      ? `Kết quả tìm kiếm phim "${query}" tại Đảo Phim. Xem phim online miễn phí HD Vietsub.`
      : 'Tìm kiếm phim online tại Đảo Phim. Hơn 50,000 bộ phim Vietsub HD miễn phí.',
    url: query ? `/search?q=${encodeURIComponent(query)}` : '/search',
    noIndex: true,
  });

  // Sync input với query trên URL
  useEffect(() => { setInputVal(query); }, [query]);

  // Load manual movies
  useEffect(() => {
    const unsub = subscribeManualMovies(setAllManual);
    return unsub;
  }, []);

  // Load browse movies khi chưa có query
  useEffect(() => {
    if (query) return;
    setBrowseLoading(true);
    movieApi.getNewUpdates(1)
      .then((res) => setBrowseMovies(res.items || []))
      .catch(() => setBrowseMovies([]))
      .finally(() => setBrowseLoading(false));
  }, [query]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setManualResults([]);
      setPagination(null);
      return;
    }
    const q = query.toLowerCase();
    setManualResults(
      allManual.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.originName?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      )
    );
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await movieApi.searchMoviesCombined(query, page);
        setResults(res.items || []);
        setPagination(res.pagination || null);
        setNguoncCount(res.nguoncCount || 0);
      } catch {
        setResults([]);
        setPagination(null);
        setNguoncCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
    window.scrollTo(0, 0);
  }, [query, page, allManual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal.trim();
    if (!val) return;
    setSearchParams({ q: val, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, page: newPage.toString() });
  };

  const totalCount = (pagination?.totalItems || results.length) + manualResults.length + nguoncCount;
  const hasResults = results.length > 0 || manualResults.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-6">
      <div className="max-w-7xl mx-auto px-4">

        {/* ── Ô tìm kiếm lớn ── */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-7">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Tìm phim, diễn viên..."
              autoFocus
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 bg-green-500 hover:bg-green-400 text-black font-bold px-5 rounded-2xl text-sm transition-colors"
          >
            Tìm
          </button>
        </form>

        {/* ── Kết quả khi có query ── */}
        {query && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <SearchIcon size={18} className="text-green-400" />
              <h1 className="text-lg font-black text-white">Kết quả cho "{query}"</h1>
            </div>
            {!loading && (
              <p className="text-slate-500 text-sm ml-7">
                Tìm thấy <span className="text-green-400 font-bold">{totalCount}</span> kết quả
                {nguoncCount > 0 && (
                  <span className="ml-2 text-xs text-slate-600">
                    (bao gồm <span className="text-amber-400 font-semibold">{nguoncCount}</span> từ{' '}
                    <span className="text-amber-400 font-semibold">NguonC</span>)
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#181818] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Kết quả tìm kiếm */}
        {!loading && hasResults && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {manualResults.map(movie => (
                <ManualMovieCard key={movie.id} movie={movie} />
              ))}
              {results.map(movie => (
                <div key={movie._id} className="relative">
                  <MovieCard movie={movie} />
                  {isNguonC(movie) && (
                    <span className="absolute top-1.5 left-1.5 z-10 bg-amber-500/90 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md leading-tight pointer-events-none shadow">
                      NguonC
                    </span>
                  )}
                </div>
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-green-500/50 hover:text-green-400 transition-all">
                  <ChevronLeft size={16} />
                </button>
                {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                  let p = page <= 3 ? idx + 1 : page >= pagination.totalPages - 2 ? pagination.totalPages - 4 + idx : page - 2 + idx;
                  if (p <= 0 || p > pagination.totalPages) return null;
                  return (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={cn('w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        page === p ? 'bg-green-500 text-black border-green-500' : 'border-white/10 text-slate-400 hover:border-green-500/50 hover:text-green-400'
                      )}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(page + 1)} disabled={page === pagination.totalPages}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-green-500/50 hover:text-green-400 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Không tìm thấy */}
        {!loading && !hasResults && query && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-[#181818] rounded-full flex items-center justify-center text-slate-600">
              <SearchIcon size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Không tìm thấy phim nào</h3>
              <p className="text-slate-500 text-sm">Thử tìm với từ khóa khác.</p>
            </div>
          </div>
        )}

        {/* ── Duyệt tìm khi chưa có query ── */}
        {!query && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid size={18} className="text-green-400" />
              <h2 className="text-base font-black text-white">Duyệt tìm</h2>
            </div>
            {browseLoading && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-[#181818] rounded-xl animate-pulse" />
                ))}
              </div>
            )}
            {!browseLoading && browseMovies.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {browseMovies.map(movie => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
