import React, { useEffect, useRef, useState } from 'react';
import { LANGS, Lang, setLang, useLang } from '../lib/i18n';

// Chọn ngôn ngữ (mẫu #448): quả địa cầu lăn khi đổi, nhãn đổi kiểu trượt-mờ, danh sách bung ra có dấu tick.
const CSS = `
.lp{position:relative;flex:none}
.lp-b{position:relative;display:flex;align-items:center;gap:6px;height:38px;padding:0 9px 0 8px;border:0;border-radius:19px;background:var(--surface,#10131c);color:var(--text,#fff);font-size:13.5px;font-weight:600;white-space:nowrap;cursor:pointer;box-shadow:inset 0 0 0 1px var(--border,rgba(255,255,255,.14)),0 6px 16px -10px rgba(0,0,0,.6);transition:box-shadow .2s,transform .4s cubic-bezier(.34,1.45,.64,1)}
.lp-b:hover{box-shadow:inset 0 0 0 1px rgba(34,197,94,.6),0 8px 18px -10px rgba(0,0,0,.6)}
.lp-b:active{transform:scale(.96)}
.lp-b:focus-visible{outline:2px solid #22c55e;outline-offset:3px}
.lp-g{width:22px;height:22px;flex:none;color:#22c55e}
.lp-g svg{width:22px;height:22px;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.lp-g.spin .mer{animation:lp-roll .9s cubic-bezier(.3,.7,.2,1)}
.lp-g.spin svg{animation:lp-tilt .9s cubic-bezier(.34,1.45,.64,1)}
@keyframes lp-roll{from{transform:translateX(-16px)}}
@keyframes lp-tilt{30%{transform:rotate(-24deg) scale(1.12)}}
.lp-lb{display:none;grid-template-columns:minmax(0,1fr);overflow-x:clip;transition:width .45s cubic-bezier(.34,1.45,.64,1)}
.lp-lb span{grid-area:1/1;justify-self:start;width:max-content;white-space:nowrap;transition:opacity .2s,transform .4s cubic-bezier(.34,1.45,.64,1)}
.lp-lb span.out{opacity:0;transform:translateY(-10px)}
.lp-lb span.in{animation:lp-in .45s cubic-bezier(.34,1.45,.64,1)}
@keyframes lp-in{from{opacity:0;transform:translateY(10px)}}
.lp-sh{font-size:12px;font-weight:800;letter-spacing:.03em}
.lp-cv{width:12px;height:12px;flex:none;fill:none;stroke:#8e8a97;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .4s cubic-bezier(.34,1.45,.64,1)}
.lp-b[aria-expanded="true"] .lp-cv{transform:rotate(180deg)}
.lp-p{position:absolute;right:0;top:calc(100% + 10px);width:200px;margin:0;padding:6px;list-style:none;border-radius:16px;background:var(--surface,#10131c);box-shadow:inset 0 0 0 1px var(--border,rgba(255,255,255,.1)),0 22px 44px -18px rgba(0,0,0,.7),0 4px 12px -6px rgba(0,0,0,.4);transform-origin:calc(100% - 30px) -22px;transform:scale(.3) translateY(-8px);opacity:0;visibility:hidden;outline:none;transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .18s,visibility 0s .25s;z-index:60}
.lp.open .lp-p{transform:none;opacity:1;visibility:visible;transition:transform .55s cubic-bezier(.34,1.45,.64,1),opacity .15s,visibility 0s}
.lp-o{display:flex;align-items:center;gap:10px;height:38px;padding:0 10px;border-radius:10px;font-size:14px;color:var(--text,#fff);cursor:pointer;opacity:0;transform:translateY(-6px);transition:background .15s,opacity .15s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.lp.open .lp-o{opacity:1;transform:none;transition-delay:0s,calc(60ms + var(--i)*30ms),calc(60ms + var(--i)*30ms)}
.lp-o:hover,.lp-o.act{background:var(--surface-2,#171b27)}
.lp-o span{flex:1}
.lp-o em{font-style:normal;font-size:11px;font-weight:600;letter-spacing:.04em;color:#8e8a97}
.lp-o svg{width:16px;height:16px;fill:none;stroke:#22c55e;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;opacity:0;transform:scale(.4);transition:opacity .2s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.lp-o[aria-selected="true"]{font-weight:600}
.lp-o[aria-selected="true"] svg{opacity:1;transform:none}
.lp-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (min-width:768px){.lp-lb{display:grid}.lp-sh{display:none}}
@media (prefers-reduced-motion:reduce){.lp *{animation:none!important;transition-duration:.001ms!important}}
`;

