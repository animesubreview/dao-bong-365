// ─── Cloudinary (unsigned upload) ─────────────────────────────────────────
// Dùng gói Free của Cloudinary: 25GB storage + 25GB bandwidth/tháng, không cần thẻ.
// Cách lấy CLOUD_NAME + UPLOAD_PRESET: xem hướng dẫn ở README hoặc phần dưới file này.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export class CloudinaryConfigError extends Error {
  constructor() {
    super('Thiếu cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET) trong .env');
    this.name = 'CloudinaryConfigError';
  }
}

export interface CloudinaryUploadResult {
  url: string;          // secure_url — dùng cái này để hiển thị
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Upload 1 file (hoặc Blob) lên Cloudinary bằng unsigned upload preset.
 * folder: thư mục con trong Cloudinary để dễ quản lý (vd: 'avatars', 'maintenance').
 * onProgress: 0-100, tuỳ chọn (dùng XHR để có progress, fetch không hỗ trợ progress upload).
 */
export function uploadToCloudinary(
  file: File | Blob,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return Promise.reject(new CloudinaryConfigError());
  }

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    if (folder) form.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);

    xhr.upload.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height,
            bytes: data.bytes,
            format: data.format,
          });
        } else {
          reject(new Error(data?.error?.message || 'Upload Cloudinary thất bại'));
        }
      } catch (e) {
        reject(new Error('Phản hồi Cloudinary không hợp lệ'));
      }
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối khi upload lên Cloudinary'));
    xhr.send(form);
  });
}

/**
 * Sinh URL Cloudinary đã resize/tối ưu (dùng transformation on-the-fly).
 * Ví dụ: cldUrl(url, 'w_400,h_400,c_fill,q_auto,f_auto')
 */
export function cldTransform(secureUrl: string, transformation: string): string {
  if (!secureUrl.includes('/upload/')) return secureUrl;
  return secureUrl.replace('/upload/', `/upload/${transformation}/`);
}

export const isCloudinaryConfigured = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

/*
 ─── HƯỚNG DẪN LẤY CLOUD_NAME + UPLOAD_PRESET (miễn phí, ~3 phút) ─────────────

 1. Đăng ký tài khoản free tại https://cloudinary.com/users/register/free
 2. Vào Dashboard → copy "Cloud name" (vd: dabc123xy)
    → điền vào .env: VITE_CLOUDINARY_CLOUD_NAME=dabc123xy

 3. Vào Settings (biểu tượng bánh răng) → tab "Upload"
    → mục "Upload presets" → bấm "Add upload preset"
    → Signing Mode: chọn "Unsigned"  (bắt buộc, để upload thẳng từ trình duyệt không cần server)
    → (tuỳ chọn) Folder: để trống, code đã tự set folder khi gọi hàm
    → Save → copy tên preset (vd: ml_default hoặc tên bạn đặt)
    → điền vào .env: VITE_CLOUDINARY_UPLOAD_PRESET=ten_preset_cua_ban

 4. Deploy (Vercel/Netlify) nhớ thêm 2 biến môi trường trên vào phần
    Environment Variables của project, rồi deploy lại.
*/
