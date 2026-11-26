// Đa ngôn ngữ nhẹ: lưu lựa chọn trong localStorage, chia sẻ giữa mọi component. Mặc định Tiếng Việt.
import { useEffect, useState } from 'react';
import { setTranslateCookie } from './translate';

export type Lang = 'vi' | 'en' | 'ko' | 'ja' | 'zh' | 'es';
export const LANGS: { code: Lang; name: string; tag: string; short: string }[] = [
  { code: 'vi', name: 'Tiếng Việt', tag: 'vi', short: 'VI' },
  { code: 'en', name: 'English', tag: 'en', short: 'EN' },
  { code: 'ko', name: '한국어', tag: 'ko', short: 'KO' },
  { code: 'ja', name: '日本語', tag: 'ja', short: 'JA' },
  { code: 'zh', name: '简体中文', tag: 'zh-Hans', short: 'ZH' },
  { code: 'es', name: 'Español', tag: 'es', short: 'ES' },
];

const KEY = 'dp_lang';
const D: Record<string, Record<Lang, string>> = {
  home:      { vi: 'Trang chủ', en: 'Home', ko: '홈', ja: 'ホーム', zh: '首页', es: 'Inicio' },
  series:    { vi: 'Phim Bộ', en: 'TV Series', ko: '시리즈', ja: 'ドラマ', zh: '剧集', es: 'Series' },
  movies:    { vi: 'Phim Lẻ', en: 'Movies', ko: '영화', ja: '映画', zh: '电影', es: 'Películas' },
  anime:     { vi: 'Hoạt Hình', en: 'Animation', ko: '애니메이션', ja: 'アニメ', zh: '动画', es: 'Animación' },
  cinema:    { vi: 'Chiếu Rạp', en: 'In Theaters', ko: '극장 개봉', ja: '劇場公開', zh: '院线', es: 'En cines' },
  tv:        { vi: 'TV Trực Tuyến', en: 'Live TV', ko: '실시간 TV', ja: 'ライブTV', zh: '电视直播', es: 'TV en vivo' },
  bilingual: { vi: 'Song Ngữ', en: 'Bilingual', ko: '이중 자막', ja: 'バイリンガル', zh: '双语', es: 'Bilingüe' },
  genres:    { vi: 'Thể loại', en: 'Genres', ko: '장르', ja: 'ジャンル', zh: '类型', es: 'Géneros' },
  countries: { vi: 'Quốc gia', en: 'Countries', ko: '국가', ja: '国', zh: '国家/地区', es: 'Países' },
  searchPh:  { vi: 'Tìm phim, diễn viên...', en: 'Search movies, actors...', ko: '영화, 배우 검색...', ja: '作品・俳優を検索...', zh: '搜索影片、演员...', es: 'Buscar películas, actores...' },
  acc_open:  { vi: 'Mở menu tài khoản', en: 'Open account menu', ko: '계정 메뉴 열기', ja: 'アカウントメニューを開く', zh: '打开账户菜单', es: 'Abrir menú de cuenta' },
  acc_profile: { vi: 'Hồ sơ', en: 'Profile', ko: '프로필', ja: 'プロフィール', zh: '个人资料', es: 'Perfil' },
  acc_edit:  { vi: 'Chỉnh sửa hồ sơ', en: 'Edit profile', ko: '프로필 편집', ja: 'プロフィール編集', zh: '编辑资料', es: 'Editar perfil' },
  acc_history: { vi: 'Lịch sử xem', en: 'Watch history', ko: '시청 기록', ja: '視聴履歴', zh: '观看历史', es: 'Historial' },
  acc_fav:   { vi: 'Yêu thích', en: 'Favorites', ko: '즐겨찾기', ja: 'お気に入り', zh: '收藏', es: 'Favoritos' },
  acc_topup: { vi: 'Nạp tiền', en: 'Top up', ko: '충전', ja: 'チャージ', zh: '充值', es: 'Recargar' },
  acc_vip:   { vi: 'Mua VIP', en: 'Get VIP', ko: 'VIP 구매', ja: 'VIPを購入', zh: '购买VIP', es: 'Comprar VIP' },
  acc_logout: { vi: 'Đăng xuất', en: 'Log out', ko: '로그아웃', ja: 'ログアウト', zh: '退出登录', es: 'Cerrar sesión' },
  lang_label: { vi: 'Ngôn ngữ', en: 'Language', ko: '언어', ja: '言語', zh: '语言', es: 'Idioma' },
  lang_changed: { vi: 'Ngôn ngữ', en: 'Language', ko: '언어', ja: '言語', zh: '语言', es: 'Idioma' },
};

export type TKey = keyof typeof D;

let current: Lang = (() => {
  try { const v = localStorage.getItem(KEY) as Lang | null; if (v && LANGS.some(l => l.code === v)) return v; } catch {}
  return 'vi';
})();
try { document.documentElement.lang = LANGS.find(l => l.code === current)!.tag; } catch {}

export const getLang = () => current;
export function setLang(l: Lang) {
  if (l === current) return;
  current = l;
  try { localStorage.setItem(KEY, l); } catch {}
  try { document.documentElement.lang = LANGS.find(x => x.code === l)!.tag; } catch {}
  window.dispatchEvent(new Event('dp-lang'));
  // Dịch cả trang: ghi cookie rồi tải lại (chờ chút để hiệu ứng nút chạy xong)
  setTranslateCookie(l);
  setTimeout(() => location.reload(), 450);
}
export const tr = (key: TKey, lang: Lang = current) => D[key]?.[lang] ?? D[key]?.vi ?? String(key);

/** Hook: render lại khi đổi ngôn ngữ. Dùng: const { t } = useLang(); t('home') */
export function useLang() {
  const [lang, setL] = useState<Lang>(current);
  useEffect(() => {
    const on = () => setL(current);
    window.addEventListener('dp-lang', on);
    return () => window.removeEventListener('dp-lang', on);
  }, []);
  return { lang, t: (k: TKey) => tr(k, lang) };
}
