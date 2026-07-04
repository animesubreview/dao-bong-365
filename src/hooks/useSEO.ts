/**
 * useSEO — Hook cập nhật động <title>, meta description, OG tags,
 * Twitter Card và JSON-LD Schema cho từng trang.
 *
 * ── Tối ưu SEO cho Google tìm kiếm tên phim ──
 *   - Title format: "Tên Phim Vietsub HD (2026) | Tên Gốc - Đảo Phim"
 *   - Description có keyword tên phim, năm, vietsub
 *   - JSON-LD schema Movie/TVSeries đầy đủ (tên, diễn viên, đạo diễn, thể loại)
 *   - BreadcrumbList cho rich snippet
 */

import { useEffect } from 'react';

const SITE_NAME  = 'Đảo Phim';
const SITE_URL   = 'https://daophim.online';
const DEFAULT_IMG = 'https://sf-static.upanhlaylink.com/img/image_2026051206bab16347f075d07864efb55a5224ea.jpg';

interface SEOMovie {
  name: string;
  origin_name?: string;
  year?: number | string;
  quality?: string;
  lang?: string;
  content?: string;
  thumb_url?: string;
  poster_url?: string;
  category?: Array<{ name: string }>;
  country?: Array<{ name: string }>;
  director?: string[] | string;
  actor?: string[];
  time?: string;
  episode_current?: string;
  episode_total?: string;
  slug?: string;
  type?: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'movie';
  movie?: SEOMovie | null;
  noIndex?: boolean;
}

