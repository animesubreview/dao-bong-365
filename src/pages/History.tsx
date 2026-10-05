import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Trash2, Play, Clock, ChevronRight } from 'lucide-react';
import { historyWatchLink, historyDetailLink, episodeLabel, readProgress, formatClock } from '../lib/watchHistory';
import { movieApi } from '../services/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function History() {
  useSEO({ noIndex: true });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem?')) {
      localStorage.removeItem('watchHistory');
      setHistory([]);
    }
  };

  const latest = history[0];
  const latestProgress = latest ? readProgress(latest) : null;

  const removeHistoryItem = (slug: string) => {
    const newHistory = history.filter((h: any) => h.slug !== slug);
    localStorage.setItem('watchHistory', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  return (
    <div className="min-h-screen pb-20 pt-28">
      <main className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              <HistoryIcon size={32} className="text-indigo-500" />
              Lịch sử xem phim
            </h1>
            <p className="text-slate-400 font-medium">
              Bạn đã xem <span className="text-indigo-400 font-bold">{history.length}</span> phim gần đây.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="btn-icon flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-red-500 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 size={18} /> Xóa tất cả
            </button>
          )}
        </div>

        {/* Tiếp tục xem: phim vừa xem gần nhất */}
        {latest && (
          <Link to={historyWatchLink(latest)}
            className="flex items-center gap-4 mb-8 p-4 rounded-2xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/15 transition-colors">
            <div className="w-14 h-14 shrink-0 rounded-full bg-green-500 text-slate-950 flex items-center justify-center shadow-lg shadow-green-500/30">
              <Play size={24} className="fill-current ml-0.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-green-400">Tiếp tục xem</p>
              <p className="font-black text-white truncate">{latest.name}</p>
              <p className="text-xs text-slate-400">
                {episodeLabel(latest)}{latestProgress ? ` · đã xem ${formatClock(latestProgress.time)}` : ''}
              </p>
            </div>
            <ChevronRight className="text-green-400 shrink-0" />
          </Link>
        )}

        {history.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {history.map((item, idx) => (
                <motion.div
                  key={item.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card group relative"
                >
                  <Link to={historyWatchLink(item)} className="block aspect-video relative overflow-hidden bg-slate-900">
                    {/* placeholder khi ảnh lỗi */}
                    <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                      <Play size={32} />
                    </div>
                    <img
                      src={movieApi.getImageUrl(item.thumb_url || item.poster_url || '')}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 relative z-10"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const t = e.currentTarget;
                        if (item.poster_url && !t.src.includes(item.poster_url)) {
                          t.src = movieApi.getImageUrl(item.poster_url);
                        } else {
                          t.style.display = 'none';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50">
                        <Play className="text-white fill-current" size={24} />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white border border-slate-800">
                      {episodeLabel(item)}
                    </div>
                    {/* Thanh tiến độ xem dở */}
                    {(() => {
                      const pr = readProgress(item);
                      return pr && pr.pct > 0 ? (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-20">
                          <div className="h-full bg-green-500" style={{ width: `${pr.pct}%` }} />
                        </div>
                      ) : null;
                    })()}
                  </Link>

                  <div className="p-4 flex flex-col gap-2">
                    <Link to={historyDetailLink(item)} className="font-bold text-white hover:text-indigo-400 transition-colors truncate">
                      {item.name}
                    </Link>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(item.updatedAt).toLocaleDateString()}
                        {(() => { const pr = readProgress(item); return pr ? <span className="text-green-400 normal-case tracking-normal ml-1">· {formatClock(pr.time)}</span> : null; })()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeHistoryItem(item.slug);
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-6 glass-card p-12">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
              <HistoryIcon size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Lịch sử trống</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Bạn chưa xem phim nào gần đây. Hãy bắt đầu khám phá ngay!</p>
            </div>
            <Link to="/" className="btn-primary">Khám phá phim mới</Link>
          </div>
        )}
      </main>
    </div>
  );
}
