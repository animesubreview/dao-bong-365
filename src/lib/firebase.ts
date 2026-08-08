import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Cấu hình Firebase Web SDK: đây KHÔNG phải secret (Google xác nhận các giá trị này
// là public-safe, bảo mật thực sự nằm ở Firestore Rules). Vẫn đưa ra env var để
// dễ tách môi trường dev/staging/production trên Vercel; nếu không set thì dùng
// giá trị mặc định của project hiện tại.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCBzrm9kD7N6ohmWvXxyZNVTDFDBWuj98c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "web-phim-20213.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "web-phim-20213",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "web-phim-20213.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "768028032897",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:768028032897:web:7ffc40e1ff491248f3b280",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TYHHM1DKZ9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
