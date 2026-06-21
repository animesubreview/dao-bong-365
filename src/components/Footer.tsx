import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock } from 'lucide-react';
import { SiteSettings, DEFAULT_SETTINGS, subscribeSiteSettings } from '../lib/siteSettings';

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => subscribeSiteSettings(setSettings), []);

  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 mt-10">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg">⚽</div>
          <span className="text-lg font-black text-white">ĐẢO BÓNG 365</span>
        </div>

        <p className="text-slate-500 text-xs max-w-md leading-relaxed">
          {settings.aboutText}
        </p>

        {(settings.phone || settings.email || settings.workingHours) && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            {settings.workingHours && (
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-green-500" /> {settings.workingHours}</span>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone size={14} className="text-green-500" /> {settings.phone}
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail size={14} className="text-green-500" /> {settings.email}
              </a>
            )}
          </div>
        )}

        {settings.ceoName && (
          <p className="text-slate-600 text-xs">Phụ trách nội dung: {settings.ceoName}</p>
        )}

        {settings.socialLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {settings.socialLinks.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-green-700 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Đảo Bóng 365</p>
      </div>
    </footer>
  );
}
