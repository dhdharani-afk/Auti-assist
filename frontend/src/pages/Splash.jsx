import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/auth'), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="page-shell" style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
      <div style={{ textAlign: 'center', padding: '30px' }} className="fade-in-up">
        <div
          className="logo-mark floaty"
          style={{ width: '82px', height: '82px', fontSize: '2rem', margin: '0 auto 18px' }}
        >
          A
        </div>
        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4.7rem)', margin: '0', letterSpacing: '0.06em' }}>AUTIASSIST</h1>
        <p style={{ fontSize: '1.4rem', margin: '12px 0 8px', color: 'var(--text-soft)' }}>Learn • Communicate • Grow</p>
        <p style={{ color: 'var(--text-soft)', fontSize: '1.05rem' }}>Your friendly learning companion</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '18px' }}>
          <div className="loading-spinner" aria-label="Loading"></div>
        </div>
      </div>
      <small style={{ position: 'absolute', bottom: '12px', color: 'var(--text-soft)', fontSize: '0.65rem' }}>
        DVELOPED BY DHARANI AND LOGESH
      </small>
    </div>
  );
}
