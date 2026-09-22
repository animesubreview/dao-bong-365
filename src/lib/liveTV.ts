/**
 * TV Trực Tuyến (Live TV) - Admin tự thêm kênh truyền hình trực tuyến (link nhúng/iframe)
 * theo từng danh mục (Thời Sự, Giải Trí, Thiếu Nhi, Thể Thao...), hiển thị ở trang /tv-truc-tuyen.
 */

import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export interface TVChannel {
  id: string;             // key - slug tự đặt, vd "vtv1", "cartoon-network"
  name: string;            // tên hiển thị, vd "Cartoon Network"
  logoUrl?: string;         // ảnh logo kênh (ô vuông) hiển thị trong lưới chọn kênh
  category: string;         // slug danh mục - khớp với TV_CATEGORIES bên dưới
  embedUrls: string[];      // 1-3 link nhúng (iframe/m3u8) - hiện nút LINK 1 / LINK 2 / LINK 3
  active: boolean;
  order: number;            // thứ tự hiển thị trong danh mục - số nhỏ hơn lên trước
  updatedAt: number;
}

export const TV_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Thời Sự',     value: 'thoi-su' },
  { label: 'Địa Phương',  value: 'dia-phuong' },
  { label: 'Giải Trí',    value: 'giai-tri' },
  { label: 'Thiếu Nhi',   value: 'thieu-nhi' },
  { label: 'FM Radio',    value: 'fm-radio' },
  { label: 'Quốc Tế',     value: 'quoc-te' },
  { label: 'Thể Thao',    value: 'the-thao' },
];

const COL = 'tv_channels';

/** Lưu (thêm/cập nhật) 1 kênh TV lên Firestore */
export async function saveTVChannel(ch: Omit<TVChannel, 'updatedAt'>): Promise<void> {
  await setDoc(doc(db, COL, ch.id), {
    ...ch,
    updatedAt: Date.now(),
  });
}

/** Xoá kênh TV */
export async function deleteTVChannel(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Subscribe realtime toàn bộ danh sách kênh (Admin + trang public dùng chung) */
export function subscribeTVChannels(cb: (items: TVChannel[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('order', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as TVChannel));
  }, () => cb([]));
}
