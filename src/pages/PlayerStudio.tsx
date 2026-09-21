import React, { useState, useEffect } from 'react';
import { getPlayerConfig, savePlayerConfig, resetPlayerConfig, subscribePlayerConfig, PlayerConfig } from '../lib/playerConfig';
import { Settings, Monitor, Image, Type, Sliders, RotateCcw, Check, Eye } from 'lucide-react';

export default function PlayerStudio() {
  const [config, setConfig] = useState<PlayerConfig>(getPlayerConfig());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Subscribe to Firestore - thấy config mới nhất ngay khi mở trang
  useEffect(() => {
    const unsub = subscribePlayerConfig(setConfig);
    return unsub;
  }, []);

  const update = (key: keyof PlayerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await savePlayerConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = async () => {
    if (!confirm('Reset về mặc định?')) return;
    const def = await resetPlayerConfig();
    setConfig(def);
  };

  const logoMid = Math.ceil((config.logoText || '').length / 2);

  return (
    <div className="min-h-screen bg-[#060a06]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Import Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-green-500/10 bg-[#060a06]/90 backdrop-blur-xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-base">🎬</div>
          <span className="font-bold text-white text-base">Player <span className="text-green-400">Studio</span></span>
          <span className="text-[10px] uppercase tracking-widest text-green-400/60 border border-green-500/20 px-2 py-0.5 rounded-full">Config</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs hover:text-white hover:border-white/20 transition-all">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              saved ? 'bg-green-500/20 border border-green-500/50 text-green-400' :
              saving ? 'bg-green-500/50 text-black cursor-wait' :
              'bg-green-500 text-black hover:bg-green-400'
            }`}>
            {saved ? <><Check size={12} /> Đã lưu!</> : saving ? '⏳ Đang lưu...' : 'Lưu cho tất cả'}
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Preview ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-widest flex items-center gap-2">
            <Eye size={14} /> Xem trước
          </h2>

          {/* Player preview */}
          <div className="relative bg-black rounded-2xl overflow-hidden border border-green-500/15" style={{ aspectRatio: '16/9' }}>
            {/* Fake video bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
              <div className="text-slate-700 text-center">
                <div style={{ fontSize: 48 }}>🎬</div>
                <div className="text-xs mt-2 font-mono">video preview</div>
              </div>
            </div>

            {/* Logo preview */}
            {config.logoType !== 'none' && (
              <div style={{
                position: 'absolute', zIndex: 10, pointerEvents: 'none',
                opacity: config.logoOpacity / 100,
                ...(config.logoPosition === 'top-left' ? { top: 14, left: 14 } :
                    config.logoPosition === 'top-right' ? { top: 14, right: 14 } :
                    config.logoPosition === 'bottom-left' ? { bottom: 60, left: 14 } :
                                                            { bottom: 60, right: 14 }),
              }}>
                {config.logoType === 'text' && (
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: config.logoSize,
                    textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                    color: config.logoColor2,
                  }}>
                    <span style={{ color: config.logoColor1 }}>
                      {(config.logoText || '').slice(0, logoMid)}
                    </span>
                    {(config.logoText || '').slice(logoMid)}
                  </div>
                )}
                {config.logoType === 'image' && config.logoImageUrl && (
                  <img src={config.logoImageUrl} alt="logo"
                    style={{ maxHeight: config.logoSize * 2.5, maxWidth: 120, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }} />
                )}
              </div>
            )}

            {/* Fake controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
              <div className="h-1 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
                <div className="h-full rounded-full" style={{ width: '35%', background: `linear-gradient(90deg, ${config.accentColor}cc, ${config.accentColor})` }} />
                <div style={{ position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%,-50%)', width: 10, height: 10, background: config.accentColor, borderRadius: '50%' }} />
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: config.accentColor, fontSize: 16 }}>▶</span>
                <span className="text-white/50 text-[10px] font-mono">12:34 / 44:30</span>
                <div className="flex-1" />
                <div style={{ background: `${config.accentColor}22`, border: `1px solid ${config.accentColor}44`, color: config.accentColor, fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>1x</div>
                <div style={{ background: `${config.accentColor}22`, border: `1px solid ${config.accentColor}44`, color: config.accentColor, fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>AUTO</div>
                <span className="text-white/50 text-sm">⛶</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-[#0d140d] border border-green-500/10 rounded-xl p-4 text-xs text-slate-400 space-y-1">
            <div>🔥 Config lưu trên <strong className="text-white">Firebase Firestore</strong> — mọi người thấy cùng logo</div>
            <div>⚡ Realtime — thay đổi logo ngay khi nhấn lưu, <strong className="text-white">không cần reload</strong></div>
            <div>📱 Hoạt động trên <strong className="text-white">cả mobile lẫn desktop</strong></div>
            <div>⌨️ Phím tắt: <strong className="text-green-400">Space</strong> phát/dừng, <strong className="text-green-400">← →</strong> tua ±10s, <strong className="text-green-400">F</strong> fullscreen</div>
          </div>
        </div>

        {/* ── RIGHT: Config ── */}
        <div className="flex flex-col gap-4">

          {/* Logo Config */}
          <div className="bg-[#0d140d] border border-green-500/15 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-green-500/10 bg-[#111a11] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-green-400">Logo Overlay</h3>
            </div>
            <div className="p-4 space-y-4">

              {/* Logo type */}
              <div>
                <label className={labelCls}>Kiểu Logo</label>
                <select value={config.logoType} onChange={e => update('logoType', e.target.value)} className={selectCls}>
                  <option value="text">Chữ</option>
                  <option value="image">Ảnh (URL)</option>
                  <option value="none">Ẩn Logo</option>
                </select>
              </div>

              {config.logoType === 'text' && (<>
                <div>
                  <label className={labelCls}>Nội dung chữ</label>
                  <input type="text" value={config.logoText} onChange={e => update('logoText', e.target.value)} className={inputCls} placeholder="DaoPhim" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Màu nửa đầu</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.logoColor1} onChange={e => update('logoColor1', e.target.value)}
                        className="w-10 h-9 rounded-lg border border-green-500/20 bg-[#060a06] cursor-pointer p-1" />
                      <span className="text-xs font-mono text-slate-400">{config.logoColor1}</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Màu nửa sau</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.logoColor2} onChange={e => update('logoColor2', e.target.value)}
                        className="w-10 h-9 rounded-lg border border-green-500/20 bg-[#060a06] cursor-pointer p-1" />
                      <span className="text-xs font-mono text-slate-400">{config.logoColor2}</span>
                    </div>
                  </div>
                </div>
              </>)}

              {config.logoType === 'image' && (
                <div>
                  <label className={labelCls}>URL Ảnh Logo</label>
                  <input type="url" value={config.logoImageUrl} onChange={e => update('logoImageUrl', e.target.value)} className={inputCls} placeholder="https://daophim.online/logo.png" />
                </div>
              )}

              {/* Position */}
              <div>
                <label className={labelCls}>Vị trí</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'top-left', label: '↖ Trên trái' },
                    { val: 'top-right', label: '↗ Trên phải' },
                    { val: 'bottom-left', label: '↙ Dưới trái' },
                    { val: 'bottom-right', label: '↘ Dưới phải' },
                  ].map(p => (
                    <button key={p.val} onClick={() => update('logoPosition', p.val)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        config.logoPosition === p.val
                          ? 'bg-green-500/15 border-green-500/50 text-green-400'
                          : 'bg-[#060a06] border-green-500/10 text-slate-400 hover:border-green-500/30'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size + Opacity */}
              <div>
                <label className={labelCls}>Cỡ chữ: <span className="text-green-400 font-mono">{config.logoSize}px</span></label>
                <input type="range" min="10" max="36" value={config.logoSize} onChange={e => update('logoSize', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 cursor-pointer" />
              </div>
              <div>
                <label className={labelCls}>Độ mờ: <span className="text-green-400 font-mono">{config.logoOpacity}%</span></label>
                <input type="range" min="10" max="100" value={config.logoOpacity} onChange={e => update('logoOpacity', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Player Config */}
          <div className="bg-[#0d140d] border border-green-500/15 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-green-500/10 bg-[#111a11] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-green-400">Cài Đặt Player</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={labelCls}>Màu nhấn (accent): <span className="font-mono" style={{ color: config.accentColor }}>{config.accentColor}</span></label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.accentColor} onChange={e => update('accentColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-green-500/20 bg-[#060a06] cursor-pointer p-1" />
                  <div className="flex gap-2 flex-wrap">
                    {['#22c55e','#3b82f6','#f59e0b','#ef4444','#a855f7','#ec4899'].map(c => (
                      <button key={c} onClick={() => update('accentColor', c)}
                        style={{ width: 24, height: 24, background: c, borderRadius: 6, border: config.accentColor === c ? '2px solid #fff' : '2px solid transparent' }} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Âm lượng mặc định: <span className="text-green-400 font-mono">{config.defaultVolume}%</span></label>
                <input type="range" min="0" max="100" value={config.defaultVolume} onChange={e => update('defaultVolume', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 cursor-pointer" />
              </div>

              <div className="flex items-center justify-between">
                <label className={labelCls + ' mb-0'}>Tự động phát</label>
                <button onClick={() => update('autoplay', !config.autoplay)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${config.autoplay ? 'bg-green-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${config.autoplay ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              saved ? 'bg-green-500/20 border border-green-500/50 text-green-400' :
              saving ? 'bg-green-500/50 text-black cursor-wait' :
              'bg-green-500 text-black hover:bg-green-400'
            }`}>
            {saved ? '✓ Đã lưu — Mọi người thấy ngay!' : saving ? '⏳ Đang lưu lên Firestore...' : '💾 Lưu và áp dụng cho tất cả'}
          </button>

          <p className="text-center text-xs text-slate-600">
            Config lưu trên Firestore — tất cả người xem phim thấy cùng logo ngay lập tức.
          </p>
        </div>
      </div>
    </div>
  );
}

const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.6px] mb-1.5";
const inputCls = "w-full bg-[#060a06] border border-green-500/15 text-white font-sans text-[13px] px-3 py-2 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all";
const selectCls = "w-full bg-[#060a06] border border-green-500/15 text-white font-sans text-[13px] px-3 py-2 rounded-lg outline-none focus:border-green-500 transition-all";
