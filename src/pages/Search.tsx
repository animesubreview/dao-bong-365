import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import { ManualMovieCard, ManualMovie } from '../components/ManualMoviesSection';
import { subscribeManualMovies } from '../lib/manualMovies';
import { Search as SearchIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, usePageTitle } from '../lib/utils';

// Movie từ NguonC có _id bắt đầu bằng "nc-"
const isNguonC = (movie: Movie) => movie._id?.startsWith('nc-');

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [nguoncCount, setNguoncCount] = useState(0);
  const [manualResults, setManualResults] = useState<ManualMovie[]>([]);
  const [allManual, setAllManual] = useState<ManualMovie[]>([]);

  useSEO({
    title: query ? `Tìm kiếm: ${query}` : 'Tìm kiếm phim',
    description: query
      ? `Kết quả tìm kiếm phim "${query}" tại Đảo Phim. Xem phim online miễn phí HD Vietsub.`
      : 'Tìm kiếm phim online tại Đảo Phim. Hơn 50,000 bộ phim Vietsub HD miễn phí.',
    url: query ? `/search?q=${encodeURIComponent(query)}` : '/search',
    noIndex: true,
  });

  // Load manual movies from Firestore
  useEffect(() => {
    const unsub = subscribeManualMovies(setAllManual);
    return unsub;
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setManualResults([]);
      setPagination(null);
      return;
    }

    // Search manual movies
    const q = query.toLowerCase();
    setManualResults(
      allManual.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.originName?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      )
    );

    // Search API (KKPhim + NguonC song song)
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

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, page: newPage.toString() });
  };

  const totalCount = (pagination?.totalItems || results.length) + manualResults.length + nguoncCount;
  const hasResults = results.length > 0 || manualResults.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-20">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="py-8">
          <div className="flex items-center gap-3 mb-2">
            <SearchIcon size={22} className="text-sky-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              {query ? `Kết quả cho "${query}"` : 'Tìm kiếm phim'}
            </h1>
          </div>
          {query && !loading && (
            <p className="text-slate-500 text-sm ml-9">
              Tìm thấy <span className="text-sky-400 font-bold">{totalCount}</span> kết quả
              {nguoncCount > 0 && (
                <span className="ml-2 text-xs text-slate-600">
                  (bao gồm <span className="text-amber-400 font-semibold">{nguoncCount}</span> từ{' '}
                  <span className="text-amber-400 font-semibold">NguonC</span>)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#181818] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-sky-500/50 hover:text-sky-400 transition-all">
                  <ChevronLeft size={16} />
                </button>
                {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                  let p = page <= 3 ? idx + 1 : page >= pagination.totalPages - 2 ? pagination.totalPages - 4 + idx : page - 2 + idx;
                  if (p <= 0 || p > pagination.totalPages) return null;
                  return (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={cn('w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        page === p ? 'bg-sky-500 text-black border-sky-500' : 'border-white/10 text-slate-400 hover:border-sky-500/50 hover:text-sky-400'
                      )}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(page + 1)} disabled={page === pagination.totalPages}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-sky-500/50 hover:text-sky-400 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state - không tìm thấy */}
        {!loading && !hasResults && query && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-20 h-20 bg-[#181818] border border-white/8 rounded-full flex items-center justify-center text-slate-600">
              <SearchIcon size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Không tìm thấy phim nào</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Không có kết quả cho <span className="text-white font-semibold">"{query}"</span>. Thử tìm với từ khóa khác.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Link to="/" className="px-5 py-2.5 bg-sky-500 text-black font-bold rounded-xl text-sm hover:bg-sky-400 transition-all">
                Về trang chủ
              </Link>
              <Link to="/type/phim-bo" className="px-5 py-2.5 bg-[#181818] border border-white/10 text-white font-bold rounded-xl text-sm hover:border-sky-500/50 transition-all">
                Xem phim bộ
              </Link>
            </div>
          </div>
        )}

        {/* No query state */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 bg-[#181818] border border-white/8 rounded-full flex items-center justify-center text-slate-600">
              <SearchIcon size={36} />
            </div>
            <p className="text-slate-500 text-sm">Nhập từ khóa vào ô tìm kiếm phía trên</p>
          </div>
        )}

      </div>
    </div>
  );
}
