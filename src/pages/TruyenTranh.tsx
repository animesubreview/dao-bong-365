import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Search,
  X, Loader2, ArrowLeft, ChevronDown, Layers,
  Flame, CheckCircle2, Sparkles, CalendarClock, SlidersHorizontal,
  SkipBack, SkipForward, List,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── API ────────────────────────────────────────────────────────────────────
const OTRUYEN_BASE = 'https://otruyenapi.com/v1/api';

// CDN chính xác: https://img.otruyenapi.com
// thumb_url từ API là tên file, cần thêm path /uploads/comics/
const CDN = 'https://img.otruyenapi.com';
const CDN_DOMAINS = [CDN]; // giữ array để không đổi code khác

function buildImgUrl(thumb_url: string, _cdnIndex = 0): string {
  if (!thumb_url) return '';
  // Nếu đã là URL đầy đủ, dùng luôn
  if (thumb_url.startsWith('http')) return thumb_url;
  // Nếu đã có path dạng /uploads/... hoặc uploads/...
  if (thumb_url.includes('/')) {
    const clean = thumb_url.startsWith('/') ? thumb_url : `/${thumb_url}`;
    return `${CDN}${clean}`;
  }
  // Chỉ là tên file (vd: "ten-truyen-thumb.jpg") → thêm path /uploads/comics/
  return `${CDN}/uploads/comics/${thumb_url}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Comic {
  _id: string;
  name: string;
  slug: string;
  origin_name?: string[];
  status?: string;
  thumb_url: string;
  category?: { id: string; name: string; slug: string }[];
  chaptersLatest?: { chapter_name: string; chapter_title?: string; updated_at: string }[];
}

interface ChapterItem {
  chapter_name: string;
  chapter_title?: string;
  chapter_api_data: string;
}

interface ComicDetail {
  _id: string;
  name: string;
  slug: string;
  origin_name?: string[];
  status?: string;
  thumb_url: string;
  author?: string[];
  category?: { id: string; name: string; slug: string }[];
  content?: string;
  chapters?: { server_name: string; server_data: ChapterItem[] }[];
}

interface Genre { _id: string; name: string; slug: string; }

// ─── Tabs config ─────────────────────────────────────────────────────────────
const LIST_TABS = [
  { key: 'truyen-moi',     label: 'Mới cập nhật', icon: Sparkles,      },
  { key: 'dang-phat-hanh', label: 'Đang ra',       icon: Flame,         },
  { key: 'hoan-thanh',     label: 'Hoàn thành',    icon: CheckCircle2,  },
  { key: 'sap-ra-mat',     label: 'Sắp ra mắt',    icon: CalendarClock, },
] as const;
type ListKey = typeof LIST_TABS[number]['key'];

// ─── Comic Card ───────────────────────────────────────────────────────────────
function ComicCard({ comic, onClick }: { comic: Comic; onClick: () => void }) {
  const [cdnIndex, setCdnIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const imgSrc = allFailed ? '' : buildImgUrl(comic.thumb_url, cdnIndex);
  const latestChap = comic.chaptersLatest?.[0]?.chapter_name;
  const isCompleted = comic.status === 'completed';

  const handleImgError = () => {
    const next = cdnIndex + 1;
    if (next < CDN_DOMAINS.length) {
      setCdnIndex(next);
    } else {
      setAllFailed(true);
    }
  };

  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800/60 hover:border-sky-500/50 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-sky-500/10 text-left"
    >
      <div className="relative w-full bg-slate-800" style={{ aspectRatio: '2/3' }}>
        {!allFailed ? (
          <img src={imgSrc} alt={comic.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImgError} referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2">
            <BookOpen size={24} className="text-slate-600 shrink-0" />
            <span className="text-[9px] text-slate-600 text-center leading-snug line-clamp-3">{comic.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className={cn(
          'absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md',
          isCompleted ? 'bg-blue-600 text-white' : 'bg-sky-600 text-white'
        )}>
          {isCompleted ? 'Full' : 'Đang ra'}
        </div>
        {latestChap && (
          <div className="absolute bottom-1.5 right-1.5">
            <span className="text-[10px] font-bold bg-black/75 text-sky-400 px-1.5 py-0.5 rounded">
              Ch.{latestChap}
            </span>
          </div>
        )}
      </div>
      <div className="px-2 py-2">
        <p className="text-white text-[11px] font-bold line-clamp-2 leading-snug group-hover:text-sky-400 transition-colors">
          {comic.name}
        </p>
        {comic.origin_name?.[0] && (
          <p className="text-slate-500 text-[10px] mt-0.5 truncate">{comic.origin_name[0]}</p>
        )}
      </div>
    </button>
  );
}

// ─── Reader view ─────────────────────────────────────────────────────────────
function ReaderView({
  detail, chapters, currentIndex, images, onBack, onChangeChapter,
}: {
  detail: ComicDetail;
  chapters: ChapterItem[];
  currentIndex: number;
  images: { page: number; src: string }[];
  onBack: () => void;
  onChangeChapter: (index: number) => void;
}) {
  const [showChapterList, setShowChapterList] = useState(false);
  const chap = chapters[currentIndex];
  const hasPrev = currentIndex < chapters.length - 1; // chapters reversed → prev = higher index
  const hasNext = currentIndex > 0;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const goChapter = (index: number) => {
    onChangeChapter(index);
    scrollTop();
    setShowChapterList(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-semibold shrink-0">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Quay lại</span>
          </button>
          <div className="flex-1 text-center min-w-0 px-2">
            <p className="text-white text-xs font-bold truncate">{detail.name}</p>
            <p className="text-sky-400 text-[11px]">Chương {chap?.chapter_name}</p>
          </div>
          {/* Chapter picker button */}
          <button
            onClick={() => setShowChapterList(v => !v)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
          >
            <List size={13} /> Chương
          </button>
        </div>

        {/* Navigation row */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            disabled={!hasPrev}
            onClick={() => goChapter(currentIndex + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-sky-500/40 rounded-xl text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <SkipBack size={13} /> Chương trước
          </button>
          <div className="text-slate-500 text-xs font-bold px-1 shrink-0">
            {chapters.length - currentIndex}/{chapters.length}
          </div>
          <button
            disabled={!hasNext}
            onClick={() => goChapter(currentIndex - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-sky-500/40 rounded-xl text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Chương sau <SkipForward size={13} />
          </button>
        </div>

        {/* Chapter dropdown list */}
        {showChapterList && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowChapterList(false)} />
            <div className="absolute top-full left-0 right-0 z-30 bg-slate-950 border-b border-slate-800 shadow-2xl max-h-64 overflow-y-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 p-3">
                {[...chapters].map((ch, i) => {
                  // chapters từ API order: index 0 = chap đầu, ta đã reverse nên hiển thị ngược lại
                  const displayIndex = chapters.length - 1 - i;
                  return (
                    <button
                      key={i}
                      onClick={() => goChapter(displayIndex)}
                      className={cn(
                        'px-2 py-2 rounded-lg text-xs font-bold transition-all text-center',
                        currentIndex === displayIndex
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                      )}
                    >
                      {ch.chapter_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Pages ── */}
      <div className="max-w-2xl mx-auto">
        {images.map(img => (
          <img key={img.page} src={img.src} alt={`Trang ${img.page}`}
            className="w-full block" referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ))}
      </div>

      {/* ── Bottom navigation ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4">
          <p className="text-center text-slate-400 text-xs mb-3">
            <span className="text-white font-bold">{detail.name}</span> · Chương <span className="text-sky-400 font-bold">{chap?.chapter_name}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              disabled={!hasPrev}
              onClick={() => goChapter(currentIndex + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500/40 rounded-xl text-sm font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <SkipBack size={15} /> Chương trước
            </button>
            <button
              onClick={() => { scrollTop(); }}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-all"
              title="Lên đầu trang"
            >
              ↑ Top
            </button>
            <button
              disabled={!hasNext}
              onClick={() => goChapter(currentIndex - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-500 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-600/20"
            >
              Chương sau <SkipForward size={15} />
            </button>
          </div>
          <button
            onClick={onBack}
            className="w-full mt-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Quay lại danh sách chương
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────
function DetailView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ComicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [cdnIndex, setCdnIndex] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);

  // Reader state
  const [chapLoading, setChapLoading] = useState(false);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [chapterImages, setChapterImages] = useState<{ page: number; src: string }[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${OTRUYEN_BASE}/truyen-tranh/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setDetail(data.data.item); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const loadChapter = async (chap: ChapterItem) => {
    setChapLoading(true);
    try {
      const r = await fetch(chap.chapter_api_data);
      const data = await r.json();
      if (data.status === 'success') {
        const domain = data.data.domain_cdn;
        const path = data.data.item.chapter_path;
        setChapterImages(data.data.item.chapter_image.map((img: any) => ({
          page: img.image_page,
          src: `${domain}/${path}/${img.image_file}`,
        })));
      }
    } catch {} finally { setChapLoading(false); }
  };

  const handleReadChapter = async (index: number) => {
    if (!detail) return;
    const chapters = detail.chapters?.[0]?.server_data ?? [];
    setReadingIndex(index);
    await loadChapter(chapters[index]);
  };

  const handleChangeChapter = async (index: number) => {
    if (!detail) return;
    const chapters = detail.chapters?.[0]?.server_data ?? [];
    setChapLoading(true);
    setReadingIndex(index);
    await loadChapter(chapters[index]);
  };

  const allChapters = detail?.chapters?.[0]?.server_data ?? [];
  // Chapters hiển thị: đảo ngược để chap mới nhất lên đầu
  const chaptersReversed = [...allChapters].reverse();

  if (readingIndex !== null && detail) {
    if (chapLoading) return (
      <div className="min-h-screen bg-black flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-sky-400" size={28} />
        <span className="text-slate-400">Đang tải chương...</span>
      </div>
    );
    return (
      <ReaderView
        detail={detail}
        chapters={allChapters}
        currentIndex={readingIndex}
        images={chapterImages}
        onBack={() => { setReadingIndex(null); setChapterImages([]); }}
        onChangeChapter={handleChangeChapter}
      />
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-sky-400" size={36} />
    </div>
  );
  if (!detail) return <div className="text-center py-20 text-slate-400">Không tìm thấy truyện</div>;

  const handleCoverError = () => {
    const next = cdnIndex + 1;
    if (next < CDN_DOMAINS.length) setCdnIndex(next);
    else setCoverFailed(true);
  };
  const imgSrc = coverFailed ? '' : buildImgUrl(detail.thumb_url, cdnIndex);
  const isCompleted = detail.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-5 transition-colors text-sm">
        <ArrowLeft size={15} /> Danh sách truyện
      </button>

      {/* Hero */}
      <div className="flex gap-5 p-5 bg-slate-900 rounded-2xl border border-slate-800/60 mb-5 relative overflow-hidden">
        {imgSrc && (
          <div className="absolute inset-0">
            <img src={imgSrc} alt="" className="w-full h-full object-cover blur-2xl opacity-10 scale-110" referrerPolicy="no-referrer" onError={() => {}} />
          </div>
        )}
        <div className="relative shrink-0 w-28 sm:w-36 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50" style={{ aspectRatio: '2/3' }}>
          {imgSrc ? (
            <img src={imgSrc} alt={detail.name} className="w-full h-full object-cover"
              onError={handleCoverError} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <BookOpen size={32} className="text-slate-600" />
            </div>
          )}
        </div>
        <div className="relative flex-1 min-w-0 flex flex-col justify-center">
          <h1 className="text-white font-black text-lg sm:text-xl leading-tight mb-1">{detail.name}</h1>
          {detail.origin_name?.[0] && (
            <p className="text-slate-400 text-sm mb-3">{detail.origin_name.join(', ')}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border',
              isCompleted
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/30')}>
              {isCompleted ? '✓ Hoàn thành' : '⟳ Đang cập nhật'}
            </span>
            {detail.author?.map(a => (
              <span key={a} className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">{a}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {detail.category?.map(c => (
              <span key={c.id} className="text-[11px] px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded-md border border-slate-700/50">{c.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      {detail.content && (
        <div className="mb-5 bg-slate-900 rounded-xl p-4 border border-slate-800/60">
          <p className={cn('text-slate-300 text-sm leading-relaxed', !expanded && 'line-clamp-3')}>
            {detail.content.replace(/<[^>]*>/g, '')}
          </p>
          <button onClick={() => setExpanded(v => !v)} className="text-sky-400 text-xs mt-2 hover:text-sky-300 font-semibold">
            {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
          </button>
        </div>
      )}

      {/* Read first/latest buttons */}
      {allChapters.length > 0 && (
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => handleReadChapter(0)}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500/40 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all"
          >
            📖 Đọc từ đầu
          </button>
          <button
            onClick={() => handleReadChapter(allChapters.length - 1)}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-sky-600/20"
          >
            🔥 Đọc mới nhất
          </button>
        </div>
      )}

      {/* Chapters */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-800/60">
          <Layers size={15} className="text-sky-400" />
          <h2 className="text-white font-black text-sm">Danh sách chương</h2>
          <span className="text-slate-500 text-sm font-normal">({allChapters.length})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 max-h-80 overflow-y-auto">
          {chaptersReversed.map((chap, i) => {
            // index trong allChapters (chưa reverse): length-1-i
            const originalIndex = allChapters.length - 1 - i;
            return (
              <button key={i} onClick={() => handleReadChapter(originalIndex)}
                className="px-3 py-2.5 bg-slate-800/50 hover:bg-sky-500/15 border border-slate-700/50 hover:border-sky-500/40 rounded-xl text-left transition-all group">
                <p className="text-slate-200 text-xs font-semibold group-hover:text-sky-400 transition-colors truncate">
                  Chương {chap.chapter_name}
                </p>
                {chap.chapter_title && (
                  <p className="text-slate-500 text-[10px] mt-0.5 truncate">{chap.chapter_title}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="bg-slate-900 rounded-xl overflow-hidden animate-pulse border border-slate-800/40">
          <div className="bg-slate-800" style={{ aspectRatio: '2/3' }} />
          <div className="p-2 space-y-1.5">
            <div className="h-2.5 bg-slate-800 rounded-full" />
            <div className="h-2 bg-slate-800 rounded-full w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TruyenTranh() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [listType, setListType] = useState<ListKey>('truyen-moi');
  const [showGenre, setShowGenre] = useState(false);

  useEffect(() => {
    fetch(`${OTRUYEN_BASE}/the-loai`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setGenres(data.data.items || []); })
      .catch(() => {});
  }, []);

  const fetchComics = useCallback(async () => {
    setLoading(true);
    try {
      let url = '';
      if (searchQuery.trim()) {
        url = `${OTRUYEN_BASE}/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=${page}`;
      } else if (activeGenre) {
        url = `${OTRUYEN_BASE}/the-loai/${activeGenre}?page=${page}`;
      } else {
        url = `${OTRUYEN_BASE}/danh-sach/${listType}?page=${page}`;
      }
      const r = await fetch(url);
      const data = await r.json();
      if (data.status === 'success') {
        setComics(data.data.items || []);
        const p = data.data.params?.pagination;
        if (p) setTotalPages(Math.max(1, Math.ceil(p.totalItems / (p.totalItemsPerPage || 24))));
      }
    } catch {} finally { setLoading(false); }
  }, [page, searchQuery, activeGenre, listType]);

  useEffect(() => { fetchComics(); }, [fetchComics]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
    setActiveGenre('');
  };

  const handleGenre = (slug: string) => {
    setActiveGenre(slug);
    setPage(1);
    setSearchQuery('');
    setSearchInput('');
    setShowGenre(false);
  };

  const handleTab = (key: ListKey) => {
    setListType(key);
    setPage(1);
    setSearchQuery('');
    setSearchInput('');
    setActiveGenre('');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setActiveGenre('');
    setPage(1);
  };

  if (selectedSlug) return <DetailView slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;

  const activeGenreName = genres.find(g => g.slug === activeGenre)?.name;

  const pageNums: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    for (let i = start; i <= Math.min(start + 4, totalPages); i++) pageNums.push(i);
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
          <BookOpen size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-white font-black text-xl">Truyện Tranh</h1>
          <p className="text-slate-500 text-xs mt-0.5">Đọc truyện online miễn phí · Cập nhật mỗi ngày</p>
        </div>
      </div>

      {/* Search + Genre */}
      <div className="flex gap-2.5 mb-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <input type="text" placeholder="Tìm tên truyện..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full bg-slate-800/70 border border-slate-700/60 rounded-full py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
            />
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); if (searchQuery) { setSearchQuery(''); setPage(1); } }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </form>
        <div className="relative">
          <button onClick={() => setShowGenre(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border',
              activeGenre
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-white'
            )}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline max-w-24 truncate">{activeGenreName || 'Thể loại'}</span>
            <ChevronDown size={12} className={cn('transition-transform text-slate-500 shrink-0', showGenre && 'rotate-180')} />
          </button>
          {showGenre && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowGenre(false)} />
              <div className="absolute top-full right-0 mt-2 w-52 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-30 overflow-hidden">
                <div className="max-h-72 overflow-y-auto py-1.5">
                  <button onClick={() => handleGenre('')}
                    className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-800',
                      !activeGenre ? 'text-sky-400 font-bold' : 'text-slate-300')}>
                    Tất cả thể loại
                  </button>
                  {genres.map(g => (
                    <button key={g._id} onClick={() => handleGenre(g.slug)}
                      className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-800',
                        activeGenre === g.slug ? 'text-sky-400 font-bold bg-sky-500/10' : 'text-slate-300')}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!searchQuery && !activeGenre && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {LIST_TABS.map(t => {
            const Icon = t.icon;
            const active = listType === t.key;
            return (
              <button key={t.key} onClick={() => handleTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all shrink-0',
                  active
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                )}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter */}
      {(searchQuery || activeGenre) && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl">
          <p className="text-sky-300 text-sm flex-1">
            {searchQuery ? <>🔍 "<strong>{searchQuery}</strong>"</> : <>🏷 <strong>{activeGenreName}</strong></>}
          </p>
          <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors">
            <X size={11} /> Xóa
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? <Skeleton /> : comics.length === 0 ? (
        <div className="text-center py-24">
          <BookOpen size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-300 text-lg font-bold mb-1">Không tìm thấy truyện</p>
          <p className="text-slate-600 text-sm">Thử từ khóa khác hoặc chọn thể loại khác</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {comics.map(comic => (
            <ComicCard key={comic._id} comic={comic} onClick={() => setSelectedSlug(comic.slug)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft size={15} /> Trước
          </button>
          <div className="flex items-center gap-1.5">
            {page > 3 && totalPages > 7 && (
              <>
                <button onClick={() => setPage(1)} className="w-9 h-9 rounded-lg text-sm font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all">1</button>
                <span className="text-slate-600 text-sm px-1">…</span>
              </>
            )}
            {pageNums.map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-9 h-9 rounded-lg text-sm font-bold transition-all border',
                  page === p ? 'bg-sky-600 text-white border-transparent shadow-lg shadow-sky-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700')}>
                {p}
              </button>
            ))}
            {page < totalPages - 2 && totalPages > 7 && (
              <>
                <span className="text-slate-600 text-sm px-1">…</span>
                <button onClick={() => setPage(totalPages)} className="w-9 h-9 rounded-lg text-sm font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all">{totalPages}</button>
              </>
            )}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Sau <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
