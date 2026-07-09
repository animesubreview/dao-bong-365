import { Movie, APIResponse, MovieDetailResponse, Episode } from '../types';

const BASE_URL = 'https://phimapi.com';

// Cache ảnh chất lượng cao lấy được từ NguonC theo slug (nếu có), dùng trong getImageUrl.
// Populate cache này ở nơi nào lấy được ảnh đẹp từ NguonC bằng: NguonCImageCache.set(slug, { poster, thumb });
const NguonCImageCache = new Map<string, { poster: string; thumb?: string }>();


// ─── NguonC API ──────────────────────────────────────────────────────────────
const NGUONC_BASE = 'https://phim.nguonc.com/api';

export interface NguonCEpisode {
  name: string;
  slug: string;
  embed: string;
  m3u8?: string;
}

export interface NguonCServer {
  server_name: string;
  items: NguonCEpisode[];
}

export interface NguonCMovieDetail {
  name: string;
  slug: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  time?: string;
  quality?: string;
  lang?: string;
  type?: string;
  status?: string;
  content?: string;
  episode_current?: string;
  episode_total?: string;
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
  actor?: string[];
  director?: string[];
  episodes: NguonCServer[];
}

/**
 * Fetch chi tiết phim từ NguonC theo slug.
 * NguonC đôi khi dùng slug khác KKPhim (ví dụ thêm -2, khác dấu gạch).
 * Thử slug gốc trước, nếu không có thì tìm qua search.
 * Trả về null nếu không tìm thấy hoặc lỗi.
 */
