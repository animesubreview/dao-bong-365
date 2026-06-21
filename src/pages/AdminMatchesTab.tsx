import React, { useEffect, useState } from 'react';
import { Trash2, Save, Radio, Plus } from 'lucide-react';
import {
  ManualMatchLink, StreamSource, subscribeManualMatches, createManualMatch, updateManualMatch, deleteManualMatch,
} from '../lib/manualMatches';

const EMPTY_SOURCE: StreamSource = { label: 'HD1', url: '' };

const EMPTY: Omit<ManualMatchLink, 'id' | 'createdAt'> = {
  fixtureId: 0,
  homeTeam: '',
  awayTeam: '',
  leagueName: '',
  matchTime: '',
  sources: [{ ...EMPTY_SOURCE }],
  isFeatured: false,
};

export default function AdminMatchesTab() {
  const [matches, setMatches] = useState<ManualMatchLink[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeManualMatches(setMatches), []);

  function startEdit(m: ManualMatchLink) {
    setEditingId(m.id);
    setForm({
      fixtureId: m.fixtureId, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      leagueName: m.leagueName, matchTime: m.matchTime,
      sources: m.sources?.length ? m.sources : [{ ...EMPTY_SOURCE }],
      isFeatured: !!m.isFeatured,
    });
  }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
  }

  function updateSource(idx: number, patch: Partial<StreamSource>) {
    const next = [...form.sources];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, sources: next });
  }

  function addSource() {
    setForm({ ...form, sources: [...form.sources, { label: `HD${form.sources.length + 1}`, url: '' }] });
  }

  function removeSource(idx: number) {
    setForm({ ...form, sources: form.sources.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    const validSources = form.sources.filter(s => s.url.trim());
    if (!form.fixtureId || !form.homeTeam || !form.awayTeam || validSources.length === 0) {
      alert('Vui lòng nhập ID trận, tên 2 đội và ít nhất 1 link nguồn phát.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, sources: validSources };
      if (editingId) await updateManualMatch(editingId, payload);
      else await createManualMatch(payload);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá link trận đấu này?')) return;
    await deleteManualMatch(id);
    if (editingId === id) resetForm();
  }

  return (
    <div>
      <p className="text-slate-500 text-sm mb-6">
        Lấy ID trận (fixture id) từ API-Football để gắn đúng trận. Mỗi trận có thể có nhiều nguồn phát (HD1, HD2...).
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Fixture ID (vd: 1208021)"
            type="number" value={form.fixtureId || ''}
            onChange={e => setForm({ ...form, fixtureId: Number(e.target.value) })} />
          <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Giải đấu (vd: World Cup 2026)"
            value={form.leagueName} onChange={e => setForm({ ...form, leagueName: e.target.value })} />
          <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Đội nhà"
            value={form.homeTeam} onChange={e => setForm({ ...form, homeTeam: e.target.value })} />
          <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm" placeholder="Đội khách"
            value={form.awayTeam} onChange={e => setForm({ ...form, awayTeam: e.target.value })} />
          <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm col-span-2" placeholder="Giờ thi đấu hiển thị (vd: 23:00 - 21/06/2026)"
            value={form.matchTime} onChange={e => setForm({ ...form, matchTime: e.target.value })} />
        </div>

        {/* Sources */}
        <div className="space-y-2 pt-2">
          <label className="text-xs text-slate-500 uppercase tracking-wide">Nguồn phát</label>
          {form.sources.map((s, idx) => (
            <div key={idx} className="flex gap-2">
              <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm w-24 shrink-0" placeholder="Tên (HD1)"
                value={s.label} onChange={e => updateSource(idx, { label: e.target.value })} />
              <input className="bg-slate-800 rounded-lg px-3 py-2 text-sm flex-1" placeholder="Link m3u8 hoặc embed"
                value={s.url} onChange={e => updateSource(idx, { url: e.target.value })} />
              <button onClick={() => removeSource(idx)} className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={addSource} className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300">
            <Plus size={15} /> Thêm nguồn phát
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-400 pt-2">
          <input type="checkbox" checked={!!form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} />
          Ghim nổi bật trên trang chủ
        </label>
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold text-white disabled:opacity-50">
            <Save size={15} /> {editingId ? 'Cập nhật' : 'Thêm trận'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 py-2 bg-slate-800 rounded-lg text-sm">Huỷ</button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {matches.length === 0 && <p className="text-slate-500 text-sm">Chưa có trận nào được nhập link.</p>}
        {matches.map(m => (
          <div key={m.id} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{m.homeTeam} vs {m.awayTeam}</div>
              <div className="text-slate-500 text-xs truncate">
                {m.leagueName} • {m.matchTime} • fixtureId: {m.fixtureId} • {m.sources?.length || 0} nguồn
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(m)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs">Sửa</button>
              <button onClick={() => handleDelete(m.id)} className="p-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
