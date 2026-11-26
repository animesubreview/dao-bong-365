import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, onAuthChange } from '../lib/auth';
import { getRatingSummary, setMovieRating, removeMovieRating, RatingSummary } from '../lib/ratings';

const STAR = 'M9 1.3l2.3 4.8 5.2.7-3.8 3.6.9 5.2L9 13.1l-4.6 2.5.9-5.2L1.5 6.8l5.2-.7z';
const LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Hay', 'Tuyệt vời'];

const CSS = `
.mr{--am:#F5A524;--s3:rgba(255,255,255,.1);color:#f4f0e8;font-variant-numeric:tabular-nums}
.mr-w{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.mr-avg{flex:none;width:112px}
.mr-n{display:block;font-size:52px;font-weight:700;line-height:1;letter-spacing:-.045em}
.mr-st{position:relative;display:block;width:101px;height:18px;margin-top:10px}
.mr-st svg{position:absolute;left:0;top:0;width:101px;height:18px}
.mr-st .bs path{fill:var(--s3)}
.mr-st .fl{clip-path:inset(0 100% 0 0);transition:clip-path 1s cubic-bezier(.3,.7,.2,1) .15s}
.mr-st .fl path{fill:var(--am)}
.mr.in .mr-st .fl{clip-path:inset(0 var(--cut) 0 0)}
.mr-dt{display:block;margin-top:8px;font-size:12px;color:rgba(244,240,232,.5)}
.mr-ls{flex:1;min-width:200px;margin:0;padding:0;list-style:none;display:grid;gap:4px}
.mr-row{display:grid;grid-template-columns:24px 1fr 46px;align-items:center;gap:8px;height:24px;padding:0 4px;border-radius:7px;font-size:12px;color:rgba(244,240,232,.7);outline:none;transition:opacity .25s,background .2s}
.mr-row>span:first-child{display:flex;align-items:center;gap:2px;font-weight:600}
.mr-row>span:first-child svg{width:9px;height:9px;fill:rgba(244,240,232,.45);transition:fill .2s}
.mr-bar{position:relative;height:8px;border-radius:4px;background:var(--s3);overflow:hidden}
.mr-bar i{position:absolute;inset:0;border-radius:inherit;background:var(--am);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.34,1.45,.64,1);transition-delay:calc(.25s + var(--k)*90ms)}
.mr.in .mr-bar i{transform:scaleX(var(--p))}
.mr-v{position:relative;display:grid;justify-items:end;height:16px;overflow:hidden}
.mr-v b,.mr-v em{grid-area:1/1;font-style:normal;line-height:16px;transition:opacity .2s,transform .35s cubic-bezier(.34,1.45,.64,1)}
.mr-v b{font-weight:500}.mr-v em{opacity:0;transform:translateY(12px);font-weight:650;color:#fff}
.mr-ls.hov .mr-row{opacity:.38}
.mr-ls.hov .mr-row.on{opacity:1;background:rgba(255,255,255,.07)}
.mr-row.on>span:first-child svg{fill:var(--am)}
.mr-row.on .mr-v b{opacity:0;transform:translateY(-12px)}
.mr-row.on .mr-v em{opacity:1;transform:none}
.mr-mine{margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mr-pick{display:flex;gap:4px}
.mr-pick button{background:none;border:0;padding:2px;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.45,.64,1)}
.mr-pick button:hover{transform:scale(1.25)}
.mr-pick svg{width:28px;height:28px;fill:rgba(255,255,255,.14);transition:fill .15s}
.mr-pick svg.on{fill:var(--am)}
@media (prefers-reduced-motion:reduce){.mr *{transition-duration:.001ms!important}}
`;

