/**
 * Netlify Function: telegram-notify (ESM)
 * POST /.netlify/functions/telegram-notify
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8182223004:AAEKg4Gf869fv0Io72AQNeWvrii6D3_utIk';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '6949171104';
const SITE_URL           = process.env.SITE_URL            || 'https://daophim.lol';

async function sendTelegram(text, photoUrl) {
  const base = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  if (photoUrl) {
    try {
      const r = await fetch(`${base}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, photo: photoUrl, caption: text, parse_mode: 'HTML' }),
      });
      const d = await r.json();
      if (d.ok) return d;
    } catch {}
  }
  const r = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: false }),
  });
  return r.json();
}

function formatManualMovie(movie) {
  const url = `${SITE_URL}/manual/${movie.id}`;
  return `🎬 PHIM MỚI THÊM VÀO!\n\n` +
    `📌 ${movie.name}\n` +
    `${movie.originName ? `🔤 ${movie.originName}\n` : ''}` +
    `${movie.year ? `📅 ${movie.year}   ` : ''}` +
    `${movie.quality ? `🎥 ${movie.quality}   ` : ''}` +
    `${movie.lang ? `🔊 ${movie.lang}\n` : ''}` +
    `\n▶️ Xem ngay: ${url}`;
}

function formatNewMovie(movie) {
  const url = `${SITE_URL}/movie/${movie.slug}`;
  return `🎬 PHIM MỚI!\n\n` +
    `📌 ${movie.name}\n` +
    `${movie.origin_name ? `🔤 ${movie.origin_name}\n` : ''}` +
    `${movie.year ? `📅 ${movie.year}   ` : ''}` +
    `${movie.quality ? `🎥 ${movie.quality}   ` : ''}` +
    `${movie.lang ? `🔊 ${movie.lang}\n` : ''}` +
    `\n▶️ Xem ngay: ${url}`;
}

function formatNewEpisode(movie, episodeName) {
  const url = `${SITE_URL}/movie/${movie.slug}`;
  return `🆕 TẬP MỚI!\n\n` +
    `📌 ${movie.name}\n` +
    `🎬 Tập mới: ${episodeName}\n` +
    `\n▶️ Xem ngay: ${url}`;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secret = process.env.NOTIFY_SECRET || 'daophim_secret_2024';
  if (event.headers['x-notify-secret'] !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { type, movie, episodeName } = body;

  try {
    let message = '';
    let photoUrl = null;

    if (type === 'manual_movie') {
      message = formatManualMovie(movie);
      photoUrl = movie.posterUrl || null;
    } else if (type === 'new_movie') {
      message = formatNewMovie(movie);
      photoUrl = movie.thumb_url
        ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : `https://phimimg.com/upload/vod/${movie.thumb_url}`)
        : null;
    } else if (type === 'new_episode') {
      message = formatNewEpisode(movie, episodeName);
      photoUrl = movie.thumb_url
        ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : `https://phimimg.com/upload/vod/${movie.thumb_url}`)
        : null;
    } else {
      return { statusCode: 400, body: 'Unknown type' };
    }

    const result = await sendTelegram(message, photoUrl);
    return { statusCode: 200, body: JSON.stringify({ ok: true, telegram: result }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
