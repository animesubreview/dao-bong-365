/**
 * Netlify Function: /rss.xml
 * ─────────────────────────────────────────────────────────────────
 * RSS feed 30 phim/tập mới cập nhật gần nhất — giúp Google/feed reader
 * phát hiện nội dung mới nhanh hơn.
 */

const BASE_SITE = 'https://daophim.online';
const API_BASE  = 'https://phimapi.com';
const SITE_NAME = 'Đảo Phim';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildImageUrl(raw) {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `https://img.phimapi.com/${raw}`;
}

export const handler = async () => {
  try {
    const res = await fetch(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    const items = (data?.items || []).slice(0, 30);

    const rssItems = items.map((m) => {
      const link = `${BASE_SITE}/phim/${m.slug}`;
      const pubDate = m.modified?.time
        ? new Date(m.modified.time).toUTCString()
        : new Date().toUTCString();
      const img = buildImageUrl(m.thumb_url || m.poster_url);
      const title = escapeXml(`${m.name}${m.origin_name ? ' - ' + m.origin_name : ''}${m.episode_current ? ' - ' + m.episode_current : ''}`);
      const desc = escapeXml(`${m.name} (${m.year || ''}) Vietsub HD - ${m.quality || ''} - ${m.lang || ''}`);

      return `  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[${desc}]]></description>
    ${img ? `<enclosure url="${escapeXml(img)}" type="image/jpeg" />` : ''}
  </item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${SITE_NAME} - Phim Mới Cập Nhật</title>
  <link>${BASE_SITE}</link>
  <atom:link href="${BASE_SITE}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Danh sách phim và tập phim mới cập nhật tại ${SITE_NAME}</description>
  <language>vi-VN</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
</channel>
</rss>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `RSS error: ${err.message}`,
    };
  }
};
