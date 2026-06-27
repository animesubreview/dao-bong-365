/**
 * Netlify Edge Function: SEO Prerender cho Googlebot / Facebook / Zalo...
 *
 * Khi bot crawl /phim/{slug}, edge function này:
 *  1. Fetch dữ liệu phim từ KKPhim API
 *  2. Trả về HTML đầy đủ với title, meta, OG tags, JSON-LD Schema
 *
 * Người dùng bình thường vẫn nhận SPA React như cũ.
 */



const SITE_NAME = 'Đảo Phim';
const SITE_URL  = 'https://daophim.lol';
const API_BASE  = 'https://phimapi.com';
const DEFAULT_IMG = 'https://sf-static.upanhlaylink.com/img/image_2026051206bab16347f075d07864efb55a5224ea.jpg';

// Danh sách bot cần prerender
const BOT_AGENTS = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
  'telegrambot', 'applebot', 'sogou', 'exabot', 'ia_archiver',
  'msnbot', 'ahrefsbot', 'semrushbot', 'dotbot', 'seznambot',
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

export default async function handler(request, context) {
  const url = new URL(request.url);
  const ua  = request.headers.get('user-agent') || '';

  // Chỉ xử lý trang /phim/{slug} và khi là bot
  const match = url.pathname.match(/^\/phim\/([^/]+)$/);
  if (!match || !isBot(ua)) {
    return context.next();
  }

  const slug = match[1];

  try {
    const res  = await fetch(`${API_BASE}/phim/${slug}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return context.next();

    const data  = await res.json();
    const movie = data?.movie;
    if (!movie) return context.next();

    // ── Build meta data ─────────────────────────────────────────────
    const isTV     = movie.type === 'series';
    const title    = escapeHtml(`${movie.name}${movie.origin_name && movie.origin_name !== movie.name ? ` - ${movie.origin_name}` : ''} (${movie.year || ''}) Vietsub HD`);
    const fullTitle = `${title} | ${SITE_NAME}`;
    const desc     = escapeHtml(
      `Xem ${movie.name} (${movie.origin_name || ''}) ${movie.year || ''} Vietsub HD miễn phí tại Đảo Phim. ` +
      stripHtml(movie.content || '').slice(0, 150)
    );
    const image    = escapeHtml(
      (movie.poster_url || movie.thumb_url || DEFAULT_IMG)
        .replace('https://phimimg.com/', 'https://img.ophim.live/')
    );
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
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
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
    return context.next();
  }
}

export const config = {
  path: '/phim/*',
};
