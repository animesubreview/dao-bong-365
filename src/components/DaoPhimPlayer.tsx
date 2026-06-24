import React, { useEffect, useState } from 'react';
import { subscribePlayerConfig, PlayerConfig, DEFAULT_CONFIG } from '../lib/playerConfig';

interface DaoPhimPlayerProps {
  src: string;
  title?: string;
  className?: string;
  onEnded?: () => void;
}

export default function DaoPhimPlayer({ src, title, className = '' }: DaoPhimPlayerProps) {
  const [config, setConfig] = useState<PlayerConfig>(DEFAULT_CONFIG);

  // Subscribe to Firestore config - realtime updates for all users
  useEffect(() => {
    const unsub = subscribePlayerConfig(setConfig);
    return unsub;
  }, []);

  if (!src) return null;

  // Logo position styles
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    pointerEvents: 'none',
    opacity: config.logoOpacity / 100,
    ...(config.logoPosition === 'top-left'     ? { top: 14, left: 14 }    :
        config.logoPosition === 'top-right'    ? { top: 14, right: 14 }   :
        config.logoPosition === 'bottom-left'  ? { bottom: 14, left: 14 } :
                                                  { bottom: 14, right: 14 }),
  };

  const mid = Math.ceil((config.logoText || '').length / 2);

  return (
    <div className={`relative bg-black ${className}`} style={{ aspectRatio: '16/9' }}>
      {/* iframe player từ KKPhim */}
      <iframe
        src={src}
        className="w-full h-full"
        style={{ border: 'none', display: 'block' }}
        allowFullScreen
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        title={title || 'Video'}
        referrerPolicy="no-referrer"
      />

      {/* Logo overlay đè lên iframe */}
      {config.logoType !== 'none' && (
        <div style={logoStyle}>
          {config.logoType === 'text' && (
            <div style={{
              fontFamily: "'Nunito', 'Space Grotesk', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: config.logoSize,
              textShadow: '0 1px 6px rgba(0,0,0,1), 0 2px 12px rgba(0,0,0,0.8)',
              letterSpacing: '-0.3px',
              lineHeight: 1,
              color: config.logoColor2,
              userSelect: 'none',
            }}>
              <span style={{ color: config.logoColor1 }}>
                {(config.logoText || '').slice(0, mid)}
              </span>
              {(config.logoText || '').slice(mid)}
            </div>
          )}
          {config.logoType === 'image' && config.logoImageUrl && (
            <img
              src={config.logoImageUrl}
              alt="logo"
              style={{
                maxHeight: config.logoSize * 2.5,
                maxWidth: 150,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
