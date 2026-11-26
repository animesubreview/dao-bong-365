// Dịch toàn bộ trang bằng Google Website Translator (miễn phí) khi chọn ngôn ngữ khác Tiếng Việt.
// Cách làm: ghi cookie `googtrans=/vi/<mã>` rồi tải lại trang; script chỉ được nạp khi cần (người dùng Tiếng Việt không tải gì thêm).
import type { Lang } from './i18n';

const CODE: Record<Lang, string> = { vi: 'vi', en: 'en', ko: 'ko', ja: 'ja', zh: 'zh-CN', es: 'es' };

export function setTranslateCookie(lang: Lang) {
  const host = location.hostname;
  const expire = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const set = (v: string, exp?: string) => {
    const e = exp ? `; expires=${exp}` : '';
    document.cookie = `googtrans=${v}; path=/${e}`;
    document.cookie = `googtrans=${v}; path=/; domain=${host}${e}`;
    document.cookie = `googtrans=${v}; path=/; domain=.${host.replace(/^www\./, '')}${e}`;
  };
  if (lang === 'vi') set('', expire);
  else set(`/vi/${CODE[lang]}`);
}

export function initPageTranslation(lang: Lang) {
  if (lang === 'vi' || document.getElementById('google_translate_element')) return;

  // Google chèn thẻ <font> vào chữ → React có thể báo lỗi khi gỡ/chèn node. Hai đoạn vá chuẩn này tránh crash.
  const rc = Node.prototype.removeChild;
  (Node.prototype as any).removeChild = function (child: Node) { if (child.parentNode !== this) return child; return rc.call(this, child) as any; };
  const ib = Node.prototype.insertBefore;
  (Node.prototype as any).insertBefore = function (n: Node, ref: Node | null) { if (ref && ref.parentNode !== this) return n; return ib.call(this, n, ref) as any; };

  const box = document.createElement('div');
  box.id = 'google_translate_element';
  box.style.display = 'none';
  box.setAttribute('translate', 'no');
  document.body.appendChild(box);

  const style = document.createElement('style');
  style.textContent = `.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame{display:none!important}body{top:0!important}.goog-text-highlight{background:none!important;box-shadow:none!important}`;
  document.head.appendChild(style);

  (window as any).googleTranslateElementInit = () => {
    const g = (window as any).google;
    new g.translate.TranslateElement({ pageLanguage: 'vi', includedLanguages: 'en,ko,ja,zh-CN,es', autoDisplay: false }, 'google_translate_element');
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}
