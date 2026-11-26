import React, { useEffect, useMemo, useRef, useState } from 'react';

// Bảng chọn emoji (mẫu #477): tìm kiếm, mục dùng gần đây, 5 nhóm, lưới 8 cột có hiệu ứng phóng to khi rê.
const NAMES = ['Mặt cười', 'Cử chỉ', 'Trái tim', 'Đồ ăn', 'Hoạt động'];
const EMO = [
  '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤔 😮 😢 😭 😴',
  '👍 👎 👏 🙌 🙏 👋 🤝 ✌️ 🤞 🤟 👌 🤙 👊 ✊ 💪 🤲 👀 🙋 🙆 🙅 🤷 🤦 💁 🙇',
  '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💕 💞 💔 💯 ✨ 🔥 ⭐ 🌟 💫 ✅ ❗ ❓ 💤 🎵 💬',
  '🍎 🍓 🍑 🍉 🍋 🥑 🍕 🍔 🍟 🌮 🍣 🍜 🍙 🍗 🥟 🍰 🍩 🍪 🍫 🍦 ☕ 🧋 🍺 🥂',
  '🎉 🎊 🎁 🎂 🎈 🏆 🥇 ⚽ 🏀 ⚾ 🎾 🎮 🎧 🎨 📷 🎬 📚 💻 ✈️ 🚗 🏖️ ⛺ 🌙 ☀️',
].map(r => r.split(' '));
const KW = [
  'cười grin smile|smile big|happy|beam|laugh haha|sweat phew|joy tears|rofl|blush|angel|slight smile|wink|heart eyes yêu|love|kiss hôn|yum ngon|cool ngầu|star struck|party|nghĩ thinking|wow ngạc nhiên|buồn sad|khóc cry|ngủ sleepy',
  'like thích ok|dislike|vỗ tay clap|hooray|cầu nguyện pray thanks|chào wave hello|bắt tay|peace|may mắn|love you|ok fine|call|fist|cheer|mạnh muscle|hands|nhìn eyes|giơ tay|yes|no không|shrug|facepalm|info|xin lỗi bow',
  'tim heart yêu|orange|yellow|green|blue|purple|black|white|sparkling|two hearts|revolving|tan vỡ broken|100 hundred|sparkles|lửa fire|sao star|glowing|dizzy|check xong|important|question hỏi|zzz|nhạc music|chat bubble',
  'táo apple|dâu strawberry|đào peach|dưa hấu|chanh lemon|bơ avocado|pizza|burger|khoai tây fries|taco|sushi|mì ramen|cơm nắm|gà chicken|há cảo|bánh cake|donut|cookie|chocolate|kem ice cream|cà phê coffee|trà sữa boba|bia beer|cheers',
  'party popper|confetti|quà gift|sinh nhật birthday|bóng bay|cúp trophy|huy chương medal|bóng đá soccer|bóng rổ|baseball|tennis|game|tai nghe music|vẽ art|ảnh camera|phim movie|sách books|laptop|máy bay plane|xe car|biển beach|camping|trăng moon|nắng sun',
];
const ALL = EMO.flatMap((row, c) => { const ks = KW[c].split('|'); return row.map((e, k) => ({ e, c, k: ks[k] || '' })); });
const RECENT_KEY = 'ct_rx_recent';
const DEFAULT_RECENT = ['👍', '😂', '❤️', '🎉', '🙏', '🔥', '😍'];

export function getRecentEmoji(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || 'null'); if (Array.isArray(v) && v.length) return v.slice(0, 7); } catch {}
  return DEFAULT_RECENT;
}
export function pushRecentEmoji(e: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...getRecentEmoji().filter(x => x !== e)].slice(0, 7))); } catch {}
}

const TAB_ICONS = [
  <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.2a4.2 4.2 0 0 0 7 0" /><path d="M9.2 9.6v.6M14.8 9.6v.6" /></>,
  <path d="M8 11.5V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.6a1.5 1.5 0 0 1 3 0v6M14 10.5V6.2a1.5 1.5 0 0 1 3 0v7.3c0 3.9-2.6 6.5-6 6.5-2.4 0-3.9-1.2-5.2-3.2L4.2 14a1.5 1.5 0 0 1 2.4-1.8L8 13.6" />,
  <path d="M12 19.5s-7.5-4.4-7.5-9.8A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.3c0 5.4-7.5 9.8-7.5 9.8Z" />,
  <><path d="M5.5 9.5h11v4.5a5.5 5.5 0 0 1-11 0Z" /><path d="M16.5 10.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.6M8.5 3.8c-.8 1 .8 1.6 0 2.8M12 3.8c-.8 1 .8 1.6 0 2.8" /></>,
  <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5c-2.3 2.3-3.4 5.1-3.4 8.5s1.1 6.2 3.4 8.5M12 3.5c2.3 2.3 3.4 5.1 3.4 8.5s-1.1 6.2-3.4 8.5M3.8 9.5h16.4M3.8 14.5h16.4" /></>,
];

