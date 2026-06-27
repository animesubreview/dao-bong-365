/**
 * TVOptimizer.tsx
 * Component không render UI — mount 1 lần ở App root.
 * Tự động phát hiện Samsung TV và kích hoạt tối ưu.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  detectTV,
  injectTVStyles,
  registerTVRemote,
  navigateFocus,
  showTVBadge,
} from '../lib/tvDetect';

export default function TVOptimizer() {
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const tvInfo = detectTV();
    if (!tvInfo.isTV) return; // Không phải TV → không làm gì

    console.log(`[ĐảoPhim TV] Detected: ${tvInfo.platform}`);

    // 1. Inject CSS tối ưu TV
    injectTVStyles();

    // 2. Hiện badge TV Mode trong 5 giây
    showTVBadge(tvInfo.platform);

    // 3. Đăng ký remote control
    const cleanup = registerTVRemote({
      onBack: () => {
        // Nếu đang có modal mở → đóng modal
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);

        // Sau 100ms nếu không có gì xử lý Escape → navigate back
        setTimeout(() => navigate(-1), 100);
      },

      onPlayPause: () => {
        // Tìm iframe player và gửi space (nếu cùng origin)
        const iframe = document.querySelector<HTMLIFrameElement>('iframe');
        if (iframe) {
          try {
            iframe.contentWindow?.postMessage({ type: 'togglePlay' }, '*');
          } catch {}
        }
      },
    });

    // 4. Auto-focus phần tử đầu tiên sau khi render
    const focusTimer = setTimeout(() => {
      const first = document.querySelector<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      first?.focus({ preventScroll: true });
    }, 500);

    return () => {
      cleanup();
      clearTimeout(focusTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount

  // Re-focus khi đổi route
  useEffect(() => {
    const tvInfo = detectTV();
    if (!tvInfo.isTV) return;

    const t = setTimeout(() => {
      const first = document.querySelector<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      first?.focus({ preventScroll: true });
    }, 400);

    return () => clearTimeout(t);
  }, [location.pathname]);

  return null; // Không render UI
}
