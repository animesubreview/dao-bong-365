/**
 * Vercel Edge Function: SEO Prerender cho Googlebot / Facebook / Zalo...
 *
 * vercel.json chỉ rewrite request vào đây khi User-Agent khớp bot (xem `has` condition),
 * nên function này không cần tự kiểm tra bot nữa — luôn trả HTML prerender.
 * Người dùng thường vẫn nhận SPA React bình thường (không đi qua function này).
 */



const SITE_NAME = 'Đảo Phim';
const SITE_URL  = 'https://daophim.online';
const API_BASE  = 'https://phimapi.com';
const DEFAULT_IMG = 'https://daophim.online/og-image.png';

// Ghép link ảnh poster/backdrop đúng domain thật của KKPhim (img.phimapi.com),
// đồng bộ với movieApi.getImageUrl() bên client — tránh ảnh vỡ khi share link (Facebook/Zalo).
function buildPosterUrl(raw) {
  if (!raw) return DEFAULT_IMG;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const clean = raw.replace(/^\/+/, '').replace(/.*uploads\/movies\//, 'uploads/movies/');
  if (raw.includes('ophim')) return `https://img.ophim.live/${clean}`;
  return `https://img.phimapi.com/${clean}`;
}

// Danh sách bot cần prerender
const BOT_AGENTS = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
  'telegrambot', 'applebot', 'sogou', 'exabot', 'ia_archiver',
  'msnbot', 'ahrefsbot', 'semrushbot', 'dotbot', 'seznambot',
  // Ứng dụng nhắn tin / mạng xã hội — các bot tạo "thẻ xem trước link" khi chia sẻ
  'zalo', 'facebot', 'discordbot', 'slackbot', 'viber', 'skypeuripreview',
  'pinterest', 'redditbot', 'embedly', 'kakaotalk', 'vkshare',
];

function isBot(userAgent) {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(b => ua.includes(b));
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const TYPE_LABELS = {
  'phim-bo': 'Phim Bộ', 'phim-le': 'Phim Lẻ', 'hoat-hinh': 'Hoạt Hình',
  'tv-shows': 'TV Shows', 'phim-chieu-rap': 'Phim Chiếu Rạp',
};
const COUNTRY_LABELS = {
  'han-quoc': 'Hàn Quốc', 'trung-quoc': 'Trung Quốc', 'au-my': 'Âu Mỹ',
  'nhat-ban': 'Nhật Bản', 'thai-lan': 'Thái Lan', 'viet-nam': 'Việt Nam',
  'dai-loan': 'Đài Loan', 'hong-kong': 'Hồng Kông', 'an-do': 'Ấn Độ',
  'anh': 'Anh', 'phap': 'Pháp', 'duc': 'Đức',
};

export const config = { runtime: 'edge' };

// Fallback: nếu không dựng được HTML (phim không tồn tại, API lỗi...) thì trả về
// đúng file index.html tĩnh của SPA, để bot vẫn nhận được trang thay vì lỗi.
import { checkRateLimit, getClientIp } from './_rateLimit.js';

async function passThrough(request) {
  const indexUrl = new URL('/index.html', request.url);
  const res = await fetch(indexUrl);
  return new Response(await res.text(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default async function handler(request) {
  const url = new URL(request.url);

  // Chống bot giả mạo User-Agent (Googlebot giả...) spam gọi hàm này liên tục —
  // mỗi hàm gọi đều kéo theo 1 lượt request sang API KKPhim, khá tốn tài nguyên.
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, 'seo-prerender', 90, 60_000)) {
    return new Response('Too many requests', { status: 429 });
  }

  const movieMatch = url.pathname.match(/^\/phim\/([^/]+)$/);
  const watchMatch = url.pathname.match(/^\/watch\/([^/]+)(?:\/[^/]+)?\/?$/);
  const typeMatch  = url.pathname.match(/^\/type\/([^/]+)$/);
  const manualMatch = url.pathname.match(/^\/(?:manual|watch-manual)\/([^/]+)(?:\/[^/]+)?\/?$/);

  if (manualMatch) return handleManualMovie(manualMatch[1], request);
  if (movieMatch) return handleMovieDetail(movieMatch[1], request);
  if (watchMatch) return handleMovieDetail(watchMatch[1], request);
  if (typeMatch)  return handleTypeListing(typeMatch[1], url.searchParams, request);

  return passThrough(request);
}

async function handleTypeListing(type, searchParams, request) {
  const country  = searchParams.get('country')  || '';
  const category = searchParams.get('category') || '';
  const page     = searchParams.get('page') || '1';

  try {
    let apiUrl = `${API_BASE}/v1/api/danh-sach/${type}?page=${page}&limit=24&sort_field=modified.time`;
    if (country)  apiUrl += `&country=${country}`;
    if (category) apiUrl += `&category=${category}`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return passThrough(request);

    const data  = await res.json();
    const items = data?.data?.items || [];
    if (!items.length) return passThrough(request);

    const typeLabel    = TYPE_LABELS[type] || type;
    const countryLabel = COUNTRY_LABELS[country] || '';
    const pageTitle = escapeHtml(
      countryLabel ? `${typeLabel} ${countryLabel} Vietsub HD Mới Nhất` : `${typeLabel} Vietsub HD Mới Nhất`
    );
    const fullTitle = `${pageTitle} | ${SITE_NAME}`;
    const desc = escapeHtml(
      `Tổng hợp ${typeLabel}${countryLabel ? ' ' + countryLabel : ''} Vietsub, thuyết minh, lồng tiếng full HD, cập nhật mới mỗi ngày tại ${SITE_NAME}. Xem miễn phí, không quảng cáo.`
    );
    let pageUrl = `${SITE_URL}/type/${type}`;
    if (country) pageUrl += `?country=${country}`;
    pageUrl = escapeHtml(pageUrl);

    const itemListSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: pageTitle,
      itemListElement: items.slice(0, 24).map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/phim/${m.slug}`,
        name: m.name,
      })),
    };
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: typeLabel, item: `${SITE_URL}/type/${type}` },
      ],
    };

    const cardsHtml = items.map((m) => {
      const img = escapeHtml(buildPosterUrl(m.poster_url || m.thumb_url));
      return `<a href="${SITE_URL}/phim/${escapeHtml(m.slug)}">
        <img src="${img}" alt="${escapeHtml(m.name)}" width="220" height="330" loading="lazy" />
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.origin_name || '')} · ${escapeHtml(String(m.year || ''))}</p>
      </a>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${JSON.stringify({ '@graph': [itemListSchema, breadcrumb] })}</script>
</head>
<body>
  <h1>${pageTitle}</h1>
  <p>${desc}</p>
  <nav>${cardsHtml}</nav>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'x-prerendered-by': 'daophim-edge',
      },
    });
  } catch {
    return passThrough(request);
  }
}

