import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import MatchDetail from './pages/MatchDetail';
import AdminMatches from './pages/AdminMatches';

function LoadingScreen({ fadeOut }: { fadeOut: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0, left: 0,
        zIndex: 9999,
        backgroundColor: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
        @keyframes kk-pop {
          0%   { opacity: 0; transform: scale(0.6) rotate(-8deg); }
          65%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes kk-fade-up {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes kk-pulse-ring {
          0%   { transform: scale(1);    opacity: 0.55; }
          100% { transform: scale(1.65); opacity: 0; }
        }
        @keyframes kk-pulse-ring2 {
          0%   { transform: scale(1);    opacity: 0.3; }
          100% { transform: scale(1.9);  opacity: 0; }
        }
        @keyframes kk-glow {
          0%, 100% { box-shadow: 0 0 32px rgba(34,197,94,0.25), 0 0 64px rgba(34,197,94,0.08); }
          50%       { box-shadow: 0 0 48px rgba(34,197,94,0.45), 0 0 90px rgba(34,197,94,0.18); }
        }
        @keyframes kk-spin-ball {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes kk-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .kk-logo-wrap { animation: kk-pop 0.75s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .kk-title { animation: kk-fade-up 0.55s ease 0.65s both; }
        .kk-sub { animation: kk-fade-up 0.55s ease 0.85s both; }
        .kk-ring1 {
          position: absolute; top: -4px; right: -4px; bottom: -4px; left: -4px;
          border-radius: 50%; border: 2px solid #22c55e;
          animation: kk-pulse-ring 1.8s ease-out 0.6s infinite;
        }
        .kk-ring2 {
          position: absolute; top: -4px; right: -4px; bottom: -4px; left: -4px;
          border-radius: 50%; border: 1.5px solid #22c55e;
          animation: kk-pulse-ring2 1.8s ease-out 1.1s infinite;
        }
        .kk-circle { animation: kk-glow 2.5s ease-in-out 1s infinite; }
        .kk-ball { animation: kk-spin-ball 3s linear infinite; display: inline-block; }
        .kk-brand-shimmer {
          background: linear-gradient(90deg, #fff 30%, #86efac 50%, #fff 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: kk-shimmer 2.5s linear 1s infinite;
        }
      `}</style>

      <div className="kk-logo-wrap" style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <div className="kk-ring1" />
          <div className="kk-ring2" />
          <div className="kk-circle" style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'linear-gradient(145deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1, fontSize: 56,
          }}>
            <span className="kk-ball">⚽</span>
          </div>
        </div>
      </div>

      <div className="kk-title" style={{
        fontSize: 44, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}>
        <span className="kk-brand-shimmer">Đảo</span>
        <span style={{ color: '#22c55e', fontFamily: "'Nunito', system-ui, sans-serif" }}> Bóng 365</span>
      </div>

      <div className="kk-sub" style={{
        marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.42)',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 700,
      }}>
        Trực tiếp bóng đá mỗi ngày
      </div>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1400);
    const hideTimer = setTimeout(() => setIsLoading(false), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (isLoading) {
    return <LoadingScreen fadeOut={fadeOut} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tran-dau/:id" element={<MatchDetail />} />
            <Route path="/daobong/admin" element={<AdminMatches />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}
