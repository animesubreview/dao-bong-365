import React, { useState, useEffect } from 'react';
import { movieApi } from '../services/api';
import { Play, Clapperboard } from 'lucide-react';

interface WelcomeProps {
  onEnter: () => void;
}

export default function Welcome({ onEnter }: WelcomeProps) {
  const [bgUrl, setBgUrl] = useState('');
  const [isBgLoaded, setIsBgLoaded] = useState(false);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showWhiteFade, setShowWhiteFade] = useState(false);

  useEffect(() => {
    movieApi.getNewUpdates(1).then(res => {
      const items = res.items || [];
      if (items.length > 0) {
        const randomMovie = items[Math.floor(Math.random() * items.length)];
        const url = movieApi.getImageUrl(randomMovie.poster_url || randomMovie.thumb_url);
        
        // Preload image
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setBgUrl(url);
          setIsBgLoaded(true);
        };
      }
    }).catch(err => console.error("Error loading welcome background:", err));
  }, []);

  const handleStart = () => {
    // Giai đoạn 1: Xoay nhanh dần và nút biến mất trong 1.5 giây
    setIsAccelerating(true);
    
    setTimeout(() => {
      // Giai đoạn 2: Bùng nổ/Vỡ tan trong 1 giây (Tổng: 2.5s)
      setIsTransitioning(true);
      
      // Đợi cú zoom đạt đỉnh
      setTimeout(() => {
        // Giai đoạn 3: Hiện màn trắng và bắt đầu mờ dần vào trang chủ (Tổng: 4.0s)
        setShowWhiteFade(true);
        
        // Màn trắng mờ dần trong 1.5 giây
        setTimeout(() => {
          onEnter();
        }, 1500);
      }, 1000);
    }, 1500);
  };

  return (
    <div 
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#050510] overflow-hidden transition-all duration-[1500ms] ${showWhiteFade ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateZ(0)' 
      }}
    >
      {/* Lớp màn trắng chuyển cảnh cuối cùng */}
      <div 
        className={`absolute inset-0 z-[100] bg-white transition-opacity duration-[1500ms] pointer-events-none ${showWhiteFade ? 'opacity-100' : 'opacity-0'}`}
        style={{ willChange: 'opacity' }}
      ></div>

      {/* Dynamic Background Image - Optimized transition */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-[1500ms] ${
          isTransitioning 
            ? 'scale-[1.8] opacity-0 blur-2xl' 
            : isBgLoaded ? 'opacity-30 blur-sm scale-100' : 'opacity-0 scale-100'
        }`} 
        style={{ 
          backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform, opacity, filter',
          transform: 'translateZ(0)'
        }}
      ></div>

      {/* Content Overlay */}
      <div className={`relative z-10 flex flex-col items-center gap-10 transition-all duration-700 ${isAccelerating ? 'scale-0 opacity-0 blur-xl' : 'scale-100 opacity-100'}`}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-indigo-600/20 backdrop-blur-xl border border-indigo-500/20 rounded-[32px] flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.2)]">
            <Clapperboard className="text-white" size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic text-white drop-shadow-[0_0_40px_rgba(99,102,241,0.4)]">
            ĐẢO<span className="text-green-400">PHIM</span>
          </h1>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed opacity-80">
            Rạp chiếu phim online miễn phí<br />
            với chất lượng tuyệt đỉnh.
          </p>
        </div>

        <button 
          onClick={handleStart}
          className="group relative mt-4 px-16 py-5 bg-gradient-to-r from-indigo-700 to-purple-600 rounded-2xl text-white font-black text-2xl uppercase tracking-[0.2em] overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)] hover:shadow-[0_0_80px_rgba(99,102,241,0.5)] transition-all active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-4">
            <Play size={28} className="fill-current" /> XEM NGAY
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </button>
      </div>

      {/* Bottom Text */}
      <div className={`absolute bottom-12 transition-all duration-700 ${isAccelerating ? 'opacity-0 translate-y-10' : 'opacity-30'}`}>
        <p className="text-slate-400 text-[10px] uppercase tracking-[0.5em] font-black">
          PREMIUM CINEMATIC EXPERIENCE
        </p>
      </div>

      {/* Decorative Elements */}
      <div className={`absolute bottom-12 left-12 w-32 h-32 border border-white/5 rounded-full transition-all duration-1000 ${isAccelerating ? 'scale-[10] opacity-0 rotate-180' : 'scale-100 opacity-100 rotate-0'}`}></div>
      <div className={`absolute top-12 right-12 w-48 h-48 border border-white/5 rounded-full transition-all duration-1000 delay-100 ${isAccelerating ? 'scale-[10] opacity-0 -rotate-180' : 'scale-100 opacity-100 rotate-0'}`}></div>
    </div>
  );
}
