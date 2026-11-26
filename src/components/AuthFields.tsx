import React, { forwardRef, useId, useState } from 'react';

// Ô nhập nhãn nổi + nút mắt hiện mật khẩu + nút gửi biến hình (mẫu #403).
const CSS = `
.af-f{position:relative;height:52px;border-radius:12px;background:var(--surface,#10131c);box-shadow:inset 0 0 0 1px var(--border,rgba(255,255,255,.16));transition:box-shadow .2s}
.af-f:hover{box-shadow:inset 0 0 0 1px #8e8a97}
.af-f.is-f{box-shadow:inset 0 0 0 1.5px #22c55e,0 0 0 4px rgba(34,197,94,.16)}
.af-f.is-err{box-shadow:inset 0 0 0 1px rgba(248,113,113,.6)}
.af-f::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;border-radius:2px;background:#f87171;transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.af-f.is-err::after{transform:scaleX(1)}
.af-f.is-shake{animation:af-shake .45s cubic-bezier(.36,.07,.19,.97)}
@keyframes af-shake{15%{transform:translateX(-7px)}35%{transform:translateX(6px)}55%{transform:translateX(-4px)}75%{transform:translateX(2px)}}
.af-f label{position:absolute;left:15px;top:17px;font-size:14px;color:#8e8a97;transform-origin:left top;transition:transform .4s cubic-bezier(.34,1.45,.64,1),color .2s;pointer-events:none}
.af-f.is-up label{transform:translateY(-10px) scale(.76);color:var(--text-muted,#9ca3af)}
.af-f.is-f label{color:#22c55e}
.af-f.is-err label{color:#f87171}
.af-in{position:absolute;inset:0;width:100%;padding:21px 15px 6px;border:0;border-radius:12px;background:none;outline:none;font-size:16px;color:var(--text,#fff)}
.af-in[type="password"]{letter-spacing:.14em}
.af-pw .af-in{padding-right:48px}
.af-eye{position:absolute;right:8px;top:9px;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:9px;background:none;color:#8e8a97;cursor:pointer;transition:color .2s,background .2s}
.af-eye:hover{color:var(--text,#fff);background:var(--surface-2,#171b27)}
.af-eye:focus-visible{outline:2px solid #22c55e;outline-offset:-2px}
.af-eye svg{width:20px;height:20px;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.af-eye .lid{transform-origin:10px 10px;transform:scaleY(.1);transition:transform .45s cubic-bezier(.34,1.45,.64,1)}
.af-eye .lash{opacity:1;transition:opacity .2s,transform .4s cubic-bezier(.34,1.45,.64,1);transform-origin:10px 10px}
.af-eye[aria-pressed="true"] .lid{transform:none}
.af-eye[aria-pressed="true"] .lash{opacity:0;transform:translateY(-3px)}
.af-msg{min-height:18px;margin:0;padding:5px 4px 0;font-size:12px;font-weight:500;color:#f87171;opacity:0;transform:translateY(-4px);transition:opacity .2s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.af-msg.is-on{opacity:1;transform:none}
.af-go{position:relative;display:grid;place-items:center;width:100%;height:48px;margin:6px auto 0;padding:0;border:0;border-radius:14px;background:#22c55e;color:#04210f;font-size:14.5px;font-weight:800;overflow:hidden;cursor:pointer;box-shadow:0 8px 24px rgba(34,197,94,.25);transition:width .55s cubic-bezier(.34,1.45,.64,1),border-radius .45s cubic-bezier(.2,.8,.2,1),background .35s,color .35s,transform .4s cubic-bezier(.34,1.45,.64,1)}
.af-go:hover{transform:translateY(-1px)}
.af-go:active{transform:scale(.97,.94);transition-duration:.55s,.45s,.35s,.35s,.1s}
.af-go:focus-visible{outline:2px solid #22c55e;outline-offset:3px}
.af-go>*{grid-area:1/1;transition:opacity .2s,transform .4s cubic-bezier(.34,1.45,.64,1)}
.af-go i{width:18px;height:18px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;opacity:0;transform:scale(.5);animation:af-spin .7s linear infinite}
.af-go svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:0;transform:scale(.5)}
.af-go svg path{stroke-dasharray:20;stroke-dashoffset:20;transition:stroke-dashoffset .4s cubic-bezier(.2,.8,.2,1) .1s}
@keyframes af-spin{to{rotate:360deg}}
.af-go.is-busy,.af-go.is-ok{width:48px;border-radius:24px;cursor:default}
.af-go.is-busy span,.af-go.is-ok span{opacity:0;transform:scale(.8)}
.af-go.is-busy i{opacity:1;transform:none}
.af-go.is-ok{background:#16a34a;color:#fff}
.af-go.is-ok svg{opacity:1;transform:none}
.af-go.is-ok svg path{stroke-dashoffset:0}
@media (prefers-reduced-motion:reduce){.af-f,.af-f *,.af-go,.af-go *{animation-duration:.001ms!important;transition-duration:.001ms!important}.af-go i{animation-duration:1.2s!important}}
`;

