import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function TikTokAnnouncementPopup() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Luôn hiện mỗi khi load lại trang (không lưu trạng thái đã đóng)
    // Delay nhỏ để không che loading screen
    const t = setTimeout(() => setVisible(true), 3200);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
    }, 220);
  };

  const handleJoin = () => {
    window.open('https://tiktok.me/group/ZS9KPEXUP/', '_blank', 'noopener,noreferrer');
    handleClose();
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes tiktok-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tiktok-card-in {
          from { opacity: 0; transform: scale(.86) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tiktok-overlay-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes tiktok-card-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(.9) translateY(10px); }
        }
        .tiktok-overlay {
          animation: ${closing ? 'tiktok-overlay-out' : 'tiktok-overlay-in'} .22s ease forwards;
        }
        .tiktok-card {
          animation: ${closing ? 'tiktok-card-out' : 'tiktok-card-in'} .28s cubic-bezier(.17,.67,.35,1.12) forwards;
        }
        @keyframes tiktok-btn-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,.55); }
          50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
        }
        .tiktok-btn-pulse {
          animation: tiktok-btn-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Overlay */}
      <div
        className="tiktok-overlay fixed inset-0 z-[9998] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center px-5"
        onClick={handleClose}
      >
        {/* Card */}
        <div
          className="tiktok-card relative w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl shadow-black/80"
          onClick={e => e.stopPropagation()}
          style={{ border: '2px solid rgba(255,255,255,0.1)' }}
        >
          {/* Nút đóng */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 text-white transition-colors shadow-lg"
            aria-label="Đóng"
          >
            <X size={15} strokeWidth={2.5} />
          </button>

          {/* Ảnh thông báo — nhấn vào cũng vào link */}
          <div
            className="w-full cursor-pointer"
            onClick={handleJoin}
            style={{ background: '#f0f0f8' }}
          >
            <img
              src="https://sf-static.upanhlaylink.com/img/image_202606167ea6878dbd86a1b4522a4045b3ca39c8.jpg"
              alt="Thông báo TikTok"
              className="w-full h-auto block"
              style={{ maxHeight: 420, objectFit: 'cover' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Footer */}
          <div className="bg-slate-900 px-4 pt-3 pb-4 flex flex-col gap-2.5">
            <button
              onClick={handleJoin}
              className="tiktok-btn-pulse w-full py-3 rounded-2xl text-base font-black text-white transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(90deg, #5b21b6 0%, #6366f1 100%)',
              }}
            >
              VÀO NGAY →
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
