/**
 * Netlify Scheduled Function: check-new-movies (ESM)
 * Chạy mỗi 10 phút - Không spam lặp nhờ Redis
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8182223004:AAEKg4Gf869fv0Io72AQNeWvrii6D3_utIk';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '-1003945410277';
const SITE_URL           = process.env.SITE_URL            || 'https://daophim.online';
const KKPHIM_API         = 'https://phimapi.com';
const INDEXNOW_KEY       = process.env.INDEXNOW_KEY        || 'daophim2026indexnowkey9f8a7b6c';

// IndexNow: báo cho Bing/Yandex (và các search engine hỗ trợ IndexNow) biết ngay khi có URL mới
// Google chưa hỗ trợ IndexNow, nhưng ta vẫn ping thêm sitemap cho Google ở dưới.
async function submitIndexNow(urls) {
  if (!urls.length) return;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'daophim.online',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch (e) {
    console.log('IndexNow submit lỗi:', e.message);
  }
}

// Ping Google + Bing để crawl lại sitemap ngay (best-effort, không đảm bảo index tức thì)
async function pingSitemaps() {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap-movies.xml`);
  try {
    await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`);
    await fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`);
  } catch (e) {
    console.log('Ping sitemap lỗi:', e.message);
  }
}

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

// ─── Gửi thông báo sang Discord bằng BOT THẬT (Bot Token) qua REST API ───
// Vì hàm này chạy trên serverless (chạy xong là tắt), bot KHÔNG login gateway
// (client.login() kiểu discord.js thường) mà gọi thẳng REST API của Discord để
// gửi tin nhắn bằng danh nghĩa bot. Bot vẫn hiện đúng tên/avatar đã tạo,
// chỉ khác là sẽ không hiện chấm "online" liên tục — điều này không ảnh hưởng
// gì tới việc gửi tin nhắn.
//
// Cách tạo & cấu hình:
// 1. Vào https://discord.com/developers/applications → New Application → đặt tên bot.
// 2. Tab "Bot" → Reset Token → copy token → dán vào env var DISCORD_BOT_TOKEN.
// 3. Vẫn ở tab "Bot" → bật "MESSAGE CONTENT INTENT" nếu sau này cần đọc tin nhắn (không bắt buộc để gửi tin).
// 4. Tab "OAuth2 → URL Generator" → chọn scope "bot" → quyền "Send Messages", "Embed Links",
//    "Attach Files" → copy URL → mở URL đó, chọn server, bấm Authorize để mời bot vào server.
// 5. Trong Discord: bật Developer Mode (User Settings → Advanced) → chuột phải vào kênh
//    muốn bot gửi tin → "Copy Channel ID" → dán vào env var DISCORD_CHANNEL_ID.
// 6. Set 2 biến môi trường DISCORD_BOT_TOKEN và DISCORD_CHANNEL_ID trên Vercel (Project Settings → Environment Variables).
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '';
const DISCORD_API = 'https://discord.com/api/v10';

async function sendDiscordBot({ title, url, description, thumb, isNewMovie }) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) return { skipped: true };
  try {
    const embed = {
      title: title.slice(0, 256),
      url,
      description: description.slice(0, 4096),
      color: isNewMovie ? 0x22c55e : 0x3b82f6, // xanh lá = phim mới, xanh dương = tập mới
      image: thumb ? { url: thumb } : undefined,
      footer: { text: 'Đảo Phim Bot' },
      timestamp: new Date().toISOString(),
    };
    const res = await fetch(`${DISCORD_API}/channels/${DISCORD_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        content: isNewMovie ? '🎬 **PHIM MỚI!**' : '🆕 **CÓ TẬP MỚI!**',
        embeds: [embed],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.log('Discord API lỗi:', res.status, errBody);
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.log('Gửi Discord lỗi:', e.message);
    return { ok: false, error: e.message };
  }
}

// Format phim mới hoàn toàn
function formatNewMovie(movie) {
  const url = `${SITE_URL}/phim/${movie.slug}`;
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
  const url = `${SITE_URL}/phim/${movie.slug}`;
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

// Lưu trạng thái "phim đã gửi" bằng Upstash Redis (free tier) thay cho Netlify Blobs
// Cần 2 biến môi trường: UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN (lấy free tại upstash.com)
async function redisGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data?.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}
async function redisSet(key, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  } catch (e) { console.log('Redis set lỗi:', e.message); }
}

async function netlifyHandlerFn(event) {
  // Bảo vệ endpoint: chỉ chạy khi có đúng secret (GitHub Actions cron sẽ gửi kèm)
  const secret = process.env.CRON_SECRET;
  if (secret && event.headers['x-cron-secret'] !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  console.log('🔍 Checking new movies from KKPhim...');

  try {
    // Lấy trạng thái phim đã gửi từ Redis
    let sentMovies = {};
    try {
      const stored = await redisGet('sent-list');
      if (stored) sentMovies = stored;
    } catch {
      console.log('Redis không khả dụng, dùng state rỗng');
    }

    // Gọi API KKPhim
    const res = await fetch(`${KKPHIM_API}/danh-sach/phim-moi-cap-nhat?page=1`, {
      headers: { 'User-Agent': 'DaoPhim-Bot/1.0' },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const movies = data.items || [];

    // Lọc trong 15 phút qua (chu kỳ 10 phút + dư 5 phút buffer)
    const cutoff = Math.floor(Date.now() / 1000) - 15 * 60;

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
      const movieUrl = `${SITE_URL}/phim/${slug}`;

      let text;
      let discordDesc;
      if (isNewMovie) {
        text = formatNewMovie(movie);
        discordDesc = `${movie.origin_name ? `_${movie.origin_name}_\n` : ''}` +
          `${movie.year ? `📅 ${movie.year}  ` : ''}${movie.quality ? `🎥 ${movie.quality}  ` : ''}${movie.lang ? `🔊 ${movie.lang}` : ''}` +
          `${movie.episode_total && movie.episode_total !== 'Full' ? `\n📺 Tổng: ${movie.episode_total} tập` : ''}`;
      } else {
        // Tập mới — chỉ gửi nếu là phim bộ/anime
        if (movie.type === 'single') continue; // phim lẻ không có tập mới
        text = formatNewEpisode(movie, epRaw || 'Mới nhất');
        discordDesc = `${movie.origin_name ? `_${movie.origin_name}_\n` : ''}` +
          `🎬 Tập mới nhất: **${epRaw || 'Mới nhất'}**\n` +
          `${movie.quality ? `🎥 ${movie.quality}  ` : ''}${movie.lang ? `🔊 ${movie.lang}` : ''}`;
      }

      const result = await sendTelegram(text, thumb);
      const discordResult = await sendDiscordBot({
        title: movie.name,
        url: movieUrl,
        description: discordDesc,
        thumb,
        isNewMovie,
      });
      console.log(`✅ Sent: ${movie.name} (${isNewMovie ? 'NEW MOVIE' : 'NEW EP'}) - Telegram: ${result.ok} - Discord: ${discordResult.ok ?? 'bỏ qua (chưa cấu hình)'}`);

      // Báo ngay cho search engine hỗ trợ IndexNow (Bing, Yandex...) biết URL này vừa có nội dung mới
      await submitIndexNow([movieUrl]);

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
    try {
      await redisSet('sent-list', newSentMovies);
    } catch (e) {
      console.log('Không lưu được vào Redis:', e.message);
    }

    // Báo Google/Bing crawl lại sitemap nếu có phim mới trong lượt chạy này
    if (sentCount > 0) {
      await pingSitemaps();
    }

    console.log(`✅ Done. Sent ${sentCount} notifications.`);
    return { statusCode: 200 };

  } catch (err) {
    console.error('❌ Error:', err);
    return { statusCode: 500 };
  }
};

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
