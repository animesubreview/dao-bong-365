import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Play, Star, ChevronRight } from 'lucide-react';
import { movieApi } from '../services/api';
import MovieCard from '../components/MovieCard';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Favorites() {
  useSEO({ noIndex: true });
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(savedFavorites);
  }, []);

  const clearFavorites = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách yêu thích?')) {
      localStorage.removeItem('favorites');
      setFavorites([]);
    }
  };

  const removeFavorite = (slug: string) => {
    const newFavorites = favorites.filter((f: any) => f.slug !== slug);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen pb-20 pt-28">
      <main className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              <Heart size={32} className="text-red-500 fill-current" />
              Phim yêu thích
            </h1>
            <p className="text-slate-400 font-medium">
              Bạn có <span className="text-indigo-400 font-bold">{favorites.length}</span> phim trong danh sách yêu thích.
            </p>
          </div>

          {favorites.length > 0 && (
            <button
              onClick={clearFavorites}
              className="btn-icon flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-red-500 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 size={18} /> Xóa tất cả
            </button>
          )}
        </div>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            <AnimatePresence>
              {favorites.map((movie, idx) => (
                <motion.div
                  key={movie.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group"
                >
                  <MovieCard movie={movie} />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeFavorite(movie.slug);
                    }}
                    className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-6 glass-card p-12">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
              <Heart size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Danh sách trống</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Bạn chưa thêm phim nào vào danh sách yêu thích. Hãy bắt đầu khám phá ngay!</p>
            </div>
            <Link to="/" className="btn-primary">Khám phá phim mới</Link>
          </div>
        )}
      </main>
    </div>
  );
}
