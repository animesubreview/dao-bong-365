import React from 'react';
import { isLiteDevice } from '../lib/perf';

export type BannerTheme = 'cosmic' | 'aurora' | 'sunset' | 'sakura' | 'matrix';
export const BANNER_THEMES: { id: BannerTheme; name: string }[] = [
  { id: 'cosmic', name: 'Vũ trụ' }, { id: 'aurora', name: 'Cực quang' }, { id: 'sunset', name: 'Hoàng hôn' },
  { id: 'sakura', name: 'Hoa anh đào' }, { id: 'matrix', name: 'Mật mã' },
];

// Điểm sao cố định (không random mỗi lần render)
const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100, s: 1 + (i % 3), d: (i % 7) * 0.45, t: 2 + (i % 4),
}));
const PETALS = Array.from({ length: 14 }, (_, i) => ({ x: (i * 29 + 5) % 100, d: (i % 6) * 0.9, t: 6 + (i % 5), s: 8 + (i % 4) * 3 }));
const RAIN = Array.from({ length: 22 }, (_, i) => ({ x: (i * 17 + 3) % 100, d: (i % 8) * 0.5, t: 2.2 + (i % 5) * 0.6, h: 30 + (i % 4) * 18 }));

const BG: Record<BannerTheme, string> = {
  cosmic: 'linear-gradient(160deg,#120d3c 0%,#2b1a6b 55%,#0e0a2c 100%)',
  aurora: 'linear-gradient(160deg,#051a1f 0%,#0b2a3a 55%,#0a1230 100%)',
  sunset: 'linear-gradient(160deg,#2a0f3a 0%,#9a2f5a 50%,#f08a3c 100%)',
  sakura: 'linear-gradient(160deg,#3a1030 0%,#8a2f64 55%,#e9799e 100%)',
  matrix: 'linear-gradient(160deg,#021008 0%,#05301a 60%,#021008 100%)',
};

