// Gộp 3 hàm nhỏ (sitemap thể loại, sitemap ảnh, RSS) vào MỘT hàm để không vượt giới hạn 12 Serverless Functions
// của Vercel gói Hobby. Mã gốc nằm ngoài thư mục api (server-lib/feeds/) nên không bị Vercel tính là hàm riêng.
//   /sitemap-categories.xml → /api/seo-feeds?t=categories
//   /sitemap-images.xml     → /api/seo-feeds?t=images
//   /rss.xml                → /api/seo-feeds?t=rss
import categories from '../server-lib/feeds/sitemap-categories.js';
import images from '../server-lib/feeds/sitemap-images.js';
import rss from '../server-lib/feeds/rss.js';

export default function handler(req, res) {
  const t = String((req.query && req.query.t) || '');
  if (t === 'categories') return categories(req, res);
  if (t === 'images') return images(req, res);
  if (t === 'rss') return rss(req, res);
  res.status(404).send('Not found');
}
