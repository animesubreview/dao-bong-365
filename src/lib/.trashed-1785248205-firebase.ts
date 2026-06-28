import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCBzrm9kD7N6ohmWvXxyZNVTDFDBWuj98c",
  authDomain: "web-phim-20213.firebaseapp.com",
  projectId: "web-phim-20213",
  storageBucket: "web-phim-20213.firebasestorage.app",
  messagingSenderId: "768028032897",
  appId: "1:768028032897:web:7ffc40e1ff491248f3b280",
  measurementId: "G-TYHHM1DKZ9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
