/**
 * Netlify Function: /sitemap-categories.xml
 * ─────────────────────────────────────────────────────────────────
 * Sinh URL cho toàn bộ trang lọc theo THỂ LOẠI và QUỐC GIA
 * (kết hợp với từng loại phim: phim-bo, phim-le, hoat-hinh, phim-chieu-rap)
 */

const BASE_SITE = 'https://daophim.online';

const TYPES = ['phim-bo', 'phim-le', 'hoat-hinh', 'phim-chieu-rap', 'tv-shows'];

const CATEGORIES = [
  'hanh-dong', 'tinh-cam', 'hai-huoc', 'co-trang', 'tam-ly', 'hinh-su',
  'kinh-di', 'vien-tuong', 'phieu-luu', 'hoat-hinh', 'than-thoai',
  'chien-tranh', 'the-thao', 'khoa-hoc', 'am-nhac', 'kinh-dien', 'gia-dinh',
];

const COUNTRIES = [
  'han-quoc', 'trung-quoc', 'au-my', 'nhat-ban', 'thai-lan', 'viet-nam',
  'dai-loan', 'hong-kong', 'an-do', 'anh', 'phap', 'duc',
];

function urlTag(loc, priority = '0.7', changefreq = 'daily') {
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export const handler = async () => {
  const urls = [];

  // Trang thể loại/quốc gia độc lập (không kèm type) — trang tổng hợp
  for (const cat of CATEGORIES) {
    urls.push(urlTag(`${BASE_SITE}/type/phim-bo?category=${cat}`, '0.75'));
  }
  for (const country of COUNTRIES) {
    urls.push(urlTag(`${BASE_SITE}/type/phim-bo?country=${country}`, '0.75'));
  }

  // Kết hợp loại phim + thể loại / quốc gia
  for (const type of TYPES) {
    for (const cat of CATEGORIES) {
      urls.push(urlTag(`${BASE_SITE}/type/${type}?category=${cat}`, '0.7'));
    }
    for (const country of COUNTRIES) {
      urls.push(urlTag(`${BASE_SITE}/type/${type}?country=${country}`, '0.7'));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
    body: xml,
  };
};
