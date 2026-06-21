import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, BarChart3, ClipboardList, List } from 'lucide-react';

const TABS = [
  { label: 'Trực tiếp', icon: Radio, hash: '#live' },
  { label: 'BXH', icon: BarChart3, hash: '#worldcup' },
  { label: 'Livescore', icon: ClipboardList, hash: '#today' },
  { label: 'Kết quả', icon: List, hash: '#today' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-green-600 md:hidden">
      <div className="flex">
        {TABS.map(tab => (
          <Link
            key={tab.label}
            to={`/${tab.hash}`}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-white text-[11px] font-semibold"
          >
            <tab.icon size={16} />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
