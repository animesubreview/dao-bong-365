/**
 * Netlify Function: /sitemap-images.xml
 * ─────────────────────────────────────────────────────────────────
 * Sitemap ảnh riêng (Google Image Search) — mỗi phim 1 URL trang kèm ảnh poster.
 * (sitemap-movies.xml cũng có <image:image> nhúng sẵn; file này là bản tách riêng
 * theo đúng yêu cầu chuẩn SEO, một số công cụ audit tìm sitemap ảnh riêng biệt.)
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
  const pages = [1, 2, 3, 4];

  const tasks = types.flatMap(type => pages.map(page => fetchPage(type, page)));
  const results = await Promise.all(tasks);

  const slugMap = new Map();
  results.flat().forEach(m => {
    if (m?.slug && !slugMap.has(m.slug) && (m.poster_url || m.thumb_url)) {
      slugMap.set(m.slug, {
        slug: m.slug,
        poster: m.poster_url || '',
        thumb: m.thumb_url || '',
        name: m.name || '',
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

export const handler = async () => {
  try {
    const movies = await getAllMovies();

    const urls = movies.map(m => {
      const loc = escapeXml(`${BASE_SITE}/phim/${m.slug}`);
      const images = [m.poster, m.thumb]
        .filter(Boolean)
        .map(buildImageUrl)
        .filter(Boolean)
        .map(img => `\n    <image:image><image:loc>${escapeXml(img)}</image:loc><image:title>${escapeXml(m.name)}</image:title></image:image>`)
        .join('');
      return `  <url>\n    <loc>${loc}</loc>${images}\n  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=43200, stale-while-revalidate=3600',
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `Sitemap images error: ${err.message}`,
    };
  }
};
