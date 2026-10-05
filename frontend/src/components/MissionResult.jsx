import { useNavigate } from 'react-router-dom';

export default function MissionResult({ starsEarned, title = '🎉 Mission complete!' }) {
  const navigate = useNavigate();

  return (
    <div className="mission-result" role="status">
      <div className="mission-result-icon" aria-hidden="true">🎉</div>
      <h2>{title}</h2>
      <p>You completed this mission! ✨</p>
      <strong className="mission-result-stars">⭐ {starsEarned} stars earned</strong>
      <button type="button" className="primary-btn" onClick={() => navigate('/dashboard')}>
        EXPLORE MORE
      </button>
    </div>
  );
}
