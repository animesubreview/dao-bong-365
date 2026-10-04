/**
 * tvDetect.ts
 * Phát hiện Samsung Smart TV (Tizen) và các Smart TV khác.
 * Cung cấp: CSS tối ưu TV, điều hướng remote, focus management.
 */

export interface TVInfo {
  isTV: boolean;
  isSamsung: boolean;
  isLG: boolean;
  isAndroidTV: boolean;
  platform: string;
}

/** Phát hiện loại TV qua UserAgent */
export function detectTV(): TVInfo {
  const ua = (navigator.userAgent || '').toLowerCase();

  const isSamsung =
    ua.includes('tizen') ||
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    (ua.includes('samsung') && ua.includes('tv'));

  const isLG =
    ua.includes('webos') ||
    ua.includes('netcast');

  const isAndroidTV =
    ua.includes('googletv') ||
    ua.includes('android tv') ||
    ua.includes('chromecast');

  const isOther =
    ua.includes('hbbtv') ||
    ua.includes('appletv') ||
    ua.includes('tv safari');

  const isTV = isSamsung || isLG || isAndroidTV || isOther;

  let platform = 'Unknown TV';
  if (isSamsung)     platform = 'Samsung Smart TV (Tizen)';
  else if (isLG)     platform = 'LG Smart TV (WebOS)';
  else if (isAndroidTV) platform = 'Android TV / Google TV';
  else if (isOther)  platform = 'Smart TV';

  return { isTV, isSamsung, isLG, isAndroidTV, platform };
}

/**
 * Inject CSS tối ưu cho màn hình TV lớn (55"–75", 1080p/4K)
 * - Font lớn hơn để đọc từ xa 2–3m
 * - Focus ring xanh rõ nét cho remote control
 * - Ẩn cursor (TV không có chuột)
 * - Tăng kích thước touch target
 */
export function injectTVStyles(): void {
  if (document.getElementById('daophim-tv-styles')) return;

  const style = document.createElement('style');
  style.id = 'daophim-tv-styles';
  style.textContent = `
    /* ═══════════════════════════════════════════
       ĐẢOPHIM — Samsung Smart TV Optimizations
       ═══════════════════════════════════════════ */

    /* Ẩn cursor trên TV */
    *, *::before, *::after { cursor: none !important; }

    /* Font lớn hơn cho TV 4K */
    html { font-size: 18px !important; }

    /* Focus ring nổi bật cho remote control */
    *:focus {
      outline: 3px solid #22c55e !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 0 6px rgba(34,197,94,0.2) !important;
    }
    *:focus:not(:focus-visible) { outline: none !important; box-shadow: none !important; }
    *:focus-visible {
      outline: 3px solid #22c55e !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 0 6px rgba(34,197,94,0.2) !important;
    }

    /* Nút & link lớn hơn cho remote */
    button, a, [role="button"] {
      min-height: 52px;
      min-width: 52px;
    }

    /* Card phim scale khi focus */
    a:focus-visible img,
    button:focus-visible img {
      transform: scale(1.06);
      transition: transform 0.15s ease;
    }

    /* Player fullscreen tối ưu */
    .daophim-tv-player {
      position: fixed !important;
      inset: 0 !important;
      z-index: 9999 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #000 !important;
    }
    .daophim-tv-player iframe {
      width: 100% !important;
      height: 100% !important;
      border: none !important;
    }

    /* Thanh tập phim lớn hơn trên TV */
    .tv-ep-btn {
      font-size: 1.1rem !important;
      padding: 12px 18px !important;
    }

    /* Scrollbar ẩn trên TV */
    ::-webkit-scrollbar { display: none !important; }
    * { scrollbar-width: none !important; }

    /* Tăng contrast text */
    p, span, div { color: inherit; }

    /* TV banner indicator */
    .tv-mode-badge {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(34,197,94,0.15);
      border: 1px solid rgba(34,197,94,0.4);
      color: #4ade80;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 100px;
      letter-spacing: 0.08em;
      z-index: 99999;
      pointer-events: none;
      backdrop-filter: blur(8px);
    }
  `;

  document.head.appendChild(style);
}

