// ─── Watch Room Service ────────────────────────────────────────────────────────
import {
  collection, doc, onSnapshot, deleteDoc,
  updateDoc, addDoc, serverTimestamp, query, orderBy,
  getDoc, limit,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Trạng thái đồng bộ player ─────────────────────────────────────────────────
export interface PlayerSyncState {
  isPlaying: boolean;
  currentTime: number;     // giây
  updatedAt: number;       // Date.now() của host lúc push
  updatedBy: string;       // uid của người push
}

export interface WatchRoom {
  id: string;
  movieSlug: string;
  movieName: string;
  movieThumb: string;
  episodeSlug: string;
  episodeName: string;
  embedUrl: string;
  m3u8Url: string;
  serverName: string;
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  maxMembers: number;
  members: RoomMember[];
  pastMemberUids: string[];   // uid đã từng vào phòng → được vào lại dù đầy
  sync: PlayerSyncState;
  createdAt: any;
  isActive: boolean;
}

export interface RoomMember {
  uid: string;
  username: string;
  avatar: string;
  joinedAt: number;
}

export interface RoomMessage {
  id: string;
  uid: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: number;
}

export async function createWatchRoom(data: {
  movieSlug: string;
  movieName: string;
  movieThumb: string;
  episodeSlug: string;
  episodeName: string;
  embedUrl: string;
  m3u8Url: string;
  serverName: string;
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  maxMembers: number;
}): Promise<string> {
  const member: RoomMember = {
    uid: data.hostUid,
    username: data.hostName,
    avatar: data.hostAvatar,
    joinedAt: Date.now(),
  };
  const initialSync: PlayerSyncState = {
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
    updatedBy: data.hostUid,
  };
  const ref = await addDoc(collection(db, 'watchRooms'), {
    ...data,
    members: [member],
    pastMemberUids: [data.hostUid],
    sync: initialSync,
    createdAt: serverTimestamp(),
    isActive: true,
  });
  return ref.id;
}

export async function getWatchRoom(roomId: string): Promise<WatchRoom | null> {
  try {
    const snap = await getDoc(doc(db, 'watchRooms', roomId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as WatchRoom;
  } catch {
    return null;
  }
}

export function subscribeWatchRoom(roomId: string, cb: (room: WatchRoom | null) => void) {
  return onSnapshot(doc(db, 'watchRooms', roomId), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    cb({ id: snap.id, ...snap.data() } as WatchRoom);
  });
}

export async function joinWatchRoom(
  roomId: string,
  member: RoomMember
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = doc(db, 'watchRooms', roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: 'Phòng không tồn tại' };
    const room = snap.data() as WatchRoom;
    if (!room.isActive) return { ok: false, error: 'Phòng đã bị đóng' };
    const members: RoomMember[] = room.members || [];
    const pastUids: string[] = room.pastMemberUids || [];

    // Đã có trong phòng rồi → ok luôn
    if (members.some(m => m.uid === member.uid)) return { ok: true };

    // Chưa từng vào phòng → kiểm tra giới hạn
    const wasEverMember = pastUids.includes(member.uid);
    if (!wasEverMember && members.length >= room.maxMembers)
      return { ok: false, error: `Phòng đã đủ ${room.maxMembers} người` };

    // Thêm vào members + ghi nhớ uid vào pastMemberUids
    await updateDoc(ref, {
      members: [...members, member],
      pastMemberUids: wasEverMember ? pastUids : [...pastUids, member.uid],
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function leaveWatchRoom(roomId: string, uid: string): Promise<void> {
  try {
    const ref = doc(db, 'watchRooms', roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const members: RoomMember[] = (snap.data().members || []).filter(
      (m: RoomMember) => m.uid !== uid
    );
    await updateDoc(ref, { members });
  } catch {}
}

export async function deleteWatchRoom(roomId: string): Promise<void> {
  await deleteDoc(doc(db, 'watchRooms', roomId));
}

// Chỉ host gọi — đổi tập phim trong phòng
export async function updateRoomEpisode(
  roomId: string,
  data: {
    episodeSlug: string;
    episodeName: string;
    embedUrl: string;
    m3u8Url: string;
    serverName: string;
  }
): Promise<void> {
  const resetSync: PlayerSyncState = {
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
    updatedBy: '',
  };
  await updateDoc(doc(db, 'watchRooms', roomId), {
    ...data,
    sync: resetSync,
  });
}

// Chỉ host gọi — đẩy trạng thái sync lên Firebase
export async function pushSyncState(
  roomId: string,
  state: Omit<PlayerSyncState, 'updatedAt'>
): Promise<void> {
  await updateDoc(doc(db, 'watchRooms', roomId), {
    sync: { ...state, updatedAt: Date.now() },
  });
}

export function subscribeRoomMessages(
  roomId: string,
  cb: (msgs: RoomMessage[]) => void
) {
  const q = query(
    collection(db, 'watchRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as RoomMessage)));
  });
}

export async function sendRoomMessage(
  roomId: string,
  msg: Omit<RoomMessage, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'watchRooms', roomId, 'messages'), msg);
}
