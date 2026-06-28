// ─── Comments Service ──────────────────────────────────────────────────────────
import {
  collection, addDoc, getDocs, deleteDoc, doc, query,
  orderBy, where, updateDoc, arrayUnion, arrayRemove, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Comment } from '../types';

const COL = 'comments';

export async function getComments(movieSlug: string): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, COL),
      where('movieSlug', '==', movieSlug),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
  } catch {
    return [];
  }
}

export async function addComment(
  movieSlug: string,
  uid: string,
  username: string,
  avatar: string,
  content: string,
  options?: { parentId?: string; replyToUsername?: string; isAdminReply?: boolean }
): Promise<Comment | null> {
  try {
    const data: any = {
      movieSlug,
      uid,
      username,
      avatar,
      content: content.trim(),
      createdAt: Date.now(),
      likes: [],
    };
    if (options?.parentId) data.parentId = options.parentId;
    if (options?.replyToUsername) data.replyToUsername = options.replyToUsername;
    if (options?.isAdminReply) data.isAdminReply = true;
    const ref = await addDoc(collection(db, COL), data);
    return { id: ref.id, ...data };
  } catch {
    return null;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COL, commentId));
    return true;
  } catch {
    return false;
  }
}

export async function toggleLike(commentId: string, uid: string, liked: boolean): Promise<void> {
  const ref = doc(db, COL, commentId);
  if (liked) {
    await updateDoc(ref, { likes: arrayRemove(uid) });
  } else {
    await updateDoc(ref, { likes: arrayUnion(uid) });
  }
}