export async function getNguonCDetail(slug: string): Promise<NguonCMovieDetail | null> {
  try {
    // Thử slug gốc trước
    const result = await fetchNguonCBySlug(slug);
    if (result) return result;

    // Thử tìm qua search NguonC bằng tên slug (thay - thành space)
    const keyword = slug.replace(/-/g, ' ');
    const searchRes = await fetch(`${NGUONC_BASE}/films/search?keyword=${encodeURIComponent(keyword)}`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    // NguonC search trả về { items: [...] } hoặc { movies: [...] }
    const searchItems: any[] = searchData?.items || searchData?.movies || searchData?.data?.items || [];
    if (!searchItems.length) return null;

    // Tìm phim có slug gần giống nhất
    const matched = searchItems.find((m: any) => {
      const s: string = m.slug || m.url || '';
      return s === slug || s.startsWith(slug) || slug.startsWith(s);
    }) || searchItems[0];

    if (!matched) return null;
    const matchedSlug = matched.slug || matched.url || '';
    if (!matchedSlug || matchedSlug === slug) return null; // đã thử rồi

    return await fetchNguonCBySlug(matchedSlug);
  } catch {
    return null;
  }
}

async function fetchNguonCBySlug(slug: string): Promise<NguonCMovieDetail | null> {
  try {
    const res = await fetch(`${NGUONC_BASE}/film/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();

    // ── DEBUG: log cấu trúc response để kiểm tra ──────────────────────────
    if (import.meta.env.DEV || (window as any).__NGUONC_DEBUG__) {
      console.log('[NguonC] raw response for', slug, JSON.stringify(data).slice(0, 1000));
    }
    // ──────────────────────────────────────────────────────────────────────

    // NguonC trả về { status, movie: { ... } }
    const movie = data?.movie || data?.data || data;
    if (!movie || typeof movie !== 'object') return null;

    // episodes là array các server, mỗi server có items (các tập)
    const rawEpisodes: any[] = movie?.episodes || data?.episodes || [];

    if (import.meta.env.DEV || (window as any).__NGUONC_DEBUG__) {
      console.log('[NguonC] movie keys:', Object.keys(movie));
      console.log('[NguonC] num servers:', rawEpisodes.length);
      rawEpisodes.forEach((s, i) => {
        console.log(`[NguonC] server[${i}] name="${s.server_name || s.name}" items=${(s.items || s.server_data || []).length}`);
        const firstItem = (s.items || s.server_data || [])[0];
        if (firstItem) console.log(`[NguonC] server[${i}] first item:`, JSON.stringify(firstItem));
      });
    }

    if (!rawEpisodes.length) return null;

    // Kiểm tra xem có phân trang không (total_episodes > số items hiện tại)
    const totalEpisodes: number = movie?.total_episodes || movie?.episode_total || 0;

    // Normalize server list, fetch thêm page nếu cần
    const episodes: NguonCServer[] = await Promise.all(
      rawEpisodes.map(async (s: any) => {
        let items: any[] = s.items || s.server_data || [];

        // Nếu phim series có nhiều tập hơn đã load → fetch thêm các page
        if (totalEpisodes > 0 && items.length > 0 && items.length < totalEpisodes) {
          const perPage = items.length;
          const totalPages = Math.ceil(totalEpisodes / perPage);
          // Fetch tối đa 50 pages (1500 tập) để tránh quá tải
          const maxPages = Math.min(totalPages, 50);
          const pagePromises = [];
          for (let page = 2; page <= maxPages; page++) {
            pagePromises.push(
              fetch(`${NGUONC_BASE}/film/${slug}?page=${page}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
            );
          }
          const pageResults = await Promise.all(pagePromises);
          for (const pr of pageResults) {
            if (!pr) continue;
            const pm = pr?.movie || pr?.data || pr;
            const pe: any[] = pm?.episodes || pr?.episodes || [];
            // Tìm server tương ứng trong page này
            const matchServer = pe.find((ps: any) =>
              (ps.server_name || ps.name) === (s.server_name || s.name)
            ) || pe[0];
            if (matchServer) {
              const pageItems = matchServer.items || matchServer.server_data || [];
              items = [...items, ...pageItems];
            }
          }
        }

        return {
          server_name: s.server_name || s.name || 'Server',
          items: (() => {
            const seen = new Set<string>();
            const deduped: any[] = [];
            for (const ep of items) {
              const epName = (ep.name || ep.title || '').trim();
              if (!epName || seen.has(epName)) continue;
              seen.add(epName);
              deduped.push({
                name: epName,
                slug: ep.slug || epName,
                embed: ep.embed || ep.link_embed || ep.link || '',
                m3u8: ep.m3u8 || ep.link_m3u8 || '',
              });
            }
            return deduped;
          })(),
        };
      })
    );

    const validEpisodes = episodes.filter(s => s.items.length > 0);
    if (!validEpisodes.length) return null;

    const normalizeImg = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `https://phim.nguonc.com/${url.replace(/^\//, '')}`;
    };

    return {
      name: movie?.name || movie?.title || slug,
      slug: movie?.slug || slug,
      origin_name: movie?.origin_name || movie?.original_name || movie?.originName || '',
      thumb_url: normalizeImg(movie?.thumb_url || movie?.thumbUrl || movie?.poster_url || ''),
      poster_url: normalizeImg(movie?.poster_url || movie?.posterUrl || movie?.thumb_url || ''),
      year: Number(movie?.year) || 0,
      time: movie?.time || movie?.duration || '',
      quality: movie?.quality || 'HD',
      lang: movie?.lang || movie?.sub_docquyen || '',
      type: movie?.type || '',
      status: movie?.status || movie?.episode_current || '',
      content: movie?.content || movie?.description || '',
      episode_current: movie?.episode_current || '',
      episode_total: movie?.episode_total ? String(movie.episode_total) : '',
      category: Array.isArray(movie?.category) ? movie.category : [],
      country: Array.isArray(movie?.country) ? movie.country : [],
      actor: Array.isArray(movie?.actor) ? movie.actor : [],
      director: Array.isArray(movie?.director) ? movie.director : [],
      episodes: validEpisodes,
    };
  } catch {
    return null;
  }
}

/**
 * Chuyển đổi NguonCServer → Episode[] (chuẩn KKPhim).
 * Nếu server có quá nhiều tập (> MAX_PER_GROUP), tự tách thành nhiều server con
 * để danh sách tập không bị quá dài và không bị trùng tên hiển thị.
 */
const MAX_PER_GROUP = 100; // nhóm tối đa 100 tập mỗi server

