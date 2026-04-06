import React, { useState } from 'react';
import axios from 'axios';
import SplashAnimation from '../components/SplashAnimation';

type Role = 'Farmer' | 'Service_Provider' | 'Admin';

const ROLES: { value: Role; icon: string; label: string; desc: string; color: string }[] = [
  { value: 'Farmer',           icon: '🧑‍🌾', label: 'Farmer',           desc: 'Book farming services',   color: '#2d6a4f' },
  { value: 'Service_Provider', icon: '🛠️',  label: 'Service Provider', desc: 'Manage your listings',    color: '#e76f51' },
  { value: 'Admin',            icon: '⚙️',  label: 'Admin',            desc: 'Platform management',     color: '#457b9d' },
];

interface RoleLoginState {
  phone: string;
  otp: string;
  step: 'phone' | 'otp';
  loading: boolean;
  error: string;
  devOtp: string;
}

const initState = (): RoleLoginState => ({ phone: '', otp: '', step: 'phone', loading: false, error: '', devOtp: '' });

export default function LoginPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [states, setStates] = useState<Record<Role, RoleLoginState>>({
    Farmer: initState(),
    Service_Provider: initState(),
    Admin: initState(),
  });

  function update(role: Role, patch: Partial<RoleLoginState>) {
    setStates(s => ({ ...s, [role]: { ...s[role], ...patch } }));
  }

  async function sendOtp(role: Role) {
    const { phone } = states[role];
    update(role, { loading: true, error: '' });
    try {
      const res = await axios.post('/api/auth/login', { phone, role });
      update(role, { step: 'otp', loading: false, devOtp: res.data.devOtp ?? '' });
    } catch (e: any) {
      update(role, { loading: false, error: e.response?.data?.error || 'Failed to send OTP' });
    }
  }

  async function verifyOtp(role: Role) {
    const { phone, otp } = states[role];
    update(role, { loading: true, error: '' });
    try {
      const res = await axios.post('/api/auth/verify-otp', { phone, otp });
      localStorage.clear();
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const r = res.data.user?.role;
      if (r === 'Service_Provider') window.location.replace('/provider');
      else if (r === 'Admin') window.location.replace('/admin');
      else window.location.replace('/dashboard');
    } catch (e: any) {
      update(role, { loading: false, error: e.response?.data?.error || 'Invalid OTP' });
    }
  }

  if (!splashDone) return <SplashAnimation onDone={() => setSplashDone(true)} />;

  return (
    <div style={s.page}>
      {/* Animated background */}
      <div style={s.bgOverlay} />
      {['🌾','🌿','🍃','🌾','🌻','🌾','🍀','🌿'].map((p, i) => (
        <span key={i} style={{ ...s.particle, left: `${8+i*12}%`, animationDelay: `${i*0.5}s`, animationDuration: `${4+i*0.4}s` }}>{p}</span>
      ))}

      <div style={s.content}>
        {/* Header */}
        <div style={s.header}>
          <span style={s.logo}>🌾</span>
          <h1 style={s.title}>AgriConnect</h1>
          <p style={s.subtitle}>Smart Farming Platform</p>
        </div>

        <p style={s.prompt}>Choose your role to get started</p>

        {/* Three role cards side by side on desktop, stacked on mobile */}
        <div style={s.grid}>
          {ROLES.map(role => {
            const st = states[role.value];
            return (
              <div key={role.value} style={{ ...s.card, borderTop: `4px solid ${role.color}` }}>
                <div style={s.roleHeader}>
                  <span style={s.roleIcon}>{role.icon}</span>
                  <div>
                    <div style={{ ...s.roleLabel, color: role.color }}>{role.label}</div>
                    <div style={s.roleDesc}>{role.desc}</div>
                  </div>
                </div>

                {st.step === 'phone' ? (
                  <>
                    <input style={s.input} type="tel"
                      placeholder="+91 99999 99999"
                      value={st.phone}
                      onChange={e => update(role.value, { phone: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && st.phone && sendOtp(role.value)} />
                    <button style={{ ...s.btn, background: role.color, opacity: st.loading || !st.phone ? 0.6 : 1 }}
                      onClick={() => sendOtp(role.value)} disabled={st.loading || !st.phone}>
                      {st.loading ? '⏳ Sending...' : 'Get OTP →'}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={s.sentTo}>OTP sent to {st.phone}</p>
                    {st.devOtp && <div style={s.devOtp}>Dev OTP: <strong>{st.devOtp}</strong></div>}
                    <input style={{ ...s.input, letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
                      type="number" placeholder="• • • • • •"
                      value={st.otp}
                      onChange={e => update(role.value, { otp: e.target.value })}
                      maxLength={6} />
                    <button style={{ ...s.btn, background: role.color, opacity: st.loading || st.otp.length < 4 ? 0.6 : 1 }}
                      onClick={() => verifyOtp(role.value)} disabled={st.loading || st.otp.length < 4}>
                      {st.loading ? '⏳ Verifying...' : '✓ Login'}
                    </button>
                    <button style={s.backBtn} onClick={() => update(role.value, { step: 'phone', otp: '', error: '' })}>
                      ← Change number
                    </button>
                  </>
                )}
                {st.error && <p style={s.error}>{st.error}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes particleRise {
          0%   { transform: translateY(100px) rotate(0deg); opacity:0; }
          20%  { opacity:0.2; }
          100% { transform: translateY(-120px) rotate(360deg); opacity:0; }
        }
        @keyframes titleGlow {
          0%,100% { text-shadow: 0 0 20px rgba(82,183,136,0.6), 0 0 40px rgba(45,106,79,0.4); }
          50%     { text-shadow: 0 0 40px rgba(149,213,178,0.9), 0 0 80px rgba(82,183,136,0.6); }
        }
        @keyframes logoFloat {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50%     { transform: translateY(-10px) rotate(5deg); }
        }
        @input::placeholder { color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a2e1a 0%, #1b4332 50%, #0d3320 100%)',
    fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bgOverlay: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(82,183,136,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute', bottom: '5%', fontSize: 20, opacity: 0,
    animation: 'particleRise ease-in-out infinite',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 960,
    padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  header: { textAlign: 'center', marginBottom: 8 },
  logo: {
    fontSize: 64, display: 'block', marginBottom: 8,
    animation: 'logoFloat 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 16px rgba(82,183,136,0.8))',
  },
  title: {
    fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 4px',
    animation: 'titleGlow 2.5s ease-in-out infinite',
  },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, letterSpacing: 2, margin: 0 },
  prompt: { color: 'rgba(255,255,255,0.75)', fontSize: 16, margin: '20px 0 16px', fontWeight: 500 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16, width: '100%',
  },
  card: {
    background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
    borderRadius: 16, padding: '20px 20px 16px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  roleHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  roleIcon: { fontSize: 36 },
  roleLabel: { fontWeight: 700, fontSize: 16 },
  roleDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15,
    boxSizing: 'border-box', outline: 'none',
  },
  btn: {
    width: '100%', padding: '12px', color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.2s',
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontSize: 12, padding: 0,
  },
  sentTo: { color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 },
  devOtp: {
    background: 'rgba(82,183,136,0.15)', borderRadius: 8, padding: '6px 10px',
    color: '#95d5b2', fontSize: 12, textAlign: 'center',
  },
  error: { color: '#ff6b6b', fontSize: 12, margin: 0, textAlign: 'center' },
};
