// ─── AdBlockGate ────────────────────────────────────────────────────────────
// Phát hiện: (1) trình duyệt Cốc Cốc, (2) tiện ích/app chặn quảng cáo
// (uBlock, AdBlock Plus, Brave Shields, AdGuard...) qua kỹ thuật "bait element".
// VIP/admin được bỏ qua hoàn toàn — họ vốn không hiện quảng cáo.
import { useEffect, useState, useCallback } from 'react';
import { useVipStatus } from '../lib/vip';

function isCocCocBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /coc_coc_browser|coccoc/i.test(ua);
}

// Tạo 1 phần tử "mồi" mang class/tên hay bị các bộ lọc quảng cáo (EasyList...) chặn.
// Nếu trình chặn QC đang hoạt động, phần tử này sẽ bị ẩn/xóa khỏi layout.
function checkAdBlockBait(): Promise<boolean> {
  return new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-placement pub_300x250 textAd text-ad';
    bait.style.cssText = 'position:absolute; top:-9999px; left:-9999px; width:1px; height:1px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);

    window.setTimeout(() => {
      const style = window.getComputedStyle(bait);
      const blocked =
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        bait.clientHeight === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden';
      bait.remove();
      resolve(blocked);
    }, 200);
  });
}

export default function AdBlockGate() {
  const { isVip, loading } = useVipStatus();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    if (isCocCocBrowser()) {
      setBlocked(true);
      return;
    }
    const baitBlocked = await checkAdBlockBait();
    setBlocked(baitBlocked);
  }, []);

  useEffect(() => {
    if (loading || isVip) return; // VIP/admin: bỏ qua, không cần kiểm tra
    runCheck();
  }, [loading, isVip, runCheck]);

  const handleRecheck = async () => {
    setChecking(true);
    await runCheck();
    setChecking(false);
  };

  if (loading || isVip || !blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="max-w-md w-full bg-slate-900 border border-orange-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="text-5xl mb-3">🚫</div>
        <h2 className="text-xl font-bold text-white mb-3">
          Vui lòng tắt trình chặn quảng cáo
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-2">
          Chúng tôi phát hiện bạn đang dùng <span className="text-orange-400 font-semibold">Cốc Cốc</span> hoặc
          một trình duyệt/tiện ích chặn quảng cáo khác.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-5">
          Quảng cáo là nguồn thu nhập duy nhất giúp trang web duy trì hoạt động và phục vụ bạn miễn phí.
          Mong bạn thông cảm và tắt tính năng chặn QC, hoặc chuyển sang trình duyệt <span className="text-white font-semibold">Chrome</span> để tiếp tục xem phim.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold transition-colors"
          >
            {checking ? 'Đang kiểm tra...' : 'Tôi đã tắt — Kiểm tra lại'}
          </button>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Tải trình duyệt Chrome
          </a>
        </div>
      </div>
    </div>
  );
}
