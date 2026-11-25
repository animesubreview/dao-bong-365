import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { subscribeLiveConfig, LiveConfig, DEFAULT_LIVE_CONFIG } from '../lib/livestream';

export default function LiveBanner() {
  const [config, setConfig] = useState<LiveConfig>(DEFAULT_LIVE_CONFIG);

  useEffect(() => {
    const unsub = subscribeLiveConfig(setConfig);
    return unsub;
  }, []);

  if (!config.enabled) return null;

  return (
    <div className="max-w-2xl md:max-w-5xl lg:max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 mt-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          to="/truc-tiep"
          className="relative flex items-center gap-4 rounded-2xl overflow-hidden p-4 md:p-5 group border border-red-500/30 hover:border-red-500/60 transition-colors"
          style={{ background: 'linear-gradient(120deg, rgba(127,29,29,0.55) 0%, rgba(15,15,15,0.9) 55%, rgba(15,15,15,0.95) 100%)' }}
        >
          {/* Thumbnail */}
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800">
            {config.posterUrl ? (
              <img src={config.posterUrl} alt={config.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio size={26} className="text-red-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <PlayCircle size={26} className="text-white/90" />
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                TRỰC TIẾP
              </span>
              <span className="text-red-300 text-[11px] font-bold hidden sm:inline">Đang phát ngay bây giờ</span>
            </div>
            <h3 className="text-white font-black text-sm md:text-lg leading-snug line-clamp-1">
              {config.title || 'Phát trực tiếp đặc biệt'}
            </h3>
            {config.description && (
              <p className="text-slate-400 text-xs md:text-sm line-clamp-1 mt-0.5">{config.description}</p>
            )}
          </div>

          <span className="shrink-0 hidden sm:flex items-center gap-1.5 bg-white text-slate-950 font-black text-xs md:text-sm px-4 py-2 rounded-full group-hover:bg-green-400 transition-colors">
            Xem ngay
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