export const AuthStyles = () => <style>{CSS}</style>;

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void;
  type?: 'text' | 'email' | 'password'; autoComplete?: string;
  error?: string; shake?: number; maxLength?: number;
}

/** Ô nhập có nhãn nổi; type="password" tự có nút mắt. `error` hiện dòng báo lỗi dưới ô, `shake` tăng lên để rung lại. */
export const FloatField = forwardRef<HTMLInputElement, FieldProps>(function FloatField(
  { label, value, onChange, type = 'text', autoComplete, error, shake = 0, maxLength }, ref) {
  const id = useId();
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const up = focus || !!value;
  return (
    <div>
      <div key={shake} className={`af-f ${isPw ? 'af-pw' : ''} ${focus ? 'is-f' : ''} ${up ? 'is-up' : ''} ${error ? 'is-err' : ''} ${error && shake ? 'is-shake' : ''}`}>
        <input ref={ref} id={id} className="af-in" type={isPw && show ? 'text' : type} value={value} maxLength={maxLength}
          autoComplete={autoComplete} spellCheck={false} aria-invalid={!!error || undefined} aria-describedby={error ? id + 'm' : undefined}
          onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
        <label htmlFor={id}>{label}</label>
        {isPw && (
          <button type="button" className="af-eye" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show} onClick={() => setShow(s => !s)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <g className="lid"><path d="M2 10s3-5.2 8-5.2S18 10 18 10s-3 5.2-8 5.2S2 10 2 10z" /><circle cx="10" cy="10" r="2.4" /></g>
              <g className="lash"><path d="M3 10.4c2 2.4 4.4 3.4 7 3.4s5-1 7-3.4M6 13l-1 1.6M10 14v1.8M14 13l1 1.6" /></g>
            </svg>
          </button>
        )}
      </div>
      <p id={id + 'm'} className={`af-msg ${error ? 'is-on' : ''}`} aria-live="polite">{error || ''}</p>
    </div>
  );
});

/** Nút gửi biến hình: chữ → vòng quay (busy) → dấu tick (ok) */
export function MorphButton({ state, children }: { state: 'idle' | 'busy' | 'ok'; children: React.ReactNode }) {
  return (
    <button type="submit" className={`af-go ${state === 'busy' ? 'is-busy' : ''} ${state === 'ok' ? 'is-ok' : ''}`}
      aria-busy={state === 'busy' || undefined} onClick={e => { if (state !== 'idle') e.preventDefault(); }}>
      <span>{children}</span>
      <i aria-hidden="true" />
      <svg viewBox="0 0 22 22" aria-hidden="true"><path d="M5.5 11.5l4 4L17 7.5" /></svg>
    </button>
  );
}
