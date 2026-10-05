import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

export default function Rewards() {
  const [data, setData] = useState({ stars: 0, streak: 0, completed_activities: 0, badges_earned: 0, achievements: 0, badges: [], rewards: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRewards = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/rewards');
      setData(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Rewards could not load. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, []);

  return (
    <div>
      <div className="topbar"><div><h1 className="page-title">My Rewards</h1><p className="subtle">Celebrate real practice and completed activities.</p></div></div>
      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={fetchRewards}>Retry</button></div>}
      {loading ? <div className="card">Loading your rewards...</div> : (
        <>
          <div className="grid grid-4">
            <div className="card"><div className="metric-label">Stars</div><div className="metric-value">⭐ {data.stars}</div></div>
            <div className="card"><div className="metric-label">Badges</div><div className="metric-value">🏅 {data.badges_earned}</div></div>
            <div className="card"><div className="metric-label">Current Streak</div><div className="metric-value">🔥 {data.streak} days</div></div>
            <div className="card"><div className="metric-label">Completed Activities</div><div className="metric-value">🎯 {data.completed_activities}</div></div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ marginTop: 0 }}>Badges</h2>
            {data.badges.length ? <div className="reward-badge-grid">{data.badges.map((badge) => <div key={badge.name} className={`reward-badge ${badge.earned ? 'earned' : ''}`}><span>{badge.icon}</span><strong>{badge.name}</strong><small>{badge.earned ? 'Earned' : 'Not earned yet'}</small></div>)}</div> : <p>No badges are available yet.</p>}
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ marginTop: 0 }}>Star milestones</h2>
            {data.rewards.length ? <div className="reward-badge-grid">{data.rewards.map((reward) => <div key={reward.name} className={`reward-badge ${reward.earned ? 'earned' : ''}`}><span>{reward.earned ? '🏆' : '⭐'}</span><strong>{reward.name}</strong><small>{reward.earned ? 'Reached' : `${Math.max(0, reward.stars - data.stars)} stars to go`}</small></div>)}</div> : <p>Complete an activity to begin your star journey.</p>}
          </div>
        </>
      )}
    </div>
  );
}
