// Cloudflare Worker: chỉ chạy cho các đường dẫn SEO (xem run_worker_first trong wrangler.jsonc).
// Các file tĩnh (js/css/ảnh) và trang thường đi thẳng tới ASSETS, không tốn quota Worker.
const BOTS = /googlebot|bingbot|yandexbot|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|sogou|exabot|ia_archiver|msnbot|ahrefsbot|semrushbot|dotbot|seznambot|zalo|facebot|discordbot|slackbot|viber|skypeuripreview|pinterest|redditbot|embedly|kakaotalk|vkshare/i;

const FEEDS = {
  '/sitemap-movies.xml': '/api/sitemap-dynamic',
  '/sitemap-categories.xml': '/api/seo-feeds?t=categories',
  '/sitemap-images.xml': '/api/seo-feeds?t=images',
  '/rss.xml': '/api/seo-feeds?t=rss',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const api = (env.API_BASE || 'https://api.daophim.online').replace(/\/$/, '');

    // /movie/:slug -> /phim/:slug (301)
    const mv = url.pathname.match(/^\/movie\/([^/]+)\/?$/);
    if (mv) return Response.redirect(`${url.origin}/phim/${mv[1]}${url.search}`, 301);

    // Sitemap / RSS: lấy từ API (Vercel)
    if (FEEDS[url.pathname]) {
      try {
        const r = await fetch(api + FEEDS[url.pathname], { cf: { cacheTtl: 3600, cacheEverything: true } });
        return new Response(r.body, {
          status: r.status,
          headers: {
            'content-type': r.headers.get('content-type') || 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        });
      } catch {
        return new Response('Upstream error', { status: 502 });
      }
    }

    // Bot / thẻ xem trước link: dựng HTML có meta + JSON-LD
    const ua = request.headers.get('user-agent') || '';
    if (request.method === 'GET' && BOTS.test(ua)) {
      try {
        const target = `${api}/api/seo-prerender?__path=${encodeURIComponent(url.pathname + url.search)}&__site=${encodeURIComponent(url.origin)}`;
        const r = await fetch(target, { headers: { 'user-agent': ua, 'x-forwarded-for': request.headers.get('cf-connecting-ip') || '' } });
        if (r.ok) {
          return new Response(r.body, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' },
          });
        }
      } catch { /* rơi xuống trang tĩnh */ }
    }

    // Người dùng thường: trang SPA
    return env.ASSETS.fetch(request);
  },
};
