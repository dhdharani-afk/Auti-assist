import { useEffect, useState } from 'react';
import api from '../services/api';
import useBuddyPreference from '../hooks/useBuddyPreference';
import './PixelBuddy.css';

export default function PixelBuddy({
  animation,
  state = 'idle',
  label = 'AutiAssist Buddy',
  message,
  animationsEnabled = true,
  sensoryFriendly = false,
  className = '',
}) {
  const [buddyEnabled] = useBuddyPreference();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [savedAnimationsEnabled, setSavedAnimationsEnabled] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/api/settings')
      .then((response) => {
        if (active) setSavedAnimationsEnabled(response.data.animations ?? true);
      })
      .catch((error) => {
        console.warn('Buddy could not load the saved animation preference.', error);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setPaused(false);
  }, [animation, state]);

  useEffect(() => {
    const pauseForControl = (event) => {
      if (event.target?.closest?.('button, a, input, select, textarea, [role="button"]')) {
        setPaused(true);
      }
    };
    document.addEventListener('pointerdown', pauseForControl, true);
    document.addEventListener('keydown', pauseForControl, true);
    return () => {
      document.removeEventListener('pointerdown', pauseForControl, true);
      document.removeEventListener('keydown', pauseForControl, true);
    };
  }, []);

  const isStatic = !buddyEnabled || !animationsEnabled || !savedAnimationsEnabled || sensoryFriendly || reducedMotion || paused;
  const requestedAnimation = animation ?? state;
  const safeState = ['idle', 'wave', 'happy', 'celebrate', 'walk'].includes(requestedAnimation)
    ? requestedAnimation
    : 'idle';

  return (
    <div className={`pixel-buddy-wrap ${className}`.trim()} aria-label={message ? `${label}: ${message}` : label}>
      <span className={`pixel-buddy ${isStatic ? 'is-static' : ''}`} data-state={safeState} aria-hidden="true">
        <svg className="pixel-buddy-sprite" viewBox="0 0 96 100" role="img">
          <g className="pixel-buddy-shadow">
            <rect x="25" y="89" width="46" height="5" rx="2" />
          </g>
          <g className="pixel-buddy-legs">
            <path className="pixel-buddy-leg pixel-buddy-leg-left" d="M36 73h10v13h-5v6H29v-6h7z" />
            <path className="pixel-buddy-leg pixel-buddy-leg-right" d="M52 73h10v13h5v6H53v-6h-1z" />
          </g>
          <g className="pixel-buddy-arms">
            <path className="pixel-buddy-arm pixel-buddy-arm-left" d="M29 46h-8v6h-5v15h8v-8h5z" />
            <path className="pixel-buddy-arm pixel-buddy-arm-right" d="M67 46h8v6h5v15h-8v-8h-5z" />
          </g>
          <path className="pixel-buddy-body" d="M32 50h32v6h5v20H27V56h5z" />
          <path className="pixel-buddy-belly" d="M38 61h20v10H38z" />
          <path className="pixel-buddy-head" d="M27 17h6v-5h30v5h6v5h5v27h-5v5H27v-5h-5V22h5z" />
          <path className="pixel-buddy-screen" d="M32 23h32v20H32z" />
          <g className="pixel-buddy-face">
            <path className="pixel-buddy-eye pixel-buddy-eye-left" d="M39 29h5v5h-5z" />
            <path className="pixel-buddy-eye pixel-buddy-eye-right" d="M53 29h5v5h-5z" />
            <path className="pixel-buddy-mouth" d="M41 37h5v3h7v-3h5v5H41z" />
          </g>
          <path className="pixel-buddy-antenna" d="M46 12V7h5V2h8v7h-8v3z" />
          <path className="pixel-buddy-cheek pixel-buddy-cheek-left" d="M34 36h4v3h-4z" />
          <path className="pixel-buddy-cheek pixel-buddy-cheek-right" d="M58 36h4v3h-4z" />
          <g className="pixel-buddy-sparkles">
            <path d="M12 26h5v5h-5zm5-5h5v5h-5zM77 30h5v5h-5zm5-5h5v5h-5z" />
            <path d="M9 49h5v5H9zm73 16h5v5h-5z" />
          </g>
        </svg>
      </span>
      {message && <span className="pixel-buddy-message">{message}</span>}
    </div>
  );
}