/** Banner động cho thẻ hồ sơ: ảnh/GIF do người dùng tải lên hoặc hiệu ứng CSS theo chủ đề. */
export default function ProfileBanner({ theme = 'aurora', image, className = '' }: { theme?: string; image?: string; className?: string }) {
  const t = (BG as any)[theme] ? (theme as BannerTheme) : 'aurora';
  const lite = isLiteDevice();
  const stars = lite ? STARS.slice(0, 10) : STARS;
  const petals = lite ? PETALS.slice(0, 6) : PETALS;
  const rain = lite ? RAIN.slice(0, 8) : RAIN;
  return (
    <div className={`relative overflow-hidden ${lite ? 'pb-lite' : ''} ${className}`} style={{ background: BG[t] }} aria-hidden>
      <style>{`
        .pb-blob { -webkit-mask-image: radial-gradient(closest-side,#000 0,rgba(0,0,0,.55) 45%,transparent 100%); mask-image: radial-gradient(closest-side,#000 0,rgba(0,0,0,.55) 45%,transparent 100%); will-change: transform }
        .pb-lite .pb-a { animation: none !important }
        @keyframes pb-tw { 0%,100% { opacity:.15; transform:scale(.8) } 50% { opacity:1; transform:scale(1.3) } }
        @keyframes pb-shoot { 0% { transform: translate(0,0) rotate(-28deg); opacity:0 } 6% { opacity:1 } 30% { transform: translate(-340px,190px) rotate(-28deg); opacity:0 } 100% { opacity:0 } }
        @keyframes pb-planet { 0%,100% { transform: translateY(0) rotate(-12deg) } 50% { transform: translateY(-9px) rotate(-12deg) } }
        @keyframes pb-b1 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(60px,12px) scale(1.3) } }
        @keyframes pb-b2 { 0%,100% { transform: translate(0,0) scale(1.2) } 50% { transform: translate(-70px,-8px) scale(.9) } }
        @keyframes pb-fall { 0% { transform: translateY(-20px) translateX(0) rotate(0); opacity:0 } 10% { opacity:.9 } 100% { transform: translateY(190px) translateX(40px) rotate(280deg); opacity:0 } }
        @keyframes pb-rain { 0% { transform: translateY(-80px); opacity:0 } 15% { opacity:.9 } 100% { transform: translateY(220px); opacity:0 } }
        @keyframes pb-sun { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-8px) scale(1.06) } }
        @keyframes pb-pan { 0% { transform: scale(1.08) translateX(0) } 50% { transform: scale(1.14) translateX(-2%) } 100% { transform: scale(1.08) translateX(0) } }
        @media (prefers-reduced-motion: reduce) { .pb-a { animation: none !important } }
      `}</style>

      {image ? (
        <img src={image} alt="" className="pb-a absolute inset-0 w-full h-full object-cover" style={{ animation: /\.gif|\.webp/i.test(image) ? undefined : 'pb-pan 18s ease-in-out infinite' }} />
      ) : (
        <>
          {t === 'cosmic' && (<>
            {stars.map((s, i) => <i key={i} className="pb-a absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animation: `pb-tw ${s.t}s ${s.d}s ease-in-out infinite` }} />)}
            <i className="pb-a absolute h-[2px] w-24 rounded-full" style={{ right: '12%', top: '12%', background: 'linear-gradient(90deg,transparent,#fff,#fbbf24)', animation: 'pb-shoot 5.5s 1s ease-in infinite' }} />
            <i className="pb-a absolute h-[2px] w-16 rounded-full" style={{ right: '45%', top: '4%', background: 'linear-gradient(90deg,transparent,#fff,#38bdf8)', animation: 'pb-shoot 7s 3.4s ease-in infinite' }} />
            <span className="pb-a absolute right-[7%] top-[18%] w-[74px] h-[74px] rounded-full" style={{ background: 'radial-gradient(circle at 32% 28%,#f5d0fe,#a855f7 45%,#3b0f77 90%)', boxShadow: '0 0 30px rgba(168,85,247,.55)', animation: 'pb-planet 6s ease-in-out infinite' }}>
              <i className="absolute -left-5 -right-5 top-1/2 h-[14px] -translate-y-1/2 rounded-full border-2 border-fuchsia-200/70" style={{ transform: 'translateY(-50%) rotate(-18deg)' }} />
            </span>
          </>)}
          {t === 'aurora' && (<>
            <i className="pb-a absolute -top-10 left-[5%] w-56 h-40 rounded-full pb-blob opacity-70" style={{ background: '#22c55e', animation: 'pb-b1 9s ease-in-out infinite' }} />
            <i className="pb-a absolute top-0 left-[40%] w-56 h-44 rounded-full pb-blob opacity-60" style={{ background: '#06b6d4', animation: 'pb-b2 11s ease-in-out infinite' }} />
            <i className="pb-a absolute -top-6 right-[2%] w-52 h-40 rounded-full pb-blob opacity-55" style={{ background: '#a855f7', animation: 'pb-b1 13s ease-in-out infinite' }} />
            {stars.slice(0, 16).map((s, i) => <i key={i} className="pb-a absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: 2, height: 2, animation: `pb-tw ${s.t}s ${s.d}s ease-in-out infinite` }} />)}
          </>)}
          {t === 'sunset' && (<>
            <i className="pb-a absolute left-1/2 -bottom-10 w-44 h-44 -ml-[88px] rounded-full" style={{ background: 'radial-gradient(circle,#fff3b0,#fbbf24 45%,#f97316 75%)', boxShadow: '0 0 60px 20px rgba(251,146,60,.55)', animation: 'pb-sun 6s ease-in-out infinite' }} />
            <i className="pb-a absolute -top-8 left-[8%] w-52 h-32 rounded-full pb-blob opacity-50 bg-fuchsia-400" style={{ animation: 'pb-b1 10s ease-in-out infinite' }} />
            <i className="pb-a absolute top-2 right-[6%] w-44 h-28 rounded-full pb-blob opacity-45 bg-sky-300" style={{ animation: 'pb-b2 12s ease-in-out infinite' }} />
          </>)}
          {t === 'sakura' && (<>
            <i className="pb-a absolute -top-8 right-[10%] w-52 h-36 rounded-full pb-blob opacity-50 bg-pink-300" style={{ animation: 'pb-b2 11s ease-in-out infinite' }} />
            {petals.map((p, i) => <i key={i} className="pb-a absolute top-0 rounded-[60%_0_60%_0] bg-pink-200/90" style={{ left: `${p.x}%`, width: p.s, height: p.s * 0.7, animation: `pb-fall ${p.t}s ${p.d}s linear infinite` }} />)}
          </>)}
          {t === 'matrix' && (<>
            {rain.map((r, i) => <i key={i} className="pb-a absolute top-0 w-[2px] rounded-full" style={{ left: `${r.x}%`, height: r.h, background: 'linear-gradient(180deg,transparent,#4ade80)', animation: `pb-rain ${r.t}s ${r.d}s linear infinite` }} />)}
          </>)}
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
    </div>
  );
}
