import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { movieApi } from '../services/api';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import { ChevronLeft, ChevronRight, ChevronDown, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

// ── Filter data ───────────────────────────────────────────────
const FORMATS = [
  { label: 'Phim Bộ',    value: 'phim-bo' },
  { label: 'Phim Lẻ',   value: 'phim-le' },
  { label: 'Hoạt Hình',  value: 'hoat-hinh' },
  { label: 'TV Shows',   value: 'tv-shows' },
];

const CATEGORIES = [
  { label: 'Tất cả', value: '' },
  { label: 'Hành Động', value: 'hanh-dong' },
  { label: 'Tình Cảm',  value: 'tinh-cam' },
  { label: 'Hài Hước',  value: 'hai-huoc' },
  { label: 'Cổ Trang',  value: 'co-trang' },
  { label: 'Tâm Lý',    value: 'tam-ly' },
  { label: 'Hình Sự',   value: 'hinh-su' },
  { label: 'Kinh Dị',   value: 'kinh-di' },
  { label: 'Viễn Tưởng',value: 'vien-tuong' },
  { label: 'Phiêu Lưu', value: 'phieu-luu' },
  { label: 'Hoạt Hình', value: 'hoat-hinh' },
  { label: 'Thần Thoại',value: 'than-thoai' },
  { label: 'Chiến Tranh',value: 'chien-tranh' },
  { label: 'Thể Thao',  value: 'the-thao' },
  { label: 'Khoa Học',  value: 'khoa-hoc' },
  { label: 'Âm Nhạc',   value: 'am-nhac' },
  { label: 'Kinh Điển', value: 'kinh-dien' },
  { label: 'Gia Đình',  value: 'gia-dinh' },
];

const COUNTRIES = [
  { label: 'Tất cả',    value: '' },
  { label: 'Hàn Quốc',  value: 'han-quoc' },
  { label: 'Trung Quốc',value: 'trung-quoc' },
  { label: 'Âu Mỹ',     value: 'au-my' },
  { label: 'Nhật Bản',  value: 'nhat-ban' },
  { label: 'Thái Lan',  value: 'thai-lan' },
  { label: 'Việt Nam',  value: 'viet-nam' },
  { label: 'Đài Loan',  value: 'dai-loan' },
  { label: 'Hồng Kông', value: 'hong-kong' },
  { label: 'Ấn Độ',     value: 'an-do' },
  { label: 'Anh',       value: 'anh' },
  { label: 'Pháp',      value: 'phap' },
  { label: 'Đức',       value: 'duc' },
];

const YEARS = [
  { label: 'Tất cả', value: '' },
  ...Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { label: String(y), value: String(y) };
  }),
  { label: '2015', value: '2015' },
  { label: '2010', value: '2010' },
  { label: 'Trước 2010', value: '2009' },
];

const SORTS = [
  { label: 'Mới nhất',     value: 'modified.time' },
  { label: 'Tên A-Z',      value: 'name' },
  { label: 'Năm phát hành',value: 'year' },
];