// ─── Selector các phần tử có thể focus ───────────────────────────────────────
const FOCUSABLE_SEL =
  'a[href]:not([disabled]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Lấy tất cả phần tử focusable đang hiển thị */
function getFocusable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  });
}

/**
 * Điều hướng focus theo hướng remote (thuật toán nearest-neighbor)
 * - Ưu tiên phần tử gần nhất theo hướng bấm
 * - Penalty nếu lệch nhiều vuông góc với hướng
 */
export function navigateFocus(dir: 'up' | 'down' | 'left' | 'right'): void {
  const all = getFocusable();
  const current = document.activeElement as HTMLElement | null;

  if (!current || !all.includes(current)) {
    all[0]?.focus();
    return;
  }

  const cr = current.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const cy = cr.top + cr.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of all) {
    if (el === current) continue;
    const r  = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top  + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    // Chỉ xét phần tử đúng hướng
    const inDir =
      (dir === 'right' && dx > 4)  ||
      (dir === 'left'  && dx < -4) ||
      (dir === 'down'  && dy > 4)  ||
      (dir === 'up'    && dy < -4);

    if (!inDir) continue;

    // Score = khoảng cách chính + penalty lệch hướng × 2
    const primary   = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy);
    const secondary = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2;

    if (score < bestScore) { bestScore = score; best = el; }
  }

  if (best) {
    best.focus({ preventScroll: false });
    best.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Đăng ký toàn bộ keydown handler cho Samsung TV remote
 *
 * Phím Samsung Tizen:     ← → ↑ ↓   OK/Enter   Return/Back   Play/Pause   FF   RW
 * keyCode tương ứng:    37 39 38 40    13        10009/8        179/415   417  412
 */
export function registerTVRemote(options?: {
  onBack?:      () => void;
  onPlayPause?: () => void;
  onFF?:        () => void;
  onRW?:        () => void;
}): () => void {
  const handler = (e: KeyboardEvent) => {
    switch (e.keyCode) {
      // ─── Mũi tên điều hướng ───────────────────────────
      case 37: navigateFocus('left');  e.preventDefault(); break;
      case 38: navigateFocus('up');    e.preventDefault(); break;
      case 39: navigateFocus('right'); e.preventDefault(); break;
      case 40: navigateFocus('down');  e.preventDefault(); break;

      // ─── OK / Enter ────────────────────────────────────
      case 13: (document.activeElement as HTMLElement)?.click(); break;

      // ─── Back / Return (Samsung: 10009, browser: 8) ───
      case 8:
      case 10009:
        options?.onBack?.();
        e.preventDefault();
        break;

      // ─── Play / Pause (Samsung: 415, 179) ─────────────
      case 415:
      case 179:
        options?.onPlayPause?.();
        break;

      // ─── Fast Forward (Samsung: 417) ──────────────────
      case 417:
        options?.onFF?.();
        break;

      // ─── Rewind (Samsung: 412) ────────────────────────
      case 412:
        options?.onRW?.();
        break;

      // ─── Nút màu (Samsung) ────────────────────────────
      // Red: 403, Green: 404, Yellow: 405, Blue: 406
      // (có thể mở rộng sau)
    }
  };

  window.addEventListener('keydown', handler, { capture: true });
  return () => window.removeEventListener('keydown', handler, { capture: true });
}

/** Thêm badge "TV Mode" nhỏ ở góc màn hình */
export function showTVBadge(platform: string): void {
  if (document.getElementById('tv-mode-badge')) return;
  const badge = document.createElement('div');
  badge.id = 'tv-mode-badge';
  badge.className = 'tv-mode-badge';
  badge.textContent = `📺 ${platform}`;
  document.body.appendChild(badge);
  // Tự ẩn sau 5 giây
  setTimeout(() => badge.remove(), 5000);
}