function setMeta(name: string, content: string, isProperty = false) {
  if (!content) return;
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLD(data: object) {
  const id = 'seo-jsonld-dynamic';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLD() {
  const el = document.getElementById('seo-jsonld-dynamic');
  if (el) el.remove();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function useSEO({ title, description, image, url, type = 'website', movie, noIndex }: SEOProps) {
  useEffect(() => {
    // ── Xây dựng title tối ưu cho keyword tên phim ─────────────────
    // Format: "Shades The Series Vietsub HD (2026) | Shades - Đảo Phim"
    // Mục tiêu: Google search "shades the series vietsub" → top
    let pageTitle: string;
    if (movie) {
      const isTV = movie.type === 'series' || (movie.episode_total && movie.episode_total !== '1');
      const year = movie.year ? ` (${movie.year})` : '';
      const quality = movie.quality ? ` ${movie.quality}` : ' HD';
      const lang = (movie.lang?.toLowerCase().includes('vietsub') || !movie.lang)
        ? ' Vietsub' : ` ${movie.lang}`;
      const epInfo = isTV && movie.episode_current
        ? ` - Tập ${movie.episode_current}` : '';
      const originPart = movie.origin_name && movie.origin_name !== movie.name
        ? ` | ${movie.origin_name}` : '';
      // "Shades The Series Vietsub HD (2026) - Tập 8 | Shades - Đảo Phim"
      pageTitle = `${movie.name}${lang}${quality}${year}${epInfo}${originPart} - ${SITE_NAME}`;
    } else if (title) {
      pageTitle = `${title} | ${SITE_NAME}`;
    } else {
      pageTitle = `${SITE_NAME} - Xem Phim Miễn Phí | Phim Hay Cả Đảo`;
    }

    // ── Mô tả: phải có tên phim, tên gốc, năm, keyword vietsub ─────
    let pageDesc: string;
    if (movie) {
      const rawContent = movie.content ? stripHtml(movie.content).slice(0, 150) : '';
      const genres = (movie.category || []).slice(0, 3).map(c => c.name).join(', ');
      const originStr = movie.origin_name && movie.origin_name !== movie.name
        ? ` (${movie.origin_name})` : '';
      const yearStr = movie.year ? ` năm ${movie.year}` : '';
      const genreStr = genres ? ` - ${genres}` : '';
      pageDesc = `Xem ${movie.name}${originStr}${yearStr} Vietsub HD miễn phí tại ${SITE_NAME}${genreStr}. ${rawContent}`.slice(0, 320);
    } else {
      pageDesc = description ||
        'Đảo Phim - Xem phim online miễn phí chất lượng HD. Phim bộ, phim lẻ, anime, phim chiếu rạp Vietsub, thuyết minh cập nhật hàng ngày.';
    }

    const pageImg  = image || DEFAULT_IMG;
    const pageUrl  = url ? `${SITE_URL}${url}` : SITE_URL;
    const ogType   = type === 'movie' ? 'video.movie'
                   : type === 'video.tv_show' ? 'video.tv_show'
                   : 'website';

    // ── Title ──────────────────────────────────────────────────────
    document.title = pageTitle;

    // ── Basic SEO ──────────────────────────────────────────────────
    setMeta('description', pageDesc);
    setMeta('robots', noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // ── Canonical ──────────────────────────────────────────────────
    setCanonical(pageUrl);

    // ── Open Graph ─────────────────────────────────────────────────
    setMeta('og:type',        ogType,     true);
    setMeta('og:site_name',   SITE_NAME,  true);
    setMeta('og:title',       pageTitle,  true);
    setMeta('og:description', pageDesc,   true);
    setMeta('og:url',         pageUrl,    true);
    setMeta('og:image',       pageImg,    true);
    setMeta('og:locale',      'vi_VN',    true);

    // ── Twitter Card ───────────────────────────────────────────────
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       pageTitle);
    setMeta('twitter:description', pageDesc.slice(0, 200));
    setMeta('twitter:image',       pageImg);

    // ── JSON-LD Schema ─────────────────────────────────────────────
    if (movie) {
      const isTV = movie.type === 'series' || (movie.episode_total && movie.episode_total !== '1');
      const genres    = (movie.category || []).map(c => c.name);
      const countries = (movie.country || []).map(c => c.name);
      const directors = Array.isArray(movie.director)
        ? movie.director
        : (movie.director ? [movie.director] : []);

      const schema: any = {
        '@context': 'https://schema.org',
        '@type': isTV ? 'TVSeries' : 'Movie',
        name: movie.name,
        alternateName: movie.origin_name,
        description: movie.content ? stripHtml(movie.content).slice(0, 500) : pageDesc,
        image: pageImg,
        url: pageUrl,
        datePublished: movie.year?.toString(),
        inLanguage: 'vi',
        genre: genres,
        countryOfOrigin: countries.map(c => ({ '@type': 'Country', name: c })),
        ...(directors.length > 0 && {
          director: directors.map(d => ({ '@type': 'Person', name: d })),
        }),
        ...(movie.actor?.length && {
          actor: movie.actor.slice(0, 10).map(a => ({ '@type': 'Person', name: a })),
        }),
        // Thêm numberOfEpisodes cho TV series
        ...(isTV && movie.episode_total && {
          numberOfEpisodes: parseInt(movie.episode_total) || undefined,
        }),
        potentialAction: {
          '@type': 'WatchAction',
          target: pageUrl,
        },
      };

      // BreadcrumbList → Google hiện breadcrumb trong kết quả tìm kiếm
      const typeSlug = isTV ? 'phim-bo' : 'phim-le';
      const typeLabel = isTV ? 'Phim Bộ' : 'Phim Lẻ';
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: typeLabel,
            item: `${SITE_URL}/type/${typeSlug}` },
          { '@type': 'ListItem', position: 3, name: movie.name, item: pageUrl },
        ],
      };

      setJsonLD({ '@graph': [schema, breadcrumb] });
    } else {
      removeJsonLD();
    }

    // ── Cleanup khi unmount ────────────────────────────────────────
    return () => {
      document.title = `${SITE_NAME} - Xem Phim Miễn Phí | Phim Hay Cả Đảo`;
      setCanonical(`${SITE_URL}/`);
    };
  }, [title, description, image, url, type, movie, noIndex]);
}