const MER = 'M-13 2.4c-4.2 2.6-4.2 14.6 0 17.2M-13 2.4c4.2 2.6 4.2 14.6 0 17.2M-5 2.4c-4.2 2.6-4.2 14.6 0 17.2M-5 2.4c4.2 2.6 4.2 14.6 0 17.2M3 2.4c-4.2 2.6-4.2 14.6 0 17.2M3 2.4c4.2 2.6 4.2 14.6 0 17.2M11 2.4c-4.2 2.6-4.2 14.6 0 17.2M11 2.4c4.2 2.6 4.2 14.6 0 17.2M19 2.4c-4.2 2.6-4.2 14.6 0 17.2M19 2.4c4.2 2.6 4.2 14.6 0 17.2M27 2.4c-4.2 2.6-4.2 14.6 0 17.2M27 2.4c4.2 2.6 4.2 14.6 0 17.2';

export default function LanguagePicker() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const [spin, setSpin] = useState(0);
  const [live, setLive] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const first = useRef(true);
  const uid = useRef('lp' + Math.random().toString(36).slice(2, 7)).current;
  const cur = Math.max(0, LANGS.findIndex(l => l.code === lang));
  const curL = LANGS[cur];

  useEffect(() => {
    if (!open) return;
    const out = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', out, true);
    return () => document.removeEventListener('pointerdown', out, true);
  }, [open]);

  useEffect(() => { if (first.current) { first.current = false; return; } setSpin(s => s + 1); }, [lang]);

  const openMenu = () => { setAct(cur); setOpen(true); setTimeout(() => list.current?.focus({ preventScroll: true }), 30); };
  const close = (back?: boolean) => { setOpen(false); if (back) btn.current?.focus({ preventScroll: true }); };
  const pick = (k: number) => {
    close(true);
    if (k === cur) return;
    setLang(LANGS[k].code as Lang);
    setLive(`${t('lang_changed')}: ${LANGS[k].name}`);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = LANGS.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(a => (a + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(a => (a - 1 + n) % n); }
    else if (e.key === 'Home') { e.preventDefault(); setAct(0); }
    else if (e.key === 'End') { e.preventDefault(); setAct(n - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(act); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close();
  };

  return (
    <div ref={root} className={`lp notranslate ${open ? 'open' : ''}`} translate="no">
      <style>{CSS}</style>
      <button ref={btn} type="button" className="lp-b" aria-haspopup="listbox" aria-expanded={open} aria-controls={uid + 'p'}
        aria-label={`${t('lang_label')}: ${curL.name}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(); } }}>
        <span key={spin} className={`lp-g ${spin ? 'spin' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 22 22">
            <defs><clipPath id={uid + 'c'}><circle cx="11" cy="11" r="8.6" /></clipPath></defs>
            <circle cx="11" cy="11" r="8.6" />
            <g clipPath={`url(#${uid}c)`}><g className="mer"><path d={MER} /></g><path d="M2.6 8.2h16.8M2.6 13.8h16.8" /></g>
          </svg>
        </span>
        <span className="lp-lb"><span key={curL.code} className="in" lang={curL.tag}>{curL.name}</span></span>
        <span className="lp-sh">{curL.short}</span>
        <svg className="lp-cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.6 6 7.6l3-3" /></svg>
      </button>
      <ul ref={list} id={uid + 'p'} className="lp-p" role="listbox" aria-label={t('lang_label')} tabIndex={-1}
        aria-activedescendant={open ? `${uid}o${act}` : undefined} onKeyDown={onKey}>
        {LANGS.map((l, k) => (
          <li key={l.code} id={`${uid}o${k}`} role="option" lang={l.tag} aria-selected={k === cur}
            className={`lp-o ${open && k === act ? 'act' : ''}`} style={{ ['--i' as any]: k }}
            onPointerEnter={() => open && setAct(k)} onClick={() => pick(k)}>
            <span>{l.name}</span><em>{l.short}</em>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
          </li>
        ))}
      </ul>
      <p className="lp-live" role="status">{live}</p>
    </div>
  );
}
