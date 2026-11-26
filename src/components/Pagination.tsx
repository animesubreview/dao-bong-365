import React, { useRef } from 'react';

// Thanh đánh số trang: viên thuốc trượt + số lật lên/xuống (theo mẫu #449). Tối đa 7 ô, dùng "…" khi nhiều trang.
const CSS = `
.pg-nav{display:flex;align-items:center;gap:6px;padding:6px;border-radius:16px;background:var(--surface,#10131c);box-shadow:inset 0 0 0 1px var(--border,rgba(255,255,255,.08)),0 10px 26px -18px rgba(0,0,0,.6);max-width:100%}
.pg-ar{width:32px;height:36px;display:grid;place-items:center;border:0;border-radius:10px;background:none;color:var(--text-muted,#9ca3af);cursor:pointer;transition:background .2s,color .2s,opacity .25s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.pg-ar:hover:not(:disabled){background:var(--surface-2,#171b27);color:var(--text,#fff)}
.pg-ar:active:not(:disabled){transform:scale(.9)}
.pg-ar:disabled{opacity:.3;cursor:default}
.pg-ar svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pg-nav button:focus-visible{outline:2px solid #22c55e;outline-offset:1px}
.pg-sl{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:32px;gap:2px}
.pg-pill{position:absolute;left:0;top:0;width:32px;height:36px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);box-shadow:0 6px 16px -6px rgba(34,197,94,.6);transform:translateX(var(--x,0px));transition:transform .55s cubic-bezier(.34,1.45,.64,1)}
.pg-pill.sq{animation:pg-sq .55s cubic-bezier(.2,.8,.2,1)}
@keyframes pg-sq{35%{scale:1.22 .9}}
.pg-n{position:relative;width:32px;height:36px;padding:0;border:0;border-radius:10px;background:none;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-muted,#9ca3af);overflow:hidden;cursor:pointer;transition:color .3s,background .2s}
.pg-n:hover:not(.dots):not(.cur){background:var(--surface-2,#171b27);color:var(--text,#fff)}
.pg-n.cur{color:#fff}
.pg-n.dots{cursor:default;opacity:.6}
.pg-n span{position:absolute;inset:0;display:grid;place-items:center;animation:pg-in .4s cubic-bezier(.34,1.45,.64,1)}
.pg-n.back span{animation-name:pg-in-b}
@keyframes pg-in{from{transform:translateY(22px);opacity:0}}
@keyframes pg-in-b{from{transform:translateY(-22px);opacity:0}}
@media (max-width:400px){.pg-nav{gap:2px;padding:4px}.pg-ar{width:28px}}
@media (prefers-reduced-motion:reduce){.pg-nav *{animation:none!important;transition-duration:.001ms!important}}
`;

function windowOf(cur: number, total: number): (number | '')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, '', total];
  if (cur >= total - 3) return [1, '', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '', cur - 1, cur, cur + 1, '', total];
}

export default function Pagination({ page, totalPages, onChange, className = '' }: {
  page: number; totalPages: number; onChange: (p: number) => void; className?: string;
}) {
  const prev = useRef(page);
  const back = page < prev.current;
  const sq = useRef(0);
  if (prev.current !== page) { sq.current++; }
  const lastBack = useRef(false);
  if (prev.current !== page) lastBack.current = back;
  prev.current = page;

  if (totalPages <= 1) return null;
  const cur = Math.min(Math.max(1, page), totalPages);
  const slots = windowOf(cur, totalPages);
  const at = Math.max(0, slots.indexOf(cur));

  return (
    <div className={`flex justify-center ${className}`}>
      <style>{CSS}</style>
      <nav className="pg-nav" aria-label="Phân trang">
        <button type="button" className="pg-ar" aria-label="Trang trước" disabled={cur <= 1} onClick={() => onChange(cur - 1)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
        </button>
        <div className="pg-sl">
          <span key={sq.current} className="pg-pill sq" aria-hidden="true" style={{ ['--x' as any]: `${at * 34}px` }} />
          {slots.map((v, k) => v === '' ? (
            <button key={'d' + k} type="button" className="pg-n dots" tabIndex={-1} aria-hidden="true"><span>…</span></button>
          ) : (
            <button key={k} type="button" className={`pg-n ${v === cur ? 'cur' : ''} ${lastBack.current ? 'back' : ''}`}
              aria-label={`Trang ${v}`} aria-current={v === cur ? 'page' : undefined} onClick={() => onChange(v)}>
              <span key={v}>{v}</span>
            </button>
          ))}
        </div>
        <button type="button" className="pg-ar" aria-label="Trang sau" disabled={cur >= totalPages} onClick={() => onChange(cur + 1)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
        </button>
      </nav>
    </div>
  );
}
