/**
 * Netlify Scheduled Function: check-new-movies (ESM)
 * Chạy mỗi 30 phút - Không spam lặp nhờ Netlify Blobs
 */
import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8182223004:AAEKg4Gf869fv0Io72AQNeWvrii6D3_utIk';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '-1003945410277';
const SITE_URL           = process.env.SITE_URL            || 'https://daophim.lol';
const KKPHIM_API         = 'https://phimapi.com';

async function sendTelegram(text, photoUrl) {
  const base = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  if (photoUrl) {
    try {
      const r = await fetch(`${base}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: photoUrl,
          caption: text,
          parse_mode: 'HTML',
        }),
      });
      const d = await r.json();
      if (d.ok) return d;
    } catch {}
  }
  const r = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });
  return r.json();
}

function getThumb(thumb_url) {
  if (!thumb_url) return null;
  if (thumb_url.startsWith('http')) return thumb_url;
  return `https://phimimg.com/upload/vod/${thumb_url}`;
}

// Format phim mới hoàn toàn
function formatNewMovie(movie) {
  const url = `${SITE_URL}/movie/${movie.slug}`;
  const year = movie.year ? `📅 <b>${movie.year}</b>   ` : '';
  const quality = movie.quality ? `🎥 <b>${movie.quality}</b>   ` : '';
  const lang = movie.lang ? `🔊 ${movie.lang}` : '';
  const totalEp = movie.episode_total && movie.episode_total !== 'Full'
    ? `\n📺 Tổng: <b>${movie.episode_total} tập</b>` : '';
  const type = movie.type === 'series' ? '📺 Phim Bộ' : movie.type === 'hoathinh' ? '🌸 Anime' : '🎬 Phim Lẻ';

  return `${type} <b>MỚI!</b>\n\n` +
    `📌 <b>${movie.name}</b>\n` +
    `${movie.origin_name ? `🔤 <i>${movie.origin_name}</i>\n` : ''}` +
    `${year}${quality}${lang}${totalEp}\n\n` +
    `🔗 <a href="${url}">▶️ Xem ngay tại DaoPhim.lol</a>`;
}

// Format tập mới
function formatNewEpisode(movie, epCurrent) {
  const url = `${SITE_URL}/movie/${movie.slug}`;
  const quality = movie.quality ? `🎥 <b>${movie.quality}</b>   ` : '';
  const lang = movie.lang ? `🔊 ${movie.lang}` : '';
  const type = movie.type === 'hoathinh' ? '🌸 Anime' : '📺 Phim Bộ';

  return `🆕 ${type} <b>CÓ TẬP MỚI!</b>\n\n` +
    `📌 <b>${movie.name}</b>\n` +
    `${movie.origin_name ? `🔤 <i>${movie.origin_name}</i>\n` : ''}` +
    `🎬 Tập mới nhất: <b>${epCurrent}</b>\n` +
    `${quality}${lang}\n\n` +
    `🔗 <a href="${url}">▶️ Xem ngay tại DaoPhim.lol</a>`;
}

const myHandler = async () => {
  console.log('🔍 Checking new movies from KKPhim...');

  try {
    // Lấy store để lưu trạng thái phim đã gửi
    let sentMovies = {};
    let store;
    try {
      store = getStore('telegram-sent');
      const stored = await store.get('sent-list', { type: 'json' });
      if (stored) sentMovies = stored;
    } catch {
      console.log('Blobs not available, using empty state');
    }

    // Gọi API KKPhim
    const res = await fetch(`${KKPHIM_API}/danh-sach/phim-moi-cap-nhat?page=1`, {
      headers: { 'User-Agent': 'DaoPhim-Bot/1.0' },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const movies = data.items || [];

    // Lọc trong 35 phút qua (dư 5 phút buffer)
    const cutoff = Math.floor(Date.now() / 1000) - 35 * 60;

    const toProcess = movies.filter(m => {
      const t = m.modified?.time || m.updated_at || '';
      if (!t) return false;
      const ts = Math.floor(new Date(t).getTime() / 1000);
      return ts >= cutoff;
    });

    console.log(`Found ${toProcess.length} movies updated in last 35 min`);

    let sentCount = 0;
    const newSentMovies = { ...sentMovies };

    for (const movie of toProcess) {
      if (sentCount >= 5) break; // tối đa 5 thông báo/lần

      const slug = movie.slug;
      const epRaw = movie.episode_current || '';
      const ep = String(epRaw).toLowerCase().trim();

      // Kiểm tra xem phim mới hoàn toàn hay tập mới
      const isFullMovie = ep === 'full' || ep === 'full hd' || ep === 'hd';
      const isEp1 = ep === '1' || ep === 'tập 1' || ep === 'tap 1';
      const isNewMovie = isFullMovie || isEp1;

      // Key để check trùng: slug + episode_current
      const key = `${slug}__${ep}`;

      // Đã gửi rồi → bỏ qua
      if (newSentMovies[key]) {
        console.log(`Skip (already sent): ${movie.name} - ${ep}`);
        continue;
      }

      const thumb = getThumb(movie.thumb_url);

      let text;
      if (isNewMovie) {
        text = formatNewMovie(movie);
      } else {
        // Tập mới — chỉ gửi nếu là phim bộ/anime
        if (movie.type === 'single') continue; // phim lẻ không có tập mới
        text = formatNewEpisode(movie, epRaw || 'Mới nhất');
      }

      const result = await sendTelegram(text, thumb);
      console.log(`✅ Sent: ${movie.name} (${isNewMovie ? 'NEW MOVIE' : 'NEW EP'}) - Telegram: ${result.ok}`);

      // Đánh dấu đã gửi
      newSentMovies[key] = Date.now();
      sentCount++;

      await new Promise(r => setTimeout(r, 700));
    }

    // Dọn dẹp entries cũ hơn 7 ngày
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const key of Object.keys(newSentMovies)) {
      if (newSentMovies[key] < sevenDaysAgo) {
        delete newSentMovies[key];
      }
    }

    // Lưu lại
    if (store) {
      try {
        await store.set('sent-list', JSON.stringify(newSentMovies));
      } catch (e) {
        console.log('Could not save to Blobs:', e.message);
      }
    }

    console.log(`✅ Done. Sent ${sentCount} notifications.`);
    return { statusCode: 200 };

  } catch (err) {
    console.error('❌ Error:', err);
    return { statusCode: 500 };
  }
};

export const handler = schedule('*/30 * * * *', myHandler);
