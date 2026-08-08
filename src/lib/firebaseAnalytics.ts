// Firebase app RIÊNG chỉ để đếm lượt truy cập (Google Analytics).
// KHÔNG dùng project này cho Auth/Firestore/Storage — project chính
// (phimtuoitho-a37ca) vẫn được cấu hình trong src/lib/firebase.ts.
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const analyticsConfig = {
  apiKey: 'AIzaSyCfyjBijJ2n65Ek82eLEHWN_2tndyH6Ak8',
  authDomain: 'dem-luong-truy-cap.firebaseapp.com',
  projectId: 'dem-luong-truy-cap',
  storageBucket: 'dem-luong-truy-cap.firebasestorage.app',
  messagingSenderId: '134357974984',
  appId: '1:134357974984:web:1c3bd20f63f5a4c812cafd',
  measurementId: 'G-EGJYGLXZBF',
};

// Đặt tên app riêng ("analytics") để không đụng app Firebase mặc định
// đang được dùng cho Auth/Firestore/Storage ở firebase.ts.
const analyticsApp = getApps().find(a => a.name === 'analytics')
  ?? initializeApp(analyticsConfig, 'analytics');

export let analytics: Analytics | undefined;

// getAnalytics() cần chạy trên trình duyệt và chỉ khi được hỗ trợ
// (tránh lỗi khi build SSR / môi trường không hỗ trợ analytics).
if (typeof window !== 'undefined') {
  isSupported()
    .then(ok => {
      if (ok) analytics = getAnalytics(analyticsApp);
    })
    .catch(() => {});
}