const CSS = `
.ep{width:288px;max-width:calc(100vw - 24px);padding:9px;border-radius:18px;background:#10131c;background:var(--surface,#10131c);box-shadow:0 0 0 1px rgba(255,255,255,.1),0 24px 60px -10px rgba(0,0,0,.8);animation:ep-in .4s cubic-bezier(.3,1.45,.5,1) both;transform-origin:50% 100%}
@keyframes ep-in{from{opacity:0;transform:translateY(10px) scale(.92)}}
.ep-sr{position:relative;display:block}
.ep-sr svg{position:absolute;left:10px;top:50%;width:14px;height:14px;margin-top:-7px;fill:none;stroke:#8e8a97;stroke-width:2.2;stroke-linecap:round;pointer-events:none}
.ep-q{width:100%;height:32px;padding:0 10px 0 31px;border:0;border-radius:10px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-size:16px;color:inherit;outline:none;transition:box-shadow .2s}
.ep-q:focus{box-shadow:inset 0 0 0 1px #22c55e,0 0 0 3px rgba(34,197,94,.18)}
.ep-rc{display:flex;align-items:center;height:34px;margin:4px 0 2px;padding:0 0 0 6px;border-bottom:1px solid rgba(255,255,255,.1)}
.ep-rc>svg{flex:none;width:14px;height:14px;margin-right:6px;fill:none;stroke:#8e8a97;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ep-rl{display:flex;flex:1;min-width:0;overflow:hidden}
.ep-tabs{position:relative;display:flex;height:30px;margin:2px 0 3px}
.ep-tab{position:relative;z-index:1;flex:1;display:grid;place-items:center;padding:0;border:0;border-radius:8px;background:none;color:#8e8a97;cursor:pointer;transition:color .25s}
.ep-tab:hover{color:#cbd5e1}
.ep-tab.on{color:#22c55e}
.ep-tab svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;transition:transform .45s cubic-bezier(.34,1.8,.5,1)}
.ep-tab.on svg{transform:scale(1.12)}
.ep-ind{position:absolute;left:0;top:2px;bottom:2px;width:20%;border-radius:8px;background:rgba(34,197,94,.14);transform:translateX(calc(var(--i,0)*100%));transition:transform .45s cubic-bezier(.34,1.35,.5,1),opacity .2s}
.ep-tabs.off .ep-ind{opacity:0}
.ep-g{display:grid;grid-template-columns:repeat(8,1fr);grid-auto-rows:30px;height:90px;overflow:hidden}
.ep-e{position:relative;display:grid;place-items:center;width:100%;height:30px;padding:0;border:0;border-radius:9px;background:none;font-size:20px;line-height:1;cursor:pointer;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}
.ep-g.in .ep-e{animation:ep-pop .4s cubic-bezier(.34,1.5,.5,1) both;animation-delay:calc(var(--d,0)*12ms)}
@keyframes ep-pop{from{opacity:0;transform:translateY(6px) scale(.8)}}
.ep-e::before{content:"";position:absolute;inset:1px 2px;border-radius:9px;background:rgba(255,255,255,.1);opacity:0;transform:scale(.6);transition:opacity .15s,transform .3s cubic-bezier(.34,1.6,.5,1)}
.ep-e span{position:relative;display:block;transition:transform .38s cubic-bezier(.34,1.9,.5,1)}
.ep-e:hover::before,.ep-e:focus-visible::before{opacity:1;transform:none}
.ep-e:hover span,.ep-e:focus-visible span{transform:scale(1.42) translateY(-1px)}
.ep-e:active span{transform:scale(1.15);transition-duration:.1s}
.ep-e:focus-visible{outline:none}
.ep-rl .ep-e{width:30px;flex:none}
.ep-no{grid-column:1/-1;align-self:center;margin:0;font-size:12px;color:#8e8a97;text-align:center}
@media (prefers-reduced-motion:reduce){.ep,.ep *{animation:none!important;transition-duration:.001ms!important}}
`;

export default function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [recent] = useState(getRecentEmoji);
  const [animKey, setAnimKey] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const out = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('pointerdown', out, true);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', out, true); document.removeEventListener('keydown', esc, true); };
  }, [onClose]);

  const s = q.trim().toLowerCase();
  const list = useMemo(
    () => (s ? ALL.filter(o => o.k.toLowerCase().includes(s) || NAMES[o.c].toLowerCase().includes(s)) : ALL.filter(o => o.c === tab)).slice(0, 24),
    [s, tab]);
  const pick = (e: string) => { pushRecentEmoji(e); onPick(e); onClose(); };
  const cell = (e: string, k?: number) => (
    <button key={e + (k ?? '')} type="button" className="ep-e" aria-label={e} style={{ ['--d' as any]: k ?? 0 }} onClick={() => pick(e)}><span aria-hidden="true">{e}</span></button>
  );

  return (
    <div ref={root} className="ep" role="group" aria-label="Chọn cảm xúc">
      <style>{CSS}</style>
      <label className="ep-sr">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></svg>
        <input className="ep-q" type="search" autoComplete="off" spellCheck={false} placeholder="Tìm cảm xúc…" aria-label="Tìm cảm xúc"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && list[0]) { e.preventDefault(); pick(list[0].e); } }} />
      </label>
      <div className="ep-rc">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
        <div className="ep-rl" role="group" aria-label="Dùng gần đây">{recent.map(e => cell(e))}</div>
      </div>
      <div className={`ep-tabs ${s ? 'off' : ''}`} role="tablist" aria-label="Nhóm" style={{ ['--i' as any]: tab }}>
        <span className="ep-ind" aria-hidden="true" />
        {NAMES.map((n, i) => (
          <button key={n} type="button" role="tab" aria-label={n} aria-selected={!s && tab === i} className={`ep-tab ${!s && tab === i ? 'on' : ''}`}
            onClick={() => { setQ(''); setTab(i); setAnimKey(k => k + 1); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{TAB_ICONS[i]}</svg>
          </button>
        ))}
      </div>
      <div key={animKey} className="ep-g in" role="tabpanel" aria-label={s ? 'Kết quả' : NAMES[tab]}>
        {list.length ? list.map((o, k) => cell(o.e, k)) : <p className="ep-no">Không tìm thấy</p>}
      </div>
    </div>
  );
}