export default function MovieRating({ movieSlug }: { movieSlug: string }) {
  const [user, setUser] = useState(getCurrentUser());
  const [sum, setSum] = useState<RatingSummary | null>(null);
  const [hover, setHover] = useState(0);
  const [hov, setHov] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [inView, setInView] = useState(false);
  const [shown, setShown] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => onAuthChange(u => setUser(u)), []);

  useEffect(() => {
    let off = false;
    setSum(null); setInView(false);
    getRatingSummary(movieSlug, user?.uid).then(s => { if (!off) setSum(s); });
    return () => { off = true; };
  }, [movieSlug, user?.uid]);

  // Chạy animation khi cuộn tới
  useEffect(() => {
    if (!sum || !root.current) return;
    const el = root.current;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { io.disconnect(); setInView(true); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [sum]);

  // Số đếm tăng dần
  useEffect(() => {
    if (!inView || !sum) return;
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      setShown(sum.avg * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, sum?.avg]);

  const rate = async (n: number) => {
    if (!user || saving || !sum) return;
    setSaving(true);
    try {
      if (sum.mine === n) await removeMovieRating(movieSlug, user.uid);
      else await setMovieRating(movieSlug, user.uid, n);
      setSum(await getRatingSummary(movieSlug, user.uid));
    } finally { setSaving(false); }
  };

  const total = sum?.total || 0;
  const max = Math.max(1, ...(sum?.dist || [0]));
  const half = Math.round((sum?.avg || 0) * 2) / 2, whole = Math.floor(half);
  const cut = (101 - (whole * 20.75 + (half - whole) * 18)).toFixed(2);
  const stars = [0, 1, 2, 3, 4].map(k => <path key={k} transform={`translate(${k * 20.75} 0)`} d={STAR} />);
  const active = hover || sum?.mine || 0;

  return (
    <section className="mr rounded-2xl border border-white/10 bg-slate-900/60 p-5" aria-label="Đánh giá phim">
      <style>{CSS}</style>
      <h2 className="text-lg font-bold mb-4">Đánh giá phim</h2>
      <div ref={root} className={`mr-root ${inView ? 'in' : ''}`}>
        {!sum ? (
          <div className="text-sm text-slate-400">Đang tải đánh giá…</div>
        ) : (
          <div className={`mr ${inView ? 'in' : ''}`} style={{ ['--cut' as any]: cut + 'px' }}>
            <div className="mr-w">
              <div className="mr-avg">
                <span className="mr-n" aria-label={`Điểm trung bình ${sum.avg.toFixed(1)} trên 5`}>{shown.toFixed(1)}</span>
                <span className="mr-st" role="img" aria-hidden="true">
                  <svg className="bs" viewBox="0 0 101 18">{stars}</svg>
                  <svg className="fl" viewBox="0 0 101 18">{stars}</svg>
                </span>
                <span className="mr-dt">{total.toLocaleString('vi-VN')} đánh giá</span>
              </div>
              <ul className={`mr-ls ${hov !== null ? 'hov' : ''}`} onPointerLeave={() => setHov(null)}>
                {sum.dist.map((n, k) => {
                  const p = total ? Math.round((n / total) * 100) : 0;
                  return (
                    <li key={k} className={`mr-row ${hov === k ? 'on' : ''}`} tabIndex={0}
                      onPointerEnter={() => setHov(k)} onFocus={() => setHov(k)} onBlur={() => setHov(null)}
                      aria-label={`${5 - k} sao: ${n} đánh giá, ${p}%`}>
                      <span aria-hidden="true">{5 - k}<svg viewBox="0 0 18 18"><path d={STAR} /></svg></span>
                      <span className="mr-bar" aria-hidden="true"><i style={{ ['--k' as any]: k, ['--p' as any]: (n / max).toFixed(3) }} /></span>
                      <span className="mr-v" aria-hidden="true"><b>{p}%</b><em>{n.toLocaleString('vi-VN')}</em></span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mr-mine">
              {user ? (
                <>
                  <span className="text-sm text-slate-300">{sum.mine ? 'Đánh giá của bạn:' : 'Bạn thấy phim thế nào?'}</span>
                  <div className="mr-pick" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" disabled={saving} aria-label={`${n} sao`}
                        onMouseEnter={() => setHover(n)} onClick={() => rate(n)}>
                        <svg viewBox="0 0 18 18" className={n <= active ? 'on' : ''}><path d={STAR} /></svg>
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-amber-300 min-w-[80px]">{LABELS[active]}</span>
                  {sum.mine > 0 && <span className="text-xs text-slate-500">Bấm lại đúng số sao để huỷ</span>}
                </>
              ) : (
                <span className="text-sm text-slate-300">
                  <Link to="/auth" className="text-amber-400 font-semibold hover:underline">Đăng nhập</Link> để đánh giá phim này.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
