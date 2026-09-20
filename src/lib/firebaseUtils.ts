import { setDoc, DocumentReference, SetOptions } from 'firebase/firestore';

/** Lỗi lưu Firestore đã được dịch sang tiếng Việt (giữ lại .code gốc để dễ debug). */
export class FirebaseSaveError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'FirebaseSaveError';
    this.code = code;
  }
}

/** Dịch lỗi Firebase/Firestore thành câu dễ hiểu cho admin. */
export function describeFirebaseError(e: any): string {
  if (e instanceof FirebaseSaveError) return e.message;
  const code: string = e?.code || '';
  const raw: string = e?.message || String(e || '');
  if (code.includes('permission-denied') || code.includes('unauthenticated') || /insufficient permissions/i.test(raw)) {
    return 'Firestore từ chối ghi (permission-denied). Vào Firebase Console → Firestore Database → Rules, dán nội dung file firestore.rules rồi bấm Publish.';
  }
  if (code.includes('resource-exhausted') || /quota/i.test(raw)) {
    return 'Firestore đã hết quota miễn phí trong ngày (resource-exhausted). Đợi sang ngày mới hoặc nâng gói Blaze.';
  }
  if (code.includes('not-found') || /database.*does not exist/i.test(raw)) {
    return 'Chưa có Firestore Database. Vào Firebase Console → Firestore Database → Create database.';
  }
  if (code.includes('unavailable') || code.includes('deadline-exceeded') || /offline|network|blocked/i.test(raw)) {
    return 'Không kết nối được tới Firebase. Hãy tắt AdBlock/VPN, đổi mạng rồi lưu lại.';
  }
  if (code.includes('invalid-argument') && /size|bytes|large/i.test(raw)) {
    return 'Dữ liệu quá lớn (Firestore giới hạn 1MB/tài liệu). Hãy dùng ảnh nhỏ hơn hoặc dán link ảnh.';
  }
  return `Lỗi Firebase${code ? ` (${code})` : ''}: ${raw}`;
}

const MAX_DOC_BYTES = 900_000; // Firestore giới hạn 1 MiB/tài liệu → chừa dư địa
const SAVE_TIMEOUT_MS = 15_000;

/**
 * Ghi 1 document Firestore an toàn:
 *  - báo lỗi rõ ràng nếu dữ liệu > ~1MB (thường do ảnh base64),
 *  - không treo vô hạn khi mạng bị chặn (Firestore mặc định chờ mãi),
 *  - dịch lỗi permission-denied / hết quota / mất mạng sang tiếng Việt.
 */
export async function saveDoc(ref: DocumentReference, data: any, options?: SetOptions): Promise<void> {
  let bytes = 0;
  try { bytes = new TextEncoder().encode(JSON.stringify(data)).length; } catch {}
  if (bytes > MAX_DOC_BYTES) {
    throw new FirebaseSaveError(
      'too-large',
      `Dữ liệu quá lớn (${(bytes / 1024).toFixed(0)}KB, Firestore giới hạn 1MB/tài liệu). Thường do ảnh/video tải lên — hãy dùng ảnh nhỏ hơn hoặc dán link.`
    );
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FirebaseSaveError(
      'timeout',
      'Không kết nối được tới Firebase (quá 15 giây). Hãy tắt AdBlock/VPN, đổi mạng rồi lưu lại.'
    )), SAVE_TIMEOUT_MS);
  });

  try {
    await Promise.race([options ? setDoc(ref, data, options) : setDoc(ref, data), timeout]);
  } catch (e: any) {
    if (e instanceof FirebaseSaveError) throw e;
    console.error('[firestore] Lỗi ghi', ref.path, e);
    throw new FirebaseSaveError(e?.code || 'unknown', describeFirebaseError(e));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Thu nhỏ ảnh về data-URL nhẹ (giữ nền trong suốt nếu là PNG) để không vượt giới hạn Firestore. */
export function resizeImageToDataUrl(file: File, maxSide = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Trình duyệt không hỗ trợ canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
      resolve(keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được file ảnh')); };
    img.src = url;
  });
}
