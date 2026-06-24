import { db } from './firebase';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc,
  updateDoc, addDoc, serverTimestamp, query, orderBy, getDoc,
} from 'firebase/firestore';

export interface CinemaRoom {
  id: string;
  title: string;
  embedUrl: string;
  thumbnail?: string;
  description?: string;
  isActive: boolean;
  viewerCount: number;
  maxViewers: number;
  scheduledAt?: string;
  totalSeats: number;
  bookedSeats: string[];
  createdAt: any;
}

export function subscribeCinemaRooms(cb: (rooms: CinemaRoom[]) => void) {
  const q = query(collection(db, 'cinemaRooms'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CinemaRoom)));
  });
}

export async function createCinemaRoom(data: Omit<CinemaRoom, 'id' | 'createdAt' | 'viewerCount' | 'bookedSeats'>) {
  return addDoc(collection(db, 'cinemaRooms'), {
    ...data, viewerCount: 0, bookedSeats: [], createdAt: serverTimestamp(),
  });
}

export async function updateCinemaRoom(id: string, data: Partial<CinemaRoom>) {
  return updateDoc(doc(db, 'cinemaRooms', id), data);
}

export async function deleteCinemaRoom(id: string) {
  return deleteDoc(doc(db, 'cinemaRooms', id));
}

export async function bookSeat(roomId: string, seatId: string) {
  const ref = doc(db, 'cinemaRooms', roomId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const booked: string[] = snap.data().bookedSeats || [];
    if (!booked.includes(seatId)) {
      await updateDoc(ref, { bookedSeats: [...booked, seatId] });
      return true;
    }
    return false;
  }
  return false;
}

export async function unbookSeat(roomId: string, seatId: string) {
  const ref = doc(db, 'cinemaRooms', roomId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const booked: string[] = snap.data().bookedSeats || [];
    await updateDoc(ref, { bookedSeats: booked.filter(s => s !== seatId) });
  }
}

export async function joinCinemaRoom(id: string) {
  const ref = doc(db, 'cinemaRooms', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data().viewerCount || 0;
    await updateDoc(ref, { viewerCount: current + 1 });
  }
}

export async function leaveCinemaRoom(id: string) {
  const ref = doc(db, 'cinemaRooms', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data().viewerCount || 0;
    await updateDoc(ref, { viewerCount: Math.max(0, current - 1) });
  }
}

// Stubs kept for compat
export interface LiveStream { id: string; title: string; embedUrl: string; thumbnail?: string; description?: string; isLive: boolean; createdAt: any; }
export function subscribeLiveStreams(cb: (s: LiveStream[]) => void) { return () => {}; }
export async function createLiveStream(data: any) {}
export async function updateLiveStream(id: string, data: any) {}
export async function deleteLiveStream(id: string) {}
