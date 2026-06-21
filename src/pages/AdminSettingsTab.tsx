import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { SiteSettings, DEFAULT_SETTINGS, getSiteSettings, saveSiteSettings } from '../lib/siteSettings';

export default function AdminSettingsTab() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    getSiteSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  function updateSocial(idx: number, patch: Partial<{ label: string; url: string }>) {
    const next = [...settings.socialLinks];
    next[idx] = { ...next[idx], ...patch };
    update('socialLinks', next);
  }

  function addSocial() {
    update('socialLinks', [...settings.socialLinks, { label: '', url: '' }]);
  }

  function removeSocial(idx: number) {
    update('socialLinks', settings.socialLinks.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSiteSettings(settings);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500 text-sm">Đang tải cài đặt...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1">Banner thông báo trang chủ</h3>
        <p className="text-slate-500 text-xs mb-4">Hiện 1 banner ở đầu trang chủ (vd: thông báo bảo trì, sự kiện, link liên hệ Telegram...).</p>

        <label className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <input type="checkbox" checked={settings.bannerEnabled} onChange={e => update('bannerEnabled', e.target.checked)} />
          Bật banner
        </label>

        <div className="space-y-2">
          <input
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Nội dung banner (vd: Chào mừng World Cup 2026!)"
            value={settings.bannerText}
            onChange={e => update('bannerText', e.target.value)}
          />
          <input
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Link ảnh banner (tuỳ chọn, để trống nếu chỉ dùng chữ)"
            value={settings.bannerImageUrl}
            onChange={e => update('bannerImageUrl', e.target.value)}
          />
          <input
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Link khi bấm vào banner (tuỳ chọn)"
            value={settings.bannerLinkUrl}
            onChange={e => update('bannerLinkUrl', e.target.value)}
          />
        </div>
      </div>

      {/* Contact / Footer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1">Thông tin liên hệ &amp; giới thiệu (Footer)</h3>
        <p className="text-slate-500 text-xs mb-4">Hiển thị ở cuối mọi trang.</p>

        <div className="space-y-2">
          <textarea
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm min-h-[80px]"
            placeholder="Giới thiệu ngắn về trang web"
            value={settings.aboutText}
            onChange={e => update('aboutText', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Số điện thoại"
              value={settings.phone} onChange={e => update('phone', e.target.value)} />
            <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Email"
              value={settings.email} onChange={e => update('email', e.target.value)} />
            <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Tên người phụ trách (tuỳ chọn)"
              value={settings.ceoName} onChange={e => update('ceoName', e.target.value)} />
            <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Giờ hoạt động (vd: 24/7)"
              value={settings.workingHours} onChange={e => update('workingHours', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Social links */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-3">Mạng xã hội</h3>
        <div className="space-y-2">
          {settings.socialLinks.map((s, idx) => (
            <div key={idx} className="flex gap-2">
              <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm w-28 shrink-0" placeholder="Tên (Facebook)"
                value={s.label} onChange={e => updateSocial(idx, { label: e.target.value })} />
              <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm flex-1" placeholder="Link URL"
                value={s.url} onChange={e => updateSocial(idx, { url: e.target.value })} />
              <button onClick={() => removeSocial(idx)} className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={addSocial} className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300">
            <Plus size={15} /> Thêm mạng xã hội
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold text-white disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
        {savedAt && <span className="text-slate-500 text-xs">Đã lưu lúc {new Date(savedAt).toLocaleTimeString('vi-VN')}</span>}
      </div>
    </div>
  );
}
