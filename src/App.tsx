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
import Notifications from './pages/Notifications';
import LiveStreamPage from './pages/LiveStream';
import NotFound from './pages/NotFound';
import HtmlSitemap from './pages/HtmlSitemap';
import Dmca from './pages/Dmca';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MaintenancePage from './components/MaintenancePage';
import GeoBlockPage from './components/GeoBlockPage';
import TVOptimizer from './components/TVOptimizer';
import { subscribeMaintenanceConfig, MaintenanceConfig, DEFAULT_MAINTENANCE } from './lib/maintenance';
import { getGeoResult, getGeoblockEnabled, GeoResult } from './lib/geoblock';

import { startPresence } from './lib/presence';

export default function App() {
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  // ── Geo-blocking ──────────────────────────────────────────────────────
  const [geoResult, setGeoResult] = useState<GeoResult>('loading');
  const [geoblockEnabled, setGeoblockEnabled] = useState<boolean | null>(null);

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

  // IP nước ngoài → chặn hoàn toàn (bỏ qua khi đang loading, tránh che màn hình)
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
            <Route path="/watch-room/:roomId" element={<WatchRoomPage />} />
            <Route path="/truyen-tranh" element={<TruyenTranh />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/truc-tiep" element={<LiveStreamPage />} />
            <Route path="/site-map" element={<HtmlSitemap />} />
            <Route path="/dmca" element={<Dmca />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
  );
}
