// src/components/GeoBlockPage.tsx
import React from 'react';

export default function GeoBlockPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');

        @keyframes gb-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gb-flag-pop {
          0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          70%  { transform: scale(1.1) rotate(3deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
        @keyframes gb-pulse {
          0%, 100% { box-shadow: 0 0 28px rgba(34,197,94,0.2); }
          50%       { box-shadow: 0 0 52px rgba(34,197,94,0.45); }
        }
        .gb-card  { animation: gb-fade-in 0.65s cubic-bezier(.22,1,.36,1) both; }
        .gb-flag  { animation: gb-flag-pop 0.75s cubic-bezier(.22,1,.36,1) 0.15s both; }
        .gb-circle{ animation: gb-pulse 2.8s ease-in-out 0.8s infinite; }
        .gb-badge { animation: gb-fade-in 0.55s ease 0.4s both; }
        .gb-body  { animation: gb-fade-in 0.55s ease 0.55s both; }
        .gb-hint  { animation: gb-fade-in 0.55s ease 0.7s both; }
      `}</style>

      <div
        className="gb-card"
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 24,
          padding: '40px 32px 36px',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Flag circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            className="gb-circle"
            style={{
              width: 108, height: 108, borderRadius: '50%',
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              border: '2px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span className="gb-flag" style={{ fontSize: 58, lineHeight: 1, display: 'block' }}>
              🇻🇳
            </span>
            {/* Lock badge */}
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 34, height: 34, borderRadius: '50%',
              background: '#dc2626', border: '2.5px solid #0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="gb-badge" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)',
          borderRadius: 999, padding: '4px 14px', marginBottom: 18,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Truy cập bị hạn chế
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 26, fontWeight: 900, color: '#f1f5f9',
          marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.2,
        }}>
          Chỉ dành cho{' '}
          <span style={{ color: '#22c55e' }}>IP Việt Nam</span>
        </div>

        {/* Body */}
        <div className="gb-body" style={{
          fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 28,
        }}>
          Xin chào! Đảo Phim chỉ phục vụ người dùng tại{' '}
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Việt Nam</strong>.
          <br />
          IP hiện tại của bạn không thuộc Việt Nam, vui lòng sử dụng{' '}
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>VPN Việt Nam</strong>{' '}
          để truy cập.
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 22 }} />

        {/* Tips */}
        <div className="gb-hint" style={{
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 12, padding: '14px 18px', textAlign: 'left',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: '#4ade80',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            💡 Gợi ý
          </div>
          {[
            'Dùng VPN có server đặt tại Việt Nam',
            'Thử các VPN miễn phí: Proton VPN, Windscribe…',
            'Nếu bạn đang ở VN, hãy tắt VPN và thử lại',
          ].map((tip, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              marginBottom: i < 2 ? 6 : 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)',
            }}>
              <span style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }}>✓</span>
              {tip}
            </div>
          ))}
        </div>

        {/* Retry button */}
        <button
          onClick={() => {
            try { sessionStorage.removeItem('daophim_geo'); } catch { /* ignore */ }
            window.location.reload();
          }}
          style={{
            marginTop: 22, width: '100%', padding: '13px 0', borderRadius: 12,
            border: '1.5px solid rgba(34,197,94,0.4)', background: 'transparent',
            color: '#4ade80', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(34,197,94,0.12)'; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; }}
        >
          🔄 Thử lại sau khi bật VPN
        </button>
      </div>

      {/* Brand watermark */}
      <div style={{
        marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.22)',
        fontWeight: 700, letterSpacing: '0.04em',
      }}>
        © Đảo Phim · Chỉ dành cho người dùng Việt Nam
      </div>
    </div>
  );
}
