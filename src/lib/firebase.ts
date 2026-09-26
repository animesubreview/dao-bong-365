import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

// Cấu hình Firebase Web (công khai theo thiết kế của Firebase — bảo mật nằm ở firestore.rules).
// Có thể ghi đè bằng biến môi trường VITE_FIREBASE_*; nếu không đặt thì dùng giá trị mặc định bên dưới.
//
// LƯU Ý: project "caphim-99ff6" là project MỚI (đổi từ project cũ "dem-luong-truy-cap"
// theo yêu cầu). Trước khi deploy phải tự tạo trong Firebase Console:
//   1) Firestore Database → Create database, rồi vào tab Rules dán nội dung firestore.rules → Publish
//   2) Authentication → Sign-in method → bật "Email/Password"
//   3) Storage → Get started, rồi vào tab Rules dán nội dung storage.rules → Publish
// Thiếu 1 trong 3 bước trên thì đăng nhập / lưu dữ liệu / tải ảnh sẽ báo lỗi.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDOYdo956812BGwf2L5tmJpgHyZbkkmKn4",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "caphim-99ff6.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://caphim-99ff6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "caphim-99ff6",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "caphim-99ff6.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1054924496537",
  appId: env.VITE_FIREBASE_APP_ID || "1:1054924496537:web:8fd91e657cdcc769212208",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-FMN4ZVL8CK",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// experimentalAutoDetectLongPolling: tự chuyển sang long-polling khi mạng/proxy/adblock chặn WebChannel
//   (nếu không, setDoc có thể treo vô hạn và "Lưu" không có phản hồi).
// ignoreUndefinedProperties: bỏ qua field undefined thay vì ném lỗi "Unsupported field value: undefined".
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);

// Analytics chỉ chạy được trên trình duyệt thật (không phải lúc build) và không
// phải trình duyệt nào cũng hỗ trợ (VD chặn cookie/tracking) → phải kiểm tra isSupported()
// trước, nếu không sẽ ném lỗi làm trắng trang trên một số thiết bị/trình duyệt.
export let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then(ok => { if (ok) analytics = getAnalytics(app); })
    .catch(() => {});
}
