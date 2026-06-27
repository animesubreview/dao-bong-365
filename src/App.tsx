import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import NotificationDisplay from './components/NotificationDisplay';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
import PlayerStudio from './pages/PlayerStudio';
import Search from './pages/Search';
import History from './pages/History';
import Favorites from './pages/Favorites';
import MovieList from './pages/MovieList';
import Admin from './pages/Admin';
import WatchManual from './pages/WatchManual';
import ManualMovieDetail from './pages/ManualMovieDetail';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import CinemaPage from './pages/Cinema';
import WatchRoomPage from './pages/WatchRoom';
import TruyenTranh from './pages/TruyenTranh';
import NapThe from './pages/NapThe';
import MuaVip from './pages/MuaVip';
import MaintenancePage from './components/MaintenancePage';
import GeoBlockPage from './components/GeoBlockPage';
import TVOptimizer from './components/TVOptimizer';
import { subscribeMaintenanceConfig, MaintenanceConfig, DEFAULT_MAINTENANCE } from './lib/maintenance';
import { getGeoResult, getGeoblockEnabled, GeoResult } from './lib/geoblock';
import ClickAd from './components/ClickAd';
import { startPresence } from './lib/presence';
import TikTokAnnouncementPopup from './components/TikTokAnnouncementPopup';

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
        @keyframes kk-bar {
          0%   { width: 0%; }
          40%  { width: 55%; }
          70%  { width: 80%; }
          100% { width: 100%; }
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
        @keyframes kk-clap-top {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-22deg); }
          40%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes kk-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .kk-logo-wrap {
          animation: kk-pop 0.75s cubic-bezier(.22,1,.36,1) 0.1s both;
        }
        .kk-title {
          animation: kk-fade-up 0.55s ease 0.65s both;
        }
        .kk-sub {
          animation: kk-fade-up 0.55s ease 0.85s both;
        }
        .kk-bar-fill {
          animation: kk-bar 2.2s cubic-bezier(.4,0,.2,1) 0.3s both;
        }
        .kk-ring1 {
          position: absolute;
          top: -4px; right: -4px; bottom: -4px; left: -4px;
          border-radius: 50%;
          border: 2px solid #22c55e;
          animation: kk-pulse-ring 1.8s ease-out 0.6s infinite;
        }
        .kk-ring2 {
          position: absolute;
          top: -4px; right: -4px; bottom: -4px; left: -4px;
          border-radius: 50%;
          border: 1.5px solid #22c55e;
          animation: kk-pulse-ring2 1.8s ease-out 1.1s infinite;
        }
        .kk-circle {
          animation: kk-glow 2.5s ease-in-out 1s infinite;
        }
        .kk-clap-top {
          animation: kk-clap-top 1.4s ease 0.9s both;
          transform-origin: 6px 8px;
        }
        .kk-brand-shimmer {
          background: linear-gradient(90deg, #fff 30%, #86efac 50%, #fff 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: kk-shimmer 2.5s linear 1s infinite;
        }
      `}</style>

      {/* Logo circle */}
      <div className="kk-logo-wrap" style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <div className="kk-ring1" />
          <div className="kk-ring2" />
          {/* Main circle */}
          <div className="kk-circle" style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'linear-gradient(145deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
          }}>
            {/* Clapperboard SVG icon */}
            <svg width="58" height="58" viewBox="0 0 56 56" fill="none">
              {/* Board body */}
              <rect x="10" y="20" width="36" height="26" rx="3" fill="#1a1008" />
              {/* Top bar */}
              <rect x="10" y="14" width="36" height="8" rx="2" fill="#1a1008" />
              {/* Clapper top flap */}
              <g className="kk-clap-top" style={{ transformOrigin: '10px 14px' }}>
                <rect x="10" y="8" width="36" height="7" rx="2" fill="#2a1c08" />
                <clipPath id="flapClip">
                  <rect x="10" y="8" width="36" height="7" rx="2" />
                </clipPath>
                <g clipPath="url(#flapClip)">
                  <rect x="14" y="6" width="5" height="12" fill="#22c55e" transform="skewX(-20)" />
                  <rect x="24" y="6" width="5" height="12" fill="#22c55e" transform="skewX(-20)" />
                  <rect x="34" y="6" width="5" height="12" fill="#22c55e" transform="skewX(-20)" />
                </g>
              </g>
              {/* Stripes on top bar */}
              <clipPath id="barClip">
                <rect x="10" y="14" width="36" height="8" rx="2" />
              </clipPath>
              <g clipPath="url(#barClip)">
                <rect x="12" y="12" width="4" height="12" fill="#22c55e" opacity="0.55" transform="skewX(-20)" />
                <rect x="22" y="12" width="4" height="12" fill="#22c55e" opacity="0.55" transform="skewX(-20)" />
                <rect x="32" y="12" width="4" height="12" fill="#22c55e" opacity="0.55" transform="skewX(-20)" />
                <rect x="42" y="12" width="4" height="12" fill="#22c55e" opacity="0.55" transform="skewX(-20)" />
              </g>
              {/* Lines on body */}
              <line x1="14" y1="30" x2="42" y2="30" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <line x1="14" y1="36" x2="42" y2="36" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              <line x1="14" y1="42" x2="32" y2="42" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand name */}
      <div className="kk-title" style={{
        fontSize: 44,
        fontWeight: 900,
        letterSpacing: '-1px',
        lineHeight: 1,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}>
        <span className="kk-brand-shimmer">Đảo</span>
        <span style={{ color: '#22c55e', fontFamily: "'Nunito', system-ui, sans-serif" }}> Phim</span>
      </div>

      {/* Tagline */}
      <div className="kk-sub" style={{
        marginTop: 10,
        fontSize: 14,
        color: 'rgba(255,255,255,0.42)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontWeight: 700,
      }}>
        Phim hay cả đảo
      </div>

    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  // ── Geo-blocking ──────────────────────────────────────────────────────
  const [geoResult, setGeoResult] = useState<GeoResult>('loading');
  const [geoblockEnabled, setGeoblockEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200);
    const hideTimer = setTimeout(() => setIsLoading(false), 2950);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  useEffect(() => {
    const unsub = subscribeMaintenanceConfig(cfg => {
      setMaintenance(cfg);
      setMaintenanceLoaded(true);
    });
    return unsub;
  }, []);

  // Kiểm tra IP khi app khởi động — chỉ chặn nếu admin bật tính năng
  useEffect(() => {
    getGeoblockEnabled().then(enabled => {
      setGeoblockEnabled(enabled);
      if (enabled) {
        getGeoResult().then(setGeoResult);
      } else {
        setGeoResult('vn'); // Bỏ qua check IP nếu tính năng đã tắt
      }
    });
  }, []);

  // Theo doi presence realtime
  useEffect(() => {
    const stop = startPresence();
    return stop;
  }, []);

  if (isLoading) {
    return <LoadingScreen fadeOut={fadeOut} />;
  }

  // Vẫn đang kiểm tra IP → hiện spinner nhỏ, không block
  if (geoResult === 'loading') {
    return (
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(34,197,94,0.2)',
          borderTop: '3px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // IP nước ngoài → chặn hoàn toàn
  // geoResult === 'error' → cho qua, tránh chặn nhầm khi API lỗi
  if (geoResult === 'foreign') {
    return <GeoBlockPage />;
  }

  return (
    <Router>
      <AppInner maintenance={maintenance} maintenanceLoaded={maintenanceLoaded} />
    </Router>
  );
}

function AppInner({ maintenance, maintenanceLoaded }: { maintenance: MaintenanceConfig; maintenanceLoaded: boolean }) {
  const location = useLocation();
  const isAdminPage = location.pathname === '/daophim/admin';

  // Hiển thị trang bảo trì nếu đang bật và không phải trang admin
  if (maintenanceLoaded && maintenance.enabled && !isAdminPage) {
    return <MaintenancePage config={maintenance} />;
  }

  return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <ClickAd />
        <TikTokAnnouncementPopup />
        <TVOptimizer />
        <Header />
        <NotificationDisplay />
        <div className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/phim/:slug" element={<MovieDetail />} />
            <Route path="/watch/:slug/:episodeSlug" element={<Watch />} />
            <Route path="/search" element={<Search />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/type/:type" element={<MovieList />} />
            <Route path="/daophim/admin" element={<Admin />} />
            <Route path="/daophim/player-studio" element={<PlayerStudio />} />
            <Route path="/watch-manual/:id" element={<WatchManual />} />
            <Route path="/watch-manual/:id/:ep" element={<WatchManual />} />
            <Route path="/manual/:id" element={<ManualMovieDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cinema" element={<CinemaPage />} />
            <Route path="/watch-room/:roomId" element={<WatchRoomPage />} />
            <Route path="/truyen-tranh" element={<TruyenTranh />} />
            <Route path="/nap-tien" element={<NapThe />} />
            <Route path="/mua-vip" element={<MuaVip />} />
          </Routes>
        </div>
        <Footer />
      </div>
  );
}
