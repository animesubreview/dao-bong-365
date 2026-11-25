// Địa chỉ server chứa các chức năng cần backend (nạp thẻ, proxy phát phim, telegram...).
// - Web chạy trên Vercel (cùng domain): để TRỐNG.
// - Web chạy trên hosting tĩnh: đặt VITE_API_BASE=https://ten-du-an.vercel.app (không có dấu / ở cuối)
//   rồi build lại. Phía Vercel đã bật CORS cho các hàm trong /api.
const raw = ((import.meta as any).env?.VITE_API_BASE as string | undefined) || '';
export const API_BASE = raw.replace(/\/+$/, '');
