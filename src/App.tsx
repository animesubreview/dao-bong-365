import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
import LiveNotice from './components/LiveNotice';
import NotificationDisplay from './components/NotificationDisplay';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
const PlayerStudio = lazy(() => import('./pages/PlayerStudio'));
const Search = lazy(() => import('./pages/Search'));
const History = lazy(() => import('./pages/History'));
const Favorites = lazy(() => import('./pages/Favorites'));
const MovieList = lazy(() => import('./pages/MovieList'));
const Admin = lazy(() => import('./pages/Admin'));
const WatchManual = lazy(() => import('./pages/WatchManual'));
const ManualMovieDetail = lazy(() => import('./pages/ManualMovieDetail'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Account = lazy(() => import('./pages/Account'));
const SchedulePage = lazy(() => import('./pages/Schedule'));
const WatchRoomPage = lazy(() => import('./pages/WatchRoom'));
const XemChung = lazy(() => import('./pages/XemChung'));
const TruyenTranh = lazy(() => import('./pages/TruyenTranh'));
const ChatPage = lazy(() => import('./pages/Chat'));
const NapThe = lazy(() => import('./pages/NapThe'));
const MuaVip = lazy(() => import('./pages/MuaVip'));
const Notifications = lazy(() => import('./pages/Notifications'));
const LiveStreamPage = lazy(() => import('./pages/LiveStream'));
const TVTrucTuyen = lazy(() => import('./pages/TVTrucTuyen'));
const NotFound = lazy(() => import('./pages/NotFound'));
const HtmlSitemap = lazy(() => import('./pages/HtmlSitemap'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
import MaintenancePage from './components/MaintenancePage';
import GeoBlockPage from './components/GeoBlockPage';
import TVOptimizer from './components/TVOptimizer';
import { subscribeMaintenanceConfig, MaintenanceConfig, DEFAULT_MAINTENANCE } from './lib/maintenance';
import { getGeoResult, getGeoblockEnabled, GeoResult } from './lib/geoblock';
import ClickAd from './components/ClickAd';
import AdBanner from './components/AdBanner';
import { startPresence } from './lib/presence';

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
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes kk-glow-soft {
          0%, 100% { box-shadow: 0 0 36px rgba(34,197,94,0.35), 0 0 70px rgba(34,197,94,0.15); }
          50%       { box-shadow: 0 0 52px rgba(34,197,94,0.55), 0 0 100px rgba(34,197,94,0.25); }
        }
        .kk-logo-wrap {
          animation: kk-pop 0.45s cubic-bezier(.22,1,.36,1) both;
        }
        .kk-glow-box {
          animation: kk-glow-soft 2.5s ease-in-out 0.45s infinite;
        }
      `}</style>

      {/* Logo image — thẻ pill nền đen bo góc + viền glow xanh */}
      <div className="kk-logo-wrap" style={{ position: 'relative' }}>
        <div
          className="kk-glow-box"
          style={{
            position: 'relative',
            padding: '18px 28px',
            borderRadius: 24,
            backgroundColor: '#111318',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <img
            src="/assets/logo-daophim.png"
            alt="Đảo Phim"
            style={{ height: 64, width: 'auto', display: 'block', position: 'relative', zIndex: 1 }}
          />
        </div>
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

  // Trang Admin có khung riêng (sidebar/topbar/bottom-nav riêng) — không hiển thị
  // Header/Footer/MobileBottomNav/quảng cáo của website chính đè lên nữa.
  if (isAdminPage) {
    return (
      <Suspense fallback={<div className="min-h-[60vh]" />}>
<Routes>
        <Route path="/daophim/admin" element={<Admin />} />
      </Routes>
</Suspense>
    );
  }

  return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <ClickAd />
        <TVOptimizer />
        <Header />
        <NotificationDisplay />
        <div className="flex-1 pb-20 md:pb-0" style={{ paddingTop: 'var(--app-header-h, 4rem)' }}>
          <Suspense fallback={<div className="min-h-[60vh]" />}>
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
            <Route path="/profile" element={<Account />} />
            <Route path="/profile/edit" element={<Profile />} />
            <Route path="/cinema" element={<SchedulePage />} />
            <Route path="/lich-chieu" element={<SchedulePage />} />
            <Route path="/xem-chung" element={<XemChung />} />
            <Route path="/watch-room/:roomId" element={<WatchRoomPage />} />
            <Route path="/truyen-tranh" element={<TruyenTranh />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/nap-tien" element={<NapThe />} />
            <Route path="/mua-vip" element={<MuaVip />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/truc-tiep" element={<LiveStreamPage />} />
            <Route path="/tv-truc-tuyen" element={<TVTrucTuyen />} />
            <Route path="/site-map" element={<HtmlSitemap />} />
            <Route path="/info/:type" element={<InfoPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
</Suspense>
        </div>
        <Footer />
        <MobileBottomNav />
        <LiveNotice />
        {/* Banner QC cố định cuối màn hình — hiển thị mọi trang (PC & Mobile),
            trừ trang admin và trang xem phim (tránh che player) */}
        {!isAdminPage && !location.pathname.startsWith('/watch') && (
          <AdBanner position="sticky" />
        )}
        {/* Banner 2 bên sidebar trái/phải — hiện cả mobile & PC, trừ trang admin */}
        {!isAdminPage && (
          <>
            <AdBanner position="left" />
            <AdBanner position="right" />
          </>
        )}
      </div>
  );
}
