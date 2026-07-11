/**
 * Netlify Function: /sitemap-movies.xml
 * ─────────────────────────────────────────────────────────────────
 * - Fetch song song tất cả loại phim (nhiều page hơn) → tránh timeout
 * - Thêm <image:image> cho mỗi phim → Google Image Search index ảnh
 * - Dùng /phim/ (đúng route của app)
 * - Cache 12h phía CDN
 */

const BASE_SITE = 'https://daophim.online';
const API_BASE  = 'https://phimapi.com';

async function fetchPage(type, page) {
  try {
    const res = await fetch(
      `${API_BASE}/v1/api/danh-sach/${type}?page=${page}&limit=64`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return data?.data?.items || [];
  } catch { return []; }
}

async function getAllMovies() {
  const types = ['phim-bo', 'phim-le', 'hoat-hinh', 'phim-chieu-rap'];
  // 8 page × 64 limit × 4 type = ~2048 phim tối đa, đủ cho Netlify 10s timeout
  const pages = [1, 2, 3, 4, 5, 6, 7, 8];

  const tasks = types.flatMap(type =>
    pages.map(page => fetchPage(type, page))
  );

  const results = await Promise.all(tasks);

  // Deduplicate theo slug, giữ info ảnh
  const slugMap = new Map();
  results.flat().forEach(m => {
    if (m?.slug && !slugMap.has(m.slug)) {
      slugMap.set(m.slug, {
        slug: m.slug,
        thumb: m.thumb_url || '',
        name: m.name || '',
        modified: m.modified?.time || m.modified || '',
      });
    }
  });

  return [...slugMap.values()];
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildImageUrl(raw) {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `https://img.phimapi.com/${raw}`;
}

async function netlifyHandlerFn() {
  try {
    const movies = await getAllMovies();
    const today  = new Date().toISOString().split('T')[0];

    // ── Trang tĩnh ─────────────────────────────────────────────────
    const staticUrls = [
      `<url><loc>${BASE_SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${BASE_SITE}/type/phim-bo</loc><changefreq>daily</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${BASE_SITE}/type/phim-le</loc><changefreq>daily</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${BASE_SITE}/type/hoat-hinh</loc><changefreq>daily</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${BASE_SITE}/type/phim-chieu-rap</loc><changefreq>daily</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${BASE_SITE}/search</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      `<url><loc>${BASE_SITE}/truyen-tranh</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ];

    // ── Trang phim (có ảnh để Google hiện rich snippet) ────────────
    const movieUrls = movies.map(m => {
      const loc      = escapeXml(`${BASE_SITE}/phim/${m.slug}`);
      const imgUrl   = buildImageUrl(m.thumb);
      const imgTitle = escapeXml(m.name);
      // lastmod: dùng ngày sửa nếu có, không thì dùng today
      let lastmod = today;
      if (m.modified) {
        const d = new Date(m.modified);
        if (!isNaN(d)) lastmod = d.toISOString().split('T')[0];
      }

      const imgTag = imgUrl
        ? `\n    <image:image><image:loc>${escapeXml(imgUrl)}</image:loc><image:title>${imgTitle}</image:title></image:image>`
        : '';

      return `  <url>\n    <loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${imgTag}\n  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${staticUrls.map(u => `  ${u}`).join('\n')}

${movieUrls.join('\n')}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Cache 12h ở CDN, stale-while-revalidate thêm 1h
        'Cache-Control': 'public, max-age=43200, stale-while-revalidate=3600',
        'X-Movie-Count': String(movies.length),
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `Sitemap error: ${err.message}`,
    };
  }
};

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
