import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Cấu hình Firebase Web (công khai theo thiết kế của Firebase — bảo mật nằm ở firestore.rules).
// Có thể ghi đè bằng biến môi trường VITE_FIREBASE_*; nếu không đặt thì dùng giá trị mặc định bên dưới.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCBzrm9kD7N6ohmWvXxyZNVTDFDBWuj98c",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "web-phim-20213.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "web-phim-20213",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "web-phim-20213.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "768028032897",
  appId: env.VITE_FIREBASE_APP_ID || "1:768028032897:web:7ffc40e1ff491248f3b280",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-TYHHM1DKZ9",
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
