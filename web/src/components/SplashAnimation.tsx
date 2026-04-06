import React, { useEffect, useState } from 'react';

interface Props { onDone: () => void; }

// Scene timing (ms)
const SCENES = [
  { name: 'wind',   start: 0,    bg: 'linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%)' },
  { name: 'clouds', start: 2000, bg: 'linear-gradient(180deg, #6B8FA3 0%, #7BA89A 100%)' },
  { name: 'rain',   start: 4000, bg: 'linear-gradient(180deg, #4A6741 0%, #3D5A38 100%)' },
  { name: 'sun',    start: 6500, bg: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 100%)' },
  { name: 'grow',   start: 8500, bg: 'linear-gradient(180deg, #87CEEB 0%, #228B22 100%)' },
  { name: 'truck',  start: 11000, bg: 'linear-gradient(180deg, #87CEEB 0%, #228B22 100%)' },
];

export default function SplashAnimation({ onDone }: Props) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCENES.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setSceneIdx(i), SCENES[i].start));
    });
    // Fade out before done
    timers.push(setTimeout(() => setOpacity(0), 13000));
    timers.push(setTimeout(() => onDone(), 13800));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const scene = SCENES[sceneIdx].name;
  const bg = SCENES[sceneIdx].bg;

  return (
    <div style={{ ...s.stage, background: bg, opacity, transition: 'background 1.8s ease, opacity 0.8s ease' }}>

      {/* Ground */}
      <div style={s.ground} />

      {/* WIND */}
      {scene === 'wind' && <>
        <div style={s.sky}>
          <span style={{ ...s.sun2, opacity: 0.9 }}>☀️</span>
        </div>
        {[0,1,2,3,4].map(i => (
          <span key={i} style={{ ...s.leaf, top: `${15+i*14}%`, animationDelay: `${i*0.25}s`, animationDuration: `${1.8+i*0.2}s` }}>
            {['🍃','🌿','🍂','🍃','🌿'][i]}
          </span>
        ))}
        <div style={s.sceneText}>💨 Wind sweeps across the fields...</div>
      </>}

      {/* CLOUDS */}
      {scene === 'clouds' && <>
        <span style={{ ...s.cloudEl, left: '5%',  top: '8%',  fontSize: 64, animationDuration: '8s' }}>☁️</span>
        <span style={{ ...s.cloudEl, left: '35%', top: '4%',  fontSize: 80, animationDuration: '10s', animationDelay: '0.5s' }}>☁️</span>
        <span style={{ ...s.cloudEl, left: '65%', top: '10%', fontSize: 56, animationDuration: '7s',  animationDelay: '1s' }}>☁️</span>
        <div style={s.sceneText}>☁️ Storm clouds gather...</div>
      </>}

      {/* RAIN */}
      {scene === 'rain' && <>
        <span style={{ ...s.cloudEl, left: '10%', top: '2%',  fontSize: 72 }}>⛈️</span>
        <span style={{ ...s.cloudEl, left: '45%', top: '0%',  fontSize: 80 }}>🌧️</span>
        <span style={{ ...s.cloudEl, left: '70%', top: '3%',  fontSize: 64 }}>⛈️</span>
        {Array.from({length: 24}).map((_,i) => (
          <div key={i} style={{ ...s.drop, left: `${i*4.2}%`, animationDelay: `${(i*0.07)%0.9}s`, animationDuration: `${0.55+i%3*0.15}s` }} />
        ))}
        <div style={s.sceneText}>🌧️ Rain nourishes the earth...</div>
      </>}

      {/* SUN */}
      {scene === 'sun' && <>
        <span style={s.bigSun}>☀️</span>
        <div style={s.sceneText}>☀️ The sun shines bright!</div>
      </>}

      {/* GROW */}
      {scene === 'grow' && <>
        <span style={s.bigSun}>☀️</span>
        {[12,26,40,54,68,82].map((left,i) => (
          <span key={i} style={{ ...s.plantEl, left: `${left}%`, animationDelay: `${i*0.18}s` }}>🌾</span>
        ))}
        <div style={s.sceneText}>🌾 Crops are ready to harvest!</div>
      </>}

      {/* TRUCK */}
      {scene === 'truck' && <>
        <span style={s.bigSun}>☀️</span>
        {[12,26,40,54,68,82].map((left,i) => (
          <span key={i} style={{ ...s.plantFading, left: `${left}%`, animationDelay: `${0.3+i*0.1}s` }}>🌾</span>
        ))}
        <span style={s.truckEl}>🚛</span>
        <div style={s.sceneText}>🚛 Harvest loaded — off to market!</div>
      </>}

      {/* Brand */}
      <div style={s.brand}>
        <span style={s.brandName}>🌾 AgriConnect</span>
        <span style={s.brandSub}>Smart Farming Platform</span>
      </div>

      <style>{`
        @keyframes leafFly {
          0%   { transform: translateX(-10vw) rotate(0deg) translateY(0); opacity:1; }
          100% { transform: translateX(110vw) rotate(540deg) translateY(-30px); opacity:0; }
        }
        @keyframes cloudSway {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(25px); }
        }
        @keyframes rainDrop {
          0%   { transform: translateY(-10px); opacity:0.8; }
          100% { transform: translateY(100vh); opacity:0; }
        }
        @keyframes sunPulse {
          0%,100% { transform: scale(1);    filter: drop-shadow(0 0 24px #FFD700); }
          50%     { transform: scale(1.12); filter: drop-shadow(0 0 48px #FFA500); }
        }
        @keyframes plantGrow {
          0%   { transform: translateY(60px) scale(0.2); opacity:0; }
          60%  { transform: translateY(-8px) scale(1.1); opacity:1; }
          100% { transform: translateY(0)    scale(1);   opacity:1; }
        }
        @keyframes plantFade {
          0%   { opacity:1; transform: translateY(0) scale(1); }
          100% { opacity:0; transform: translateY(-40px) scale(0.5); }
        }
        @keyframes truckMove {
          0%   { transform: translateX(-160px); }
          100% { transform: translateX(110vw); }
        }
        @keyframes brandGlow {
          0%,100% { text-shadow: 0 0 16px rgba(255,255,255,0.6), 0 0 32px rgba(82,183,136,0.4); }
          50%     { text-shadow: 0 0 32px rgba(255,255,255,0.9), 0 0 64px rgba(82,183,136,0.7); }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  stage: {
    position: 'fixed', inset: 0, zIndex: 9999,
    overflow: 'hidden', fontFamily: 'sans-serif',
  },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  ground: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%',
    background: 'linear-gradient(to bottom, #4a7c3f, #2d5a1b)',
    borderRadius: '50% 50% 0 0 / 12% 12% 0 0',
  },
  sceneText: {
    position: 'absolute', bottom: '36%', left: 0, right: 0,
    textAlign: 'center', color: 'rgba(255,255,255,0.92)',
    fontSize: 16, fontWeight: 600, letterSpacing: 0.5,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  leaf: {
    position: 'absolute', fontSize: 28,
    animation: 'leafFly linear infinite',
  },
  cloudEl: {
    position: 'absolute',
    animation: 'cloudSway ease-in-out infinite',
  },
  drop: {
    position: 'absolute', top: '18%',
    width: 2, height: 18,
    background: 'linear-gradient(to bottom, transparent, #7ec8e3)',
    borderRadius: 2,
    animation: 'rainDrop linear infinite',
  },
  bigSun: {
    position: 'absolute', top: '6%', right: '8%',
    fontSize: 72,
    animation: 'sunPulse 2.5s ease-in-out infinite',
  },
  sun2: {
    position: 'absolute', top: '6%', right: '8%', fontSize: 60,
  },
  plantEl: {
    position: 'absolute', bottom: '30%', fontSize: 52,
    animation: 'plantGrow 0.9s cubic-bezier(0.22,1,0.36,1) forwards',
    opacity: 0,
  },
  plantFading: {
    position: 'absolute', bottom: '30%', fontSize: 52,
    animation: 'plantFade 1.8s ease forwards',
  },
  truckEl: {
    position: 'absolute', bottom: '28%', fontSize: 72,
    animation: 'truckMove 2.2s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
  },
  brand: {
    position: 'absolute', bottom: 32, left: 0, right: 0,
    textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4,
  },
  brandName: {
    fontSize: 34, fontWeight: 900, color: '#fff',
    animation: 'brandGlow 2s ease-in-out infinite',
    display: 'block',
  },
  brandSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, display: 'block',
  },
};
