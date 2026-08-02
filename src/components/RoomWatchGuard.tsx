import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Eye } from 'lucide-react';

/**
 * Cảnh báo "quay lại màn hình" cho phòng chiếu.
 * Ghi chú: trình duyệt không cho phép phát hiện quay màn hình/chụp màn hình thật sự,
 * đây là cơ chế phát hiện tốt nhất có thể ở phía client — theo dõi việc rời tab
 * (visibilitychange/blur) để nhắc người xem quay lại, đồng thời nhắc không chia sẻ
 * link nhúng (embed) ra ngoài phòng chiếu.
 */
export function useRoomWatchGuard(active: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    const handleAway = () => {
      // Rời tab quá 8 giây mới cảnh báo, tránh phiền khi chỉ lướt qua nhanh
      awayTimerRef.current = setTimeout(() => setShowWarning(true), 8000);
    };
    const handleBack = () => {
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
        awayTimerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') handleAway();
      else handleBack();
    };

    window.addEventListener('blur', handleAway);
    window.addEventListener('focus', handleBack);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('blur', handleAway);
      window.removeEventListener('focus', handleBack);
      document.removeEventListener('visibilitychange', onVisibility);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [active]);

  return { showWarning, dismiss: () => setShowWarning(false) };
}

export function RoomWatchGuardOverlay({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6 rounded-2xl">
      <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mb-3">
        <AlertTriangle size={26} className="text-amber-400" />
      </div>
      <h3 className="text-white font-black text-base">Bạn vừa rời khỏi màn hình xem</h3>
      <p className="text-slate-400 text-sm mt-1.5 max-w-xs leading-relaxed">
        Vui lòng ở lại trang để tiếp tục theo dõi. Link phát trong phòng chiếu chỉ dành cho
        thành viên đã được duyệt, vui lòng không quay màn hình hoặc chia sẻ link nhúng ra bên ngoài.
      </p>
      <button
        onClick={onDismiss}
        className="mt-4 flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
      >
        <Eye size={15} /> Quay lại xem
      </button>
    </div>
  );
}
