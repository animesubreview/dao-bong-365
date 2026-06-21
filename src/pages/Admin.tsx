import React, { useState } from 'react';
import { Radio, Settings as SettingsIcon } from 'lucide-react';
import AdminMatchesTab from './AdminMatchesTab';
import AdminSettingsTab from './AdminSettingsTab';

const TABS = [
  { key: 'matches', label: 'Trận đấu', icon: Radio },
  { key: 'settings', label: 'Cài đặt trang', icon: SettingsIcon },
] as const;

export default function Admin() {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('matches');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-slate-200">
      <h1 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <SettingsIcon className="text-green-500" /> Quản trị Đảo Bóng 365
      </h1>

      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-500 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'matches' ? <AdminMatchesTab /> : <AdminSettingsTab />}
    </div>
  );
}
