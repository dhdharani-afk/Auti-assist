import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stopSpeaking } from '../services/speech';

export default function MissionActivityLayout({ eyebrow, title, description, children }) {
  const navigate = useNavigate();

  useEffect(() => () => stopSpeaking(), []);

  return (
    <div className="mission-activity-page fade-in-up">
      <div className="topbar mission-activity-topbar">
        <div>
          <span className="dashboard-eyebrow">{eyebrow}</span>
          <h1 className="page-title">{title}</h1>
          <p className="subtle">{description}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => navigate('/dashboard')}>
          ← Today’s Mission
        </button>
      </div>
      <div className="mission-activity-card card">{children}</div>
    </div>
  );
}
