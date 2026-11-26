/*
 * From Uiverse.io by aryamitra06 - https://uiverse.io/aryamitra06/silent-lion-21
 * MIT License, Copyright (c) aryamitra06 (Aryamitra Chaudhuri)
 */
import React from 'react';

// Loader 3 thanh sóng. Class đổi thành bl-* để không đụng style khác; giữ nguyên kích thước & animation gốc.
// Chế độ ngày: thanh đổi sang màu tối (qua biến --bl-base / --bl-hi) để vẫn nhìn thấy.
const CSS = `
.bl-loader{display:flex;align-items:center;--bl-base:rgba(255,255,255,.5);--bl-hi:#fff}
html[data-theme="light"] .bl-fallback{--bl-base:rgba(22,21,27,.35);--bl-hi:#16151b}
.bl-bar{display:inline-block;width:3px;height:20px;background-color:var(--bl-base);border-radius:10px;animation:bl-scale-up4 1s linear infinite}
.bl-bar:nth-child(2){height:35px;margin:0 5px;animation-delay:.25s}
.bl-bar:nth-child(3){animation-delay:.5s}
@keyframes bl-scale-up4{20%{background-color:var(--bl-hi);transform:scaleY(1.5)}40%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.bl-bar{animation-duration:2s}}
`;

export default function BarsLoader({ className = '', label = 'Đang tải' }: { className?: string; label?: string }) {
  return (
    <div className={`bl-loader ${className}`} role="status" aria-label={label}>
      <style>{CSS}</style>
      <span className="bl-bar" />
      <span className="bl-bar" />
      <span className="bl-bar" />
    </div>
  );
}

/** Khung chờ giữa trang khi đang tải trang con (dùng cho Suspense) */
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <BarsLoader className="bl-fallback" />
    </div>
  );
}
