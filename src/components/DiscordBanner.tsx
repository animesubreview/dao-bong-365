import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { subscribeSiteSettings } from '../lib/siteSettings';

/**
 * Banner mời vào nhóm Discord — hiển thị ở trang Chi tiết phim & trang Xem phim.
 * Admin cấu hình link + (tuỳ chọn) ảnh banner riêng trong Admin → Cài đặt Website.
 * Nếu không có ảnh, tự vẽ banner mặc định theo phong cách gradient xanh dương.
 */
export default function DiscordBanner({ className = '' }: { className?: string }) {
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = subscribeSiteSettings(setSettings);
    return unsub;
  }, []);

  const discordUrl = settings.discordUrl || '';
  const bannerImage = settings.discordBannerImage || '';
  const text = settings.discordBannerText || 'THAM GIA NHÓM DISCORD - CẬP NHẬT PHIM MỚI MỖI NGÀY';

  if (!discordUrl) return null;

  return (
    <a
      href={discordUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full rounded-xl overflow-hidden group ${className}`}
    >
      {bannerImage ? (
        <img src={bannerImage} alt="Tham gia Discord" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="relative flex items-center gap-3 px-4 py-3 md:py-3.5 bg-gradient-to-r from-[#4752C4] via-[#5865F2] to-[#4752C4] active:scale-[0.99] group-hover:brightness-110 transition-all">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <MessageCircle size={19} className="text-white" />
          </div>
          <span className="flex-1 min-w-0 text-white font-black text-[12px] md:text-sm tracking-wide truncate">
            {text}
          </span>
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            {/* Icon Discord dạng SVG đơn giản, tránh phụ thuộc icon-set ngoài */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-white">
              <path d="M20.317 4.369A19.791 19.791 0 0 0 15.885 3c-.204.36-.44.85-.605 1.24a18.27 18.27 0 0 0-5.56 0A12.64 12.64 0 0 0 9.115 3a19.736 19.736 0 0 0-4.435 1.37C1.68 8.63.933 12.8 1.267 16.913a19.9 19.9 0 0 0 5.993 3.03c.485-.66.916-1.36 1.287-2.095a12.87 12.87 0 0 1-2.026-.975c.17-.124.336-.253.497-.386 3.909 1.804 8.146 1.804 12.006 0 .163.133.33.262.497.386-.646.386-1.325.71-2.03.977.372.734.802 1.434 1.288 2.093a19.83 19.83 0 0 0 6.002-3.03c.393-4.78-.68-8.913-2.964-12.544ZM8.68 14.443c-1.146 0-2.086-1.058-2.086-2.36 0-1.303.918-2.361 2.086-2.361 1.177 0 2.117 1.067 2.086 2.36 0 1.303-.91 2.361-2.086 2.361Zm6.646 0c-1.146 0-2.086-1.058-2.086-2.36 0-1.303.918-2.361 2.086-2.361 1.177 0 2.116 1.067 2.086 2.36 0 1.303-.91 2.361-2.086 2.361Z"/>
            </svg>
          </div>
        </div>
      )}
    </a>
  );
}
