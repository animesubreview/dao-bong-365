import React, { useEffect, useState } from 'react';
import { getTheme, setTheme, Theme } from '../lib/theme';

// Công tắc ngày/đêm (mặt trời ↔ mặt trăng, mây ↔ sao). Vẽ ở kích thước gốc 176×74 rồi thu 50%.
const CSS = `
.tt-box{width:88px;height:37px;flex:none;position:relative}
.tt-b{position:absolute;left:0;top:0;transform-origin:0 0;scale:.5;width:176px;height:74px;padding:0;border:0;border-radius:37px;overflow:hidden;isolation:isolate;background:#4FA8F7;box-shadow:inset 0 3px 7px rgba(0,0,0,.28),inset 0 -1px 2px rgba(255,255,255,.25),0 0 0 1px rgba(0,0,0,.06),0 10px 24px -14px rgba(20,40,90,.55);cursor:pointer;transition:transform .45s cubic-bezier(.34,1.45,.64,1)}
.tt-b:active{transform:scale(.97)}
.tt-b:focus-visible{outline:2px solid #22c55e;outline-offset:4px}
.tt-b>*{position:absolute;pointer-events:none}
.tt-sky{inset:0;background:linear-gradient(180deg,#3E97EC,#86C8FF)}
.tt-ngt{inset:0;opacity:0;background:linear-gradient(180deg,#151840,#2C3170);transition:opacity .6s}
.tt-halo{left:6px;top:6px;width:62px;height:62px;transition:transform .75s cubic-bezier(.34,1.45,.64,1)}
.tt-halo i{position:absolute;left:50%;top:50%;border-radius:50%;background:rgba(255,255,255,.12);transform:translate(-50%,-50%)}
.tt-halo i:nth-child(1){width:96px;height:96px}
.tt-halo i:nth-child(2){width:132px;height:132px;background:rgba(255,255,255,.09)}
.tt-halo i:nth-child(3){width:170px;height:170px;background:rgba(255,255,255,.06)}
.tt-cl{right:-14px;bottom:-16px;width:136px;height:68px;transition:transform .6s cubic-bezier(.2,.8,.2,1) .05s}
.tt-cl g{animation:tt-drift 7s ease-in-out infinite alternate}
.tt-cl g+g{animation-duration:5.5s}
@keyframes tt-drift{to{transform:translateX(-5px)}}
.tt-sr{left:16px;top:8px;width:90px;height:58px;opacity:0;transform:translateY(-36px);transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .4s}
.tt-sr path,.tt-sr circle{fill:#fff;transform-box:fill-box;transform-origin:center;animation:tt-tw 2.4s ease-in-out infinite}
.tt-sr :nth-child(2n){animation-delay:-.8s}.tt-sr :nth-child(3n){animation-delay:-1.6s}
@keyframes tt-tw{50%{opacity:.45;transform:scale(.7)}}
.tt-th{left:6px;top:6px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE27A,#FFC21F 60%,#F2A900);box-shadow:0 4px 8px rgba(0,0,0,.28),inset -3px -4px 6px rgba(190,110,0,.35),inset 3px 3px 5px rgba(255,255,255,.45);transition:transform .75s cubic-bezier(.34,1.45,.64,1)}
.tt-th::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F4F3FA,#D6D3E6 65%,#B9B5CF);box-shadow:inset -3px -4px 6px rgba(70,64,110,.35),inset 3px 3px 5px rgba(255,255,255,.6);opacity:0;transition:opacity .45s .1s}
.tt-th svg{position:absolute;inset:0;width:62px;height:62px}
.tt-th circle{fill:#A9A4C4;opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(0);transition:opacity .3s,transform .5s cubic-bezier(.34,1.45,.64,1)}
.tt-th circle:nth-child(2){transition-delay:.06s}.tt-th circle:nth-child(3){transition-delay:.12s}
.tt-b[aria-checked="true"] .tt-ngt{opacity:1}
.tt-b[aria-checked="true"] .tt-halo{transform:translateX(102px)}
.tt-b[aria-checked="true"] .tt-th{transform:translateX(102px) rotate(200deg)}
.tt-b[aria-checked="true"] .tt-th::before{opacity:1}
.tt-b[aria-checked="true"] .tt-th circle{opacity:1;transform:none;transition-delay:.25s}
.tt-b[aria-checked="true"] .tt-cl{transform:translateY(56px);transition-delay:0s}
.tt-b[aria-checked="true"] .tt-sr{opacity:1;transform:none;transition-delay:.15s}
@media (max-width:480px){.tt-box{width:60px;height:26px}.tt-b{scale:.3405}}
@media (prefers-reduced-motion:reduce){.tt-b *{animation:none!important;transition-duration:.001ms!important}}
`;

export default function ThemeToggle() {
  const [theme, setT] = useState<Theme>(getTheme());
  useEffect(() => {
    const on = () => setT(getTheme());
    window.addEventListener('dp-theme', on);
    return () => window.removeEventListener('dp-theme', on);
  }, []);
  const dark = theme === 'dark';
  return (
    <span className="tt-box">
      <style>{CSS}</style>
      <button type="button" className="tt-b" role="switch" aria-checked={dark}
        aria-label={dark ? 'Chuyển sang chế độ ngày' : 'Chuyển sang chế độ đêm'}
        title={dark ? 'Chế độ đêm' : 'Chế độ ngày'}
        onClick={() => setTheme(dark ? 'light' : 'dark')}>
        <span className="tt-sky" />
        <span className="tt-ngt" />
        <svg className="tt-sr" viewBox="0 0 90 58" aria-hidden="true"><path d="M14 9Q14 14 19 14Q14 14 14 19Q14 14 9 14Q14 14 14 9Z"/><path d="M42 6Q42 10 46 10Q42 10 42 14Q42 10 38 10Q42 10 42 6Z"/><path d="M28 31Q28 35 32 35Q28 35 28 39Q28 35 24 35Q28 35 28 31Z"/><path d="M60 23Q60 26 63 26Q60 26 60 29Q60 26 57 26Q60 26 60 23Z"/><circle cx="7" cy="31" r="1.3"/><circle cx="50" cy="42" r="1.1"/><circle cx="68" cy="10" r="1.3"/><circle cx="36" cy="51" r="1"/><circle cx="76" cy="38" r="1"/></svg>
        <span className="tt-halo"><i /><i /><i /></span>
        <svg className="tt-cl" viewBox="0 0 136 68" aria-hidden="true"><g fill="#CFE7FF"><circle cx="34" cy="46" r="18"/><circle cx="58" cy="36" r="20"/><circle cx="86" cy="40" r="18"/><circle cx="110" cy="28" r="21"/><circle cx="132" cy="40" r="18"/></g><g fill="#FFFFFF"><circle cx="22" cy="60" r="16"/><circle cx="46" cy="52" r="18"/><circle cx="74" cy="56" r="18"/><circle cx="98" cy="46" r="19"/><circle cx="124" cy="54" r="19"/></g></svg>
        <span className="tt-th"><svg viewBox="0 0 62 62" aria-hidden="true"><circle cx="22" cy="24" r="6.5"/><circle cx="40" cy="38" r="8"/><circle cx="39" cy="18" r="3.6"/></svg></span>
      </button>
    </span>
  );
}
