/**
 * Helper gửi thông báo Telegram khi có phim mới
 * Gọi Netlify Function /.netlify/functions/telegram-notify
 */

// Lấy từ biến môi trường VITE_NOTIFY_SECRET (khai báo trên Vercel).
// Lưu ý: giá trị này sẽ nằm trong bundle JS gửi cho trình duyệt (mọi biến VITE_* đều public),
// nên nó chỉ có tác dụng chống gọi nhầm/spam vãng lai, KHÔNG phải bảo mật thực sự.
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';

async function callNotify(payload: object) {
  try {
    const res = await fetch('/.netlify/functions/telegram-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': NOTIFY_SECRET,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Telegram notification sent');
    } else {
      console.warn('⚠️ Telegram notify failed:', data);
    }
  } catch (err) {
    console.error('❌ Telegram notify error:', err);
  }
}

/** Thông báo phim thủ công mới vừa được thêm vào Firestore */
export async function notifyManualMovie(movie: {
  id: string;
  name: string;
  originName?: string;
  year?: string;
  quality?: string;
  lang?: string;
  posterUrl?: string;
  description?: string;
}) {
  await callNotify({ type: 'manual_movie', movie });
}

/** Thông báo phim mới từ API OPhim */
export async function notifyNewMovie(movie: {
  name: string;
  origin_name?: string;
  slug: string;
  thumb_url?: string;
  year?: string;
  quality?: string;
  lang?: string;
  episode_total?: string;
  category?: { name: string }[];
}) {
  await callNotify({ type: 'new_movie', movie });
}

/** Thông báo tập mới từ API OPhim */
export async function notifyNewEpisode(movie: {
  name: string;
  origin_name?: string;
  slug: string;
  thumb_url?: string;
  quality?: string;
  lang?: string;
}, episodeName: string) {
  await callNotify({ type: 'new_episode', movie, episodeName });
}
