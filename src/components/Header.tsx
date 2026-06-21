import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home, Calendar, Trophy, Radio } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: Home },
  { to: '/#live', label: 'Đang diễn ra', icon: Radio },
  { to: '/#today', label: 'Lịch hôm nay', icon: Calendar },
  { to: '/#worldcup', label: 'World Cup 2026', icon: Trophy },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <span className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-xl">⚽</span>
      <span className="text-xl font-black tracking-tight">
        <span className="text-white">ĐẢO</span>
        <span className="text-green-400"> BÓNG 365</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950 border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <a
              key={item.label}
              href={item.to}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            >
              <item.icon size={15} /> {item.label}
            </a>
          ))}
        </nav>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-slate-950 border-r border-slate-800 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button onClick={() => setMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => (
                <a
                  key={item.label}
                  href={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-200 bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <item.icon size={18} className="text-green-500" /> {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