function nguonCServerToEpisode(server: NguonCServer, serverIndex: number): Episode[] {
  const allItems = server.items;
  const serverBaseName = server.server_name;

  // Tạo slug an toàn cho từng tập
  const makeSlug = (ep: NguonCEpisode, epIdx: number, groupIdx: number) => {
    const rawSlug = ep.slug || ep.name || '';
    const normalized = rawSlug
      .toLowerCase()
      .replace(/tập\s*/gi, 'tap-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      || `tap-${epIdx + 1}`;
    // prefix đảm bảo tuyệt đối unique: nc-s{serverIdx}-g{groupIdx}-{slug}
    return `nc-s${serverIndex}-g${groupIdx}-${normalized}`;
  };

  // Nếu số tập vừa đủ → 1 server duy nhất
  if (allItems.length <= MAX_PER_GROUP) {
    return [{
      server_name: `NguonC - ${serverBaseName}`,
      server_data: allItems.map((ep, epIdx) => ({
        name: ep.name,
        slug: makeSlug(ep, epIdx, 0),
        filename: ep.name,
        link_embed: ep.embed,
        link_m3u8: ep.m3u8 || '',
      })),
    }];
  }

  // Nhiều tập → tách thành nhóm
  const groups: Episode[] = [];
  let groupIdx = 0;
  for (let i = 0; i < allItems.length; i += MAX_PER_GROUP) {
    const chunk = allItems.slice(i, i + MAX_PER_GROUP);
    const first = chunk[0].name;
    const last = chunk[chunk.length - 1].name;
    groups.push({
      server_name: `NguonC - ${serverBaseName} (${first}-${last})`,
      server_data: chunk.map((ep, epIdx) => ({
        name: ep.name,
        slug: makeSlug(ep, i + epIdx, groupIdx),
        filename: ep.name,
        link_embed: ep.embed,
        link_m3u8: ep.m3u8 || '',
      })),
    });
    groupIdx++;
  }
  return groups;
}

/**
 * Merge episodes từ NguonC vào episodes gốc (KKPhim).
 *
 * Logic:
 *  - Nếu phim gốc đã có episodes hợp lệ (server_data.length > 0)
 *    → chỉ nối thêm các server NguonC vào cuối (không trùng tên server).
 *  - Nếu phim gốc không có episodes
 *    → dùng toàn bộ episodes từ NguonC.
 *
 * @param mainEpisodes   Episodes từ KKPhim (có thể rỗng)
 * @param nguonCDetail   Kết quả fetch từ NguonC (có thể null)
 */
export function mergeNguonCEpisodes(
  mainEpisodes: Episode[],
  nguonCDetail: NguonCMovieDetail | null
): Episode[] {
  if (!nguonCDetail?.episodes?.length) return mainEpisodes;

  // Flat map: mỗi NguonCServer có thể tạo ra 1 hoặc nhiều Episode (nếu tách nhóm)
  const nguonCConverted: Episode[] = nguonCDetail.episodes
    .filter(s => s.items?.length > 0)
    .flatMap((s, idx) => nguonCServerToEpisode(s, idx));

  if (!nguonCConverted.length) return mainEpisodes;

  const hasMain = mainEpisodes.some(s => s.server_data?.length > 0);
  if (hasMain) {
    // Số tập tối đa từ KKPhim
    const mainMaxEps = Math.max(...mainEpisodes.map(s => s.server_data?.length || 0));

    const existingNames = new Set(mainEpisodes.map(s => s.server_name));
    const newServers = nguonCConverted.filter(s => {
      // Bỏ qua nếu tên đã tồn tại
      if (existingNames.has(s.server_name)) return false;
      // Bỏ qua server NguonC "vô dụng":
      // - Chỉ có 1 tập tên "Full" (phim lẻ nhưng KKPhim đã có series đủ tập)
      // - Số tập NguonC ít hơn 10% so với KKPhim (ví dụ 1 tập vs 1173 tập)
      const ncEpCount = s.server_data?.length || 0;
      if (mainMaxEps > 10 && ncEpCount < mainMaxEps * 0.1) return false;
      return true;
    });
    return [...mainEpisodes, ...newServers];
  }

  return nguonCConverted;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chuyển NguonCMovieDetail → Movie (dùng khi KKPhim không có phim này).
 */
export function nguonCToMovie(detail: NguonCMovieDetail): import('./../../src/types').Movie {
  return {
    _id: `nc-${detail.slug}`,
    name: detail.name,
    origin_name: detail.origin_name || '',
    slug: detail.slug,
    thumb_url: detail.thumb_url || '',
    poster_url: detail.poster_url || detail.thumb_url || '',
    year: detail.year || 0,
    time: detail.time || '',
    quality: detail.quality || 'HD',
    lang: detail.lang || '',
    type: detail.type || '',
    status: detail.status || detail.episode_current || '',
    content: detail.content || '',
    episode_current: detail.episode_current,
    category: detail.category || [],
    country: detail.country || [],
    actor: detail.actor || [],
    director: detail.director || [],
  } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
const OPHIM_BASE = 'https://ophim1.com';
const OPHIM_IMAGE_BASE = 'https://img.ophim.live/uploads/movies/';

export interface OPhimEpisode {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface OPhimServer {
  server_name: string;
  server_data: OPhimEpisode[];
}

export interface OPhimMovieDetail {
  name: string;
  slug: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  content: string;
  type: string;
  status: string;
  episodes: OPhimServer[];
}

/**
 * Fetch chi tiết phim từ OPhim theo slug.
 * Trả về null nếu không tìm thấy hoặc lỗi.
 */
export async function getOPhimDetail(slug: string): Promise<OPhimMovieDetail | null> {
  try {
    // Thử slug gốc trước
    const result = await fetchOPhimBySlug(slug);
    if (result) return result;

    // Thử tìm qua search OPhim
    const keyword = slug.replace(/-/g, ' ');
    const searchRes = await fetch(`${OPHIM_BASE}/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const searchItems: any[] = searchData?.items || [];
    if (!searchItems.length) return null;

    // Tìm phim có slug gần giống nhất
    const matched = searchItems.find((m: any) => m.slug === slug) || searchItems[0];
    if (!matched) return null;

    const matchedSlug = matched.slug || '';
    if (!matchedSlug || matchedSlug === slug) return null; // đã thử rồi

    return await fetchOPhimBySlug(matchedSlug);
  } catch {
    return null;
  }
}

async function fetchOPhimBySlug(slug: string): Promise<OPhimMovieDetail | null> {
  try {
    const res = await fetch(`${OPHIM_BASE}/phim/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();

    if (import.meta.env.DEV || (window as any).__OPHIM_DEBUG__) {
      console.log('[OPhim] raw response for', slug, JSON.stringify(data).slice(0, 500));
    }

    // OPhim trả về { status, movie: { ... }, episodes: [...] }
    if (!data?.movie) return null;

    const movie = data.movie;
    const rawEpisodes: any[] = data?.episodes || [];

    if (!rawEpisodes.length) return null;

    const episodes: OPhimServer[] = rawEpisodes
      .map((s: any) => {
        const items: OPhimEpisode[] = (s.server_data || []).map((ep: any) => ({
          name: ep.name || ep.filename || '',
          slug: ep.slug || ep.name || '',
          filename: ep.filename || ep.name || '',
          link_embed: ep.link_embed || '',
          link_m3u8: ep.link_m3u8 || '',
        }));
        return {
          server_name: s.server_name || 'OPhim Server',
          server_data: items.filter(ep => ep.name),
        };
      })
      .filter(s => s.server_data.length > 0);

    if (!episodes.length) return null;

    // Normalize image URLs — OPhim trả về filename relative
    const normalizeImg = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${OPHIM_IMAGE_BASE}${url}`;
    };

    return {
      name: movie.name || slug,
      slug: movie.slug || slug,
      thumb_url: normalizeImg(movie.thumb_url || ''),
      poster_url: normalizeImg(movie.poster_url || ''),
      year: movie.year || 0,
      content: movie.content || '',
      type: movie.type || '',
      status: movie.status || '',
      episodes,
    };
  } catch {
    return null;
  }
}

/**
 * Merge episodes từ OPhim vào episodes gốc.
 *
 * Logic:
 *  - Nếu phim gốc đã có episodes hợp lệ → chỉ nối thêm các server OPhim vào cuối (không trùng tên).
 *  - Nếu phim gốc không có episodes → dùng toàn bộ episodes từ OPhim.
 */
export function mergeOPhimEpisodes(
  mainEpisodes: Episode[],
  ophimDetail: OPhimMovieDetail | null
): Episode[] {
  if (!ophimDetail?.episodes?.length) return mainEpisodes;

  const ophimConverted: Episode[] = ophimDetail.episodes.map((s, idx) => ({
    server_name: `OPhim - ${s.server_name}`,
    server_data: s.server_data.map((ep, epIdx) => ({
      name: ep.name,
      slug: `op-s${idx}-${ep.slug || ep.name.toLowerCase().replace(/\s+/g, '-') || `tap-${epIdx + 1}`}`,
      filename: ep.filename,
      link_embed: ep.link_embed,
      link_m3u8: ep.link_m3u8,
    })),
  }));

  const hasMain = mainEpisodes.some(s => s.server_data?.length > 0);
  if (hasMain) {
    const mainMaxEps = Math.max(...mainEpisodes.map(s => s.server_data?.length || 0));
    const existingNames = new Set(mainEpisodes.map(s => s.server_name));

    const newServers = ophimConverted.filter(s => {
      if (existingNames.has(s.server_name)) return false;
      // Bỏ qua server OPhim ít tập hơn nhiều so với main
      const opEpCount = s.server_data?.length || 0;
      if (mainMaxEps > 10 && opEpCount < mainMaxEps * 0.1) return false;
      return true;
    });
    return [...mainEpisodes, ...newServers];
  }

  return ophimConverted;
}

// ─────────────────────────────────────────────────────────────────────────────

export const movieApi = {
  getNewUpdates: async (page: number = 1): Promise<APIResponse<Movie>> => {
    const response = await fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return response.json();
  },

  /**
   * Lấy "lịch chiếu" theo từng ngày — dựa trên field modified.time (thời gian
   * KKPhim cập nhật phim/tập mới). Gom nhiều trang phim-moi-cap-nhat lại,
   * nhóm theo ngày dương lịch (yyyy-mm-dd) của modified.time.
   * Trả về mảng các ngày (mới nhất trước), mỗi ngày kèm danh sách phim.
   */
  getScheduleByDate: async (maxPages: number = 4): Promise<{ date: string; movies: Movie[] }[]> => {
    const allMovies: Movie[] = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const res = await fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
        const data = await res.json();
        const items: Movie[] = data?.items || [];
        if (items.length === 0) break;
        allMovies.push(...items);
      } catch {
        break;
      }
    }

    const byDate = new Map<string, Movie[]>();
    for (const movie of allMovies) {
      const iso = movie.modified?.time;
      if (!iso) continue;
      const dateKey = iso.slice(0, 10); // yyyy-mm-dd
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(movie);
    }

    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // ngày mới nhất trước
      .map(([date, movies]) => ({ date, movies }));
  },

  getMovieDetail: async (slug: string): Promise<MovieDetailResponse> => {
    const response = await fetch(`${BASE_URL}/phim/${slug}`);
    return response.json();
  },

  searchMovies: async (keyword: string, page: number = 1, limit: number = 20): Promise<APIResponse<Movie>> => {
    const response = await fetch(`${BASE_URL}/v1/api/tim-kiem?keyword=${keyword}&page=${page}&limit=${limit}`);
    const data = await response.json();
    // The search API structure is slightly different in items
    return {
      status: data.status,
      items: data.data.items,
      pagination: data.data.params.pagination
    };
  },

  getMoviesByType: async (type: string, page: number = 1, limit: number = 20): Promise<APIResponse<Movie>> => {
    const response = await fetch(`${BASE_URL}/v1/api/danh-sach/${type}?page=${page}&limit=${limit}`);
    const data = await response.json();
    return {
      status: data.status,
      items: data.data.items,
      pagination: data.data.params.pagination
    };
  },

  // Filter phim nâng cao - thể loại, quốc gia, năm, sắp xếp
  filterMovies: async (params: {
    type?: string;
    category?: string;
    country?: string;
    year?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse<Movie>> => {
    const { type = 'phim-bo', category = '', country = '', year = '', sort = 'modified.time', page = 1, limit = 24 } = params;
    let url = `${BASE_URL}/v1/api/danh-sach/${type}?page=${page}&limit=${limit}&sort_field=${sort}`;
    if (category) url += `&category=${category}`;
    if (country) url += `&country=${country}`;
    if (year) url += `&year=${year}`;
    const response = await fetch(url);
    const data = await response.json();
    return {
      status: data.status,
      items: data.data?.items || [],
      pagination: data.data?.params?.pagination || { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 }
    };
  },

  getImageUrl: (path: any) => {
    if (!path) return '';

    // Chuẩn hóa kiểu dữ liệu đầu vào nếu không phải string
    if (typeof path !== 'string') {
      try {
        if (Array.isArray(path) && path.length > 0) {
          path = path[0];
        } else if (typeof path === 'object') {
          path = path.url || path.link || String(path);
        } else {
          path = String(path);
        }
      } catch (e) {
        return '';
      }
    }

    if (typeof path !== 'string' || !path) return '';

    // Trả về trực tiếp nếu là link đầy đủ
    if (path.startsWith('http')) return path;
    if (path.startsWith('//')) return `https:${path}`;

    // Kiểm tra xem đường dẫn/slug này có sẵn ảnh đẹp từ Nguồn C trong bộ đệm không
    const cachedImages = NguonCImageCache.get(path);
    if (cachedImages) return cachedImages.poster;

    // Điều hướng chính xác tên miền CDN dựa trên cấu trúc đường dẫn
    if (path.includes('ophim') || path.includes('uploads/movies')) {
      // Sửa lỗi các domain ảnh của OPhim bị chết bằng cách chuyển sang img.ophim.live ổn định hơn
      return `https://img.ophim.live/uploads/movies/${path.replace(/.*uploads\/movies\//, '')}`;
    }

    // Mặc định đối với KKPhim/OPhim khác
    return `https://phimimg.com/uploads/movies/${path.replace(/.*uploads\/movies\//, '')}`;
  },

  // Lấy ảnh chất lượng cao (poster/backdrop) trực tiếp từ TMDB qua endpoint
  // GET https://phimapi.com/v1/api/phim/{slug}/images
  // Trả về URL đầy đủ đã ghép base size + file_path, sẵn sàng dùng trong <img src>
  getMovieImagesV1: async (slug: string): Promise<{ posters: string[]; backdrops: string[] }> => {
    try {
      const res = await fetch(`https://phimapi.com/v1/api/phim/${slug}/images`);
      const json = await res.json();
      const data = json?.data;
      if (!data) return { posters: [], backdrops: [] };

      const posterBase: string = data.image_sizes?.poster?.w500 || 'https://image.tmdb.org/t/p/w500';
      const backdropBase: string = data.image_sizes?.backdrop?.w1280 || 'https://image.tmdb.org/t/p/w1280';

      const images: Array<{ type: string; file_path: string }> = data.images || [];
      const posters = images
        .filter((img) => img.type === 'poster' && img.file_path)
        .map((img) => `${posterBase}${img.file_path}`);
      const backdrops = images
        .filter((img) => img.type === 'backdrop' && img.file_path)
        .map((img) => `${backdropBase}${img.file_path}`);

      return { posters, backdrops };
    } catch (err) {
      console.error('getMovieImagesV1 error:', err);
      return { posters: [], backdrops: [] };
    }
  },

  // Normalize lang field — KKPhim sometimes returns garbage strings
  cleanLang: (lang: string): string => {
    if (!lang) return '';
    const l = lang.toLowerCase().trim();
    if (l.includes('vietsub') || l.includes('phụ đề') || l.includes('sub')) return 'Vietsub';
    if (l.includes('lồng tiếng') || l.includes('long tieng')) return 'Lồng Tiếng';
    if (l.includes('thuyết minh') || l.includes('thuyet minh')) return 'Thuyết Minh';
    // Return empty if garbage (too long or not a known lang)
    const known = ['vietsub','lồng tiếng','thuyết minh','nguyên bản','engsub','raw','full'];
    if (known.some(v => l.includes(v))) return lang;
    if (lang.length > 15) return '';
    return lang;
  },

  /**
   * Tìm kiếm phim trên NguonC API.
   * Trả về mảng Movie (đã normalize sang cùng interface với KKPhim).
   * Kết quả được đánh dấu _id bắt đầu bằng "nc-" để phân biệt nguồn.
   */
  searchNguonC: async (keyword: string): Promise<Movie[]> => {
    try {
      const res = await fetch(`${NGUONC_BASE}/films/search?keyword=${encodeURIComponent(keyword)}`);
      if (!res.ok) return [];
      const data = await res.json();
      const items: any[] = data?.items || data?.movies || data?.data?.items || [];
      if (!items.length) return [];

      return items.map((m: any): Movie => {
        // NguonC image: nếu thumb_url có http dùng trực tiếp, không thì prepend base
        const img = (url: string) => {
          if (!url) return '';
          if (url.startsWith('http')) return url;
          return `https://phim.nguonc.com/${url.replace(/^\//, '')}`;
        };
        const slugVal: string = m.slug || m.url || '';
        return {
          _id: `nc-${slugVal || m.name}`,
          name: m.name || '',
          origin_name: m.original_name || m.originName || m.origin_name || '',
          slug: slugVal,
          thumb_url: img(m.thumb_url || m.thumbUrl || m.poster_url || m.image || ''),
          poster_url: img(m.poster_url || m.posterUrl || m.thumb_url || m.image || ''),
          year: m.year || 0,
          time: m.time || m.episode_total || '',
          quality: m.quality || 'HD',
          lang: m.lang || m.sub_docquyen || '',
          type: m.type || m.category_name || '',
          status: m.status || m.episode_current || '',
          content: m.content || m.description || '',
          category: Array.isArray(m.category) ? m.category : [],
          country: Array.isArray(m.country) ? m.country : [],
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Tìm kiếm phim kết hợp: song song KKPhim + NguonC.
   * Các phim trùng slug (NguonC trùng với KKPhim) sẽ bị loại bỏ khỏi NguonC.
   * NguonC items được nối vào sau kết quả KKPhim.
   */
  searchMoviesCombined: async (keyword: string, page: number = 1, limit: number = 20): Promise<{
    items: Movie[];
    pagination: APIResponse<Movie>['pagination'];
    nguoncCount: number;
  }> => {
    const [kkRes, ncItems] = await Promise.allSettled([
      (async () => {
        const response = await fetch(`${BASE_URL}/v1/api/tim-kiem?keyword=${keyword}&page=${page}&limit=${limit}`);
        const data = await response.json();
        return {
          status: data.status,
          items: (data.data?.items || []) as Movie[],
          pagination: data.data?.params?.pagination as APIResponse<Movie>['pagination'],
        };
      })(),
      movieApi.searchNguonC(keyword),
    ]);

    const kkData = kkRes.status === 'fulfilled' ? kkRes.value : { items: [] as Movie[], pagination: null };
    const nguonCRaw: Movie[] = ncItems.status === 'fulfilled' ? ncItems.value : [];

    const kkSlugs = new Set((kkData.items || []).map((m: Movie) => m.slug));
    // Lọc NguonC: chỉ giữ phim chưa có trong KKPhim
    const nguonCFiltered = nguonCRaw.filter(m => m.slug && !kkSlugs.has(m.slug));

    const combined = [...(kkData.items || []), ...nguonCFiltered];

    return {
      items: combined,
      pagination: kkData.pagination || {
        totalItems: combined.length,
        totalItemsPerPage: limit,
        currentPage: page,
        totalPages: 1,
      },
      nguoncCount: nguonCFiltered.length,
    };
  },

  cleanServerName: (name: string) => {
    // NguonC servers đã được prefix "NguonC - " từ trước → giữ nguyên, chỉ làm đẹp
    if (name.startsWith('NguonC - ')) {
      const sub = name.slice('NguonC - '.length).trim();
      const subClean = sub.replace(/#Hà Nội\s*/gi, '').replace(/#Sài Gòn\s*/gi, '').replace(/#/g, '').trim();
      return `NguonC | ${subClean.toUpperCase() || 'SERVER'}`;
    }

    // OPhim servers đã được prefix "OPhim - " từ trước → giữ nguyên, chỉ làm đẹp
    if (name.startsWith('OPhim - ')) {
      const sub = name.slice('OPhim - '.length).trim();
      const subClean = sub.replace(/#/g, '').trim();
      return `OPhim | ${subClean.toUpperCase() || 'SERVER'}`;
    }

    // KKPhim servers — xóa prefix thừa rồi gắn nhãn KKPhim
    let cleaned = name.replace(/#Hà Nội\s*/gi, '')
                      .replace(/#Sài Gòn\s*/gi, '')
                      .replace(/#/g, '')
                      .trim();

    if (cleaned.toLowerCase().includes('vietsub')) return 'KKPhim | VIETSUB';
    if (cleaned.toLowerCase().includes('thuyết minh') || cleaned.toLowerCase().includes('lồng tiếng')) return 'KKPhim | THUYẾT MINH';

    return `KKPhim | ${cleaned.toUpperCase() || 'SERVER'}`;
  }
};
