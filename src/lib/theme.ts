// Chế độ ngày / đêm. Mặc định: ĐÊM (giao diện gốc). Lưu lựa chọn trong localStorage.
export type Theme = 'dark' | 'light';
const KEY = 'dp_theme';

export function getTheme(): Theme {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

export function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === 'light') el.setAttribute('data-theme', 'light'); else el.removeAttribute('data-theme');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f2ee' : '#22c55e');
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch {}
  applyTheme(t);
  window.dispatchEvent(new Event('dp-theme'));
}