// ── Dropdown component ────────────────────────────────────────
function FilterDropdown({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
          value
            ? 'bg-green-500/10 border-green-500/50 text-green-400'
            : 'bg-[#111] border-white/10 text-slate-300 hover:border-white/20'
        )}
      >
        <span className="truncate">{selected?.label || label}</span>
        <ChevronDown size={14} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                opt.value === value
                  ? 'bg-green-500/15 text-green-400 font-bold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function MovieList() {
  const { type } = useParams<{ type: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL
  const page = parseInt(searchParams.get('page') || '1');
  const [filterFormat, setFilterFormat]   = useState(type || 'phim-bo');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
  const [filterCountry, setFilterCountry]   = useState(searchParams.get('country') || '');
  const [filterYear, setFilterYear]         = useState(searchParams.get('year') || '');
  const [filterSort, setFilterSort]         = useState(searchParams.get('sort') || 'modified.time');

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const typeLabels: Record<string, string> = {
    'phim-bo': 'Phim Bộ',
    'phim-le': 'Phim Lẻ',
    'hoat-hinh': 'Hoạt Hình',
    'tv-shows': 'TV Shows',
    'phim-chieu-rap': 'Chiếu Rạp',
    'phim-vietsub': 'Vietsub',
    'phim-thuyet-minh': 'Thuyết Minh',
    'phim-moi': 'Phim Mới',
  };

  const currentLabel = typeLabels[filterFormat] || 'Phim';
  useSEO({
    title: `${currentLabel} Vietsub HD Mới Nhất`,
    description: `Xem ${currentLabel} Vietsub HD miễn phí tại Đảo Phim. Danh sách ${currentLabel} mới nhất, cập nhật liên tục hàng ngày.`,
    url: type ? `/type/${type}` : '/type/phim-bo',
    type: 'website',
  });

  // Sync type from URL param
  useEffect(() => {
    if (type) setFilterFormat(type);
  }, [type]);

  // Fetch movies when any filter changes
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await movieApi.filterMovies({
          type: filterFormat,
          category: filterCategory,
          country: filterCountry,
          year: filterYear,
          sort: filterSort,
          page,
          limit: 24,
        });
        setResults(res.items || []);
        setPagination(res.pagination);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
    window.scrollTo(0, 0);
  }, [filterFormat, filterCategory, filterCountry, filterYear, filterSort, page]);

  const handlePageChange = (newPage: number) => {
    const params: any = { page: newPage.toString() };
    if (filterCategory) params.category = filterCategory;
    if (filterCountry) params.country = filterCountry;
    if (filterYear) params.year = filterYear;
    if (filterSort !== 'modified.time') params.sort = filterSort;
    setSearchParams(params);
  };

  const resetFilters = () => {
    setFilterCategory('');
    setFilterCountry('');
    setFilterYear('');
    setFilterSort('modified.time');
    setSearchParams({});
  };

  const hasFilter = filterCategory || filterCountry || filterYear || filterSort !== 'modified.time';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* ── Hero header ── */}
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <p className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-3">
            Trang chủ <span className="text-slate-700">›</span> {currentLabel}
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">{currentLabel.toUpperCase()}</h1>
          <p className="text-slate-500 text-sm">Khám phá hàng ngàn bộ phim đa dạng thể loại và quốc gia.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* ── Filter bar ── */}
        <div className="bg-[#111] border border-white/8 rounded-2xl p-4 mb-6">

          {/* Format tabs (Định dạng) */}
          <div className="flex gap-2 flex-wrap mb-4">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilterFormat(f.value); setSearchParams({}); }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                  filterFormat === f.value
                    ? 'bg-green-500 text-black border-green-500'
                    : 'bg-transparent text-slate-400 border-white/10 hover:border-green-500/40 hover:text-green-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <FilterDropdown
              label="Thể loại"
              options={CATEGORIES}
              value={filterCategory}
              onChange={v => { setFilterCategory(v); setSearchParams({}); }}
            />
            <FilterDropdown
              label="Quốc gia"
              options={COUNTRIES}
              value={filterCountry}
              onChange={v => { setFilterCountry(v); setSearchParams({}); }}
            />
            <FilterDropdown
              label="Năm"
              options={YEARS}
              value={filterYear}
              onChange={v => { setFilterYear(v); setSearchParams({}); }}
            />
            <FilterDropdown
              label="Sắp xếp"
              options={SORTS}
              value={filterSort}
              onChange={v => { setFilterSort(v); setSearchParams({}); }}
            />
          </div>

          {/* Active filters + Reset */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {filterCategory && (
                <span className="flex items-center gap-1 text-[11px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full font-semibold">
                  {CATEGORIES.find(c => c.value === filterCategory)?.label}
                  <button onClick={() => setFilterCategory('')}><X size={10} /></button>
                </span>
              )}
              {filterCountry && (
                <span className="flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full font-semibold">
                  {COUNTRIES.find(c => c.value === filterCountry)?.label}
                  <button onClick={() => setFilterCountry('')}><X size={10} /></button>
                </span>
              )}
              {filterYear && (
                <span className="flex items-center gap-1 text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full font-semibold">
                  {filterYear}
                  <button onClick={() => setFilterYear('')}><X size={10} /></button>
                </span>
              )}
            </div>
            {hasFilter && (
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors shrink-0">
                <RotateCcw size={11} /> Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#111] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            {/* Results count */}
            {pagination && (
              <p className="text-xs text-slate-600 mb-3 font-mono">
                Trang {pagination.currentPage}/{pagination.totalPages} — {pagination.totalItems?.toLocaleString()} phim
              </p>
            )}

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {results.map(movie => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-green-500/50 hover:text-green-400 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let p: number;
                  if (pagination.totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        p === page
                          ? 'bg-green-500 text-black border-green-500'
                          : 'border-white/10 text-slate-400 hover:border-green-500/50 hover:text-green-400'
                      )}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:border-green-500/50 hover:text-green-400 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">🎬</div>
            <p className="text-white font-bold text-lg">Không tìm thấy phim</p>
            <p className="text-slate-500 text-sm max-w-xs">Thử thay đổi bộ lọc hoặc chọn thể loại khác.</p>
            <button onClick={resetFilters} className="mt-2 px-6 py-2.5 bg-green-500 text-black font-bold rounded-xl text-sm">
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
