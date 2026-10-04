import { db } from './firebase';

// Stubs kept for compat — tính năng "Rạp chiếu phim" (ghế ngồi, booking) đã bị gỡ bỏ.
export interface LiveStream { id: string; title: string; embedUrl: string; thumbnail?: string; description?: string; isLive: boolean; createdAt: any; }
export function subscribeLiveStreams(cb: (s: LiveStream[]) => void) { return () => {}; }
export async function createLiveStream(data: any) {}
export async function updateLiveStream(id: string, data: any) {}
export async function deleteLiveStream(id: string) {}
