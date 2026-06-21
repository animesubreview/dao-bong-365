import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 mt-10">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg">⚽</div>
          <span className="text-lg font-black text-white">ĐẢO BÓNG 365</span>
        </div>
        <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
          Trực tiếp bóng đá, lịch thi đấu và tỷ số cập nhật real-time — đồng hành cùng World Cup 2026.
        </p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Đảo Bóng 365</p>
      </div>
    </footer>
  );
}