async function handleMovieDetail(slug, request) {
  try {
    const res  = await fetch(`${API_BASE}/phim/${slug}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return passThrough(request);

    const data  = await res.json();
    const movie = data?.movie;
    if (!movie) return passThrough(request);

    // ── Build meta data ─────────────────────────────────────────────
    const isTV     = movie.type === 'series';
    const title    = escapeHtml(movie.name);
    const fullTitle = `${title} | DAOPHIM`;
    const desc     = escapeHtml(
      `Xem ${movie.name} (${movie.origin_name || ''}) ${movie.year || ''} Vietsub HD miễn phí tại Đảo Phim. ` +
      stripHtml(movie.content || '').slice(0, 150)
    );
    const image    = escapeHtml(buildPosterUrl(movie.thumb_url || movie.poster_url));
    const pageUrl  = escapeHtml(`${SITE_URL}/phim/${slug}`);
    const genres   = (movie.category || []).map((c) => escapeHtml(c.name)).join(', ');
    const keywords = [
      movie.name, movie.origin_name,
      ...(movie.category || []).map((c) => c.name),
      'vietsub', 'hd', 'xem phim miễn phí', 'đảo phim',
    ].filter(Boolean).map(escapeHtml).join(', ');

    // ── JSON-LD Schema ──────────────────────────────────────────────
    const schema = {
      '@context': 'https://schema.org',
      '@type': isTV ? 'TVSeries' : 'Movie',
      name: movie.name,
      alternateName: movie.origin_name,
      description: stripHtml(movie.content || '').slice(0, 500),
      image,
      url: `${SITE_URL}/phim/${slug}`,
      datePublished: movie.year?.toString(),
      inLanguage: 'vi',
      genre: (movie.category || []).map((c) => c.name),
      ...(movie.director?.length && {
        director: (Array.isArray(movie.director) ? movie.director : [movie.director])
          .map((d) => ({ '@type': 'Person', name: d })),
      }),
      ...(movie.actor?.length && {
        actor: movie.actor.slice(0, 8).map((a) => ({ '@type': 'Person', name: a })),
      }),
      potentialAction: { '@type': 'WatchAction', target: `${SITE_URL}/phim/${slug}` },
    };

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: isTV ? 'Phim Bộ' : 'Phim Lẻ',
          item: `${SITE_URL}/type/${isTV ? 'phim-bo' : 'phim-le'}` },
        { '@type': 'ListItem', position: 3, name: movie.name, item: `${SITE_URL}/phim/${slug}` },
      ],
    };

    // ── HTML output cho bot ─────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${fullTitle}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${keywords}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${pageUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${isTV ? 'video.tv_show' : 'video.movie'}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:alt" content="Poster phim ${title}" />
  <meta property="og:locale" content="vi_VN" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <!-- Schema.org -->
  <script type="application/ld+json">${JSON.stringify({ '@graph': [schema, breadcrumb] })}</script>
</head>
<body>
  <h1>${escapeHtml(movie.name)}</h1>
  ${movie.origin_name ? `<p>${escapeHtml(movie.origin_name)}</p>` : ''}
  <p>${escapeHtml(String(movie.year || ''))} · ${genres} · ${escapeHtml(movie.quality || '')} · ${escapeHtml(movie.lang || 'Vietsub')}</p>
  ${movie.episode_current ? `<p>Tập: ${escapeHtml(String(movie.episode_current))}</p>` : ''}
  <p>${escapeHtml(stripHtml(movie.content || '').slice(0, 300))}</p>
  <a href="${pageUrl}">Xem phim ${escapeHtml(movie.name)} tại ${SITE_NAME}</a>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'x-prerendered-by': 'daophim-edge',
      },
    });

  } catch {
    return passThrough(request);
  }
}



// ─── Phim đăng thủ công (lưu trong Supabase, bảng firestore_docs / manual_movies) ────────
const SUPABASE_URL = (typeof process !== 'undefined' && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL))
  || 'https://dkspxcgdmunhuwofhcsi.supabase.co';
const SUPABASE_ANON = (typeof process !== 'undefined' && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY))
  || 'sb_publishable_vJIf5Jorz8eXHCtnJ5DSJg_7aGFbybv';

function absImage(raw) {
  if (!raw) return DEFAULT_IMG;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('http')) return raw;
  return `${SITE_URL}/${raw.replace(/^\/+/, '')}`;
}

async function handleManualMovie(id, request) {
  try {
    const q = `${SUPABASE_URL}/rest/v1/firestore_docs?collection_path=eq.manual_movies&doc_id=eq.${encodeURIComponent(id)}&select=data`;
    const res = await fetch(q, { headers: { apikey: SUPABASE_ANON }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return passThrough(request);
    const rows = await res.json();
    const m = rows?.[0]?.data;
    if (!m || !m.name) return passThrough(request);

    const isTV = m.type === 'series';
    const nameYear = m.year ? `${m.name} (${m.year})` : m.name;
    const fullTitle = escapeHtml(`${nameYear} - Xem Phim ${m.lang || 'Vietsub'} HD | ${SITE_NAME}`);
    const plain = stripHtml(m.description || '').slice(0, 170);
    const desc = escapeHtml(
      `Xem ${m.name}${m.originName ? ` (${m.originName})` : ''} ${m.quality || 'HD'} ${m.lang || 'Vietsub'} miễn phí tại ${SITE_NAME}. ${plain}`.trim()
    );
    // Ảnh xem trước: ưu tiên ảnh NGANG do admin nhập cho banner, không có thì dùng poster
    const image = escapeHtml(absImage(m.bannerImageUrl || m.posterUrl));
    const pageUrl = escapeHtml(`${SITE_URL}/manual/${id}`);
    const title = escapeHtml(m.name);

    const schema = {
      '@context': 'https://schema.org',
      '@type': isTV ? 'TVSeries' : 'Movie',
      name: m.name,
      alternateName: m.originName || undefined,
      description: plain,
      image: absImage(m.bannerImageUrl || m.posterUrl),
      url: `${SITE_URL}/manual/${id}`,
      datePublished: m.year ? String(m.year) : undefined,
      inLanguage: 'vi',
    };

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${pageUrl}" />

  <meta property="og:type" content="${isTV ? 'video.tv_show' : 'video.movie'}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:alt" content="Poster phim ${title}" />
  <meta property="og:locale" content="vi_VN" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <h1>${title}</h1>
  ${m.originName ? `<p>${escapeHtml(m.originName)}</p>` : ''}
  <p>${escapeHtml(String(m.year || ''))} · ${escapeHtml(m.quality || '')} · ${escapeHtml(m.lang || 'Vietsub')}</p>
  <p>${escapeHtml(plain)}</p>
  <a href="${pageUrl}">Xem phim ${title} tại ${SITE_NAME}</a>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600',
        'x-prerendered-by': 'daophim-edge',
      },
    });
  } catch {
    return passThrough(request);
  }
}
