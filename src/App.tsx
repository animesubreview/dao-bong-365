import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
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
import Account from './pages/Account';
import SchedulePage from './pages/Schedule';
import WatchRoomPage from './pages/WatchRoom';
import TruyenTranh from './pages/TruyenTranh';
import NapThe from './pages/NapThe';
import MuaVip from './pages/MuaVip';
import Notifications from './pages/Notifications';
import LiveStreamPage from './pages/LiveStream';
import TVTrucTuyen from './pages/TVTrucTuyen';
import NotFound from './pages/NotFound';
import HtmlSitemap from './pages/HtmlSitemap';
import MaintenancePage from './components/MaintenancePage';
import GeoBlockPage from './components/GeoBlockPage';
import TVOptimizer from './components/TVOptimizer';
import { subscribeMaintenanceConfig, MaintenanceConfig, DEFAULT_MAINTENANCE } from './lib/maintenance';
import { getGeoResult, getGeoblockEnabled, GeoResult } from './lib/geoblock';
import ClickAd from './components/ClickAd';
import AdBlockGate from './components/AdBlockGate';
import AdBanner from './components/AdBanner';
import { startPresence } from './lib/presence';

function LoadingScreen({ fadeOut }: { fadeOut: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0, left: 0,
        zIndex: 9999,
        backgroundColor: '#07070a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1)',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      <style>{`
        @keyframes ptt-fade-up {
          0%   { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ptt-bar-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        .ptt-splash-logo {
          animation: ptt-fade-up 0.5s cubic-bezier(.22,1,.36,1) both;
        }
        .ptt-splash-track {
          position: relative;
          overflow: hidden;
          width: 84px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          margin-top: 22px;
          animation: ptt-fade-up 0.5s cubic-bezier(.22,1,.36,1) 0.1s both;
        }
        .ptt-splash-bar {
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, #22c55e, transparent);
          animation: ptt-bar-slide 1s ease-in-out infinite;
        }
      `}</style>

      <img
        src="/assets/logo-phimtuoitho.png"
        alt="Phim Tuổi Thơ"
        className="ptt-splash-logo"
        style={{ height: 52, width: 'auto', display: 'block' }}
      />
      <div className="ptt-splash-track">
        <div className="ptt-splash-bar" />
      </div>
    </div>
  );
}

const SPLASH_SEEN_KEY = 'ptt_splash_seen';

export default function App() {
  const [isLoading, setIsLoading] = useState(() => {
    try { return !sessionStorage.getItem(SPLASH_SEEN_KEY); } catch { return true; }
  });
  const [fadeOut, setFadeOut] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  // ── Geo-blocking ──────────────────────────────────────────────────────
  const [geoResult, setGeoResult] = useState<GeoResult>('loading');
  const [geoblockEnabled, setGeoblockEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const fadeTimer = setTimeout(() => setFadeOut(true), 900);
    const hideTimer = setTimeout(() => {
      setIsLoading(false);
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch {}
    }, 1350);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [isLoading]);

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
  const isAdminPage = location.pathname === '/phimtuoitho/admin';

  // Hiển thị trang bảo trì nếu đang bật và không phải trang admin
  if (maintenanceLoaded && maintenance.enabled && !isAdminPage) {
    return <MaintenancePage config={maintenance} />;
  }

  return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <ClickAd />
        <AdBlockGate />
        <TVOptimizer />
        <Header />
        <NotificationDisplay />
        <div className="flex-1 pt-16 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/phim/:slug" element={<MovieDetail />} />
            <Route path="/watch/:slug/:episodeSlug" element={<Watch />} />
            <Route path="/search" element={<Search />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/type/:type" element={<MovieList />} />
            <Route path="/phimtuoitho/admin" element={<Admin />} />
            <Route path="/phimtuoitho/player-studio" element={<PlayerStudio />} />
            <Route path="/watch-manual/:id" element={<WatchManual />} />
            <Route path="/watch-manual/:id/:ep" element={<WatchManual />} />
            <Route path="/manual/:id" element={<ManualMovieDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Account />} />
            <Route path="/profile/edit" element={<Profile />} />
            <Route path="/cinema" element={<SchedulePage />} />
            <Route path="/lich-chieu" element={<SchedulePage />} />
            <Route path="/watch-room/:roomId" element={<WatchRoomPage />} />
            <Route path="/truyen-tranh" element={<TruyenTranh />} />
            <Route path="/nap-tien" element={<NapThe />} />
            <Route path="/mua-vip" element={<MuaVip />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/truc-tiep" element={<LiveStreamPage />} />
            <Route path="/tv-truc-tuyen" element={<TVTrucTuyen />} />
            <Route path="/site-map" element={<HtmlSitemap />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <MobileBottomNav />
        {/* Banner QC cố định cuối màn hình — hiển thị mọi trang (PC & Mobile),
            trừ trang admin và trang xem phim (tránh che player) */}
        {!isAdminPage && !location.pathname.startsWith('/watch') && (
          <AdBanner position="sticky" />
        )}
      </div>
  );
}
