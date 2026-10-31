import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';
import { speakText } from '../services/speech';
import PixelBuddy from '../components/PixelBuddy';

const badgeDescriptions = {
  'First Steps': 'You completed your first learning or practice activity!',
  'Learning Explorer': 'You answered learning questions and explored new ideas.',
  'Game Explorer': 'You completed games and learned while playing.',
  'Clear Communicator': 'You practiced communicating with words and sentences.',
  'Routine Star': 'You completed activities in your daily routine.',
  'Kind Practice': 'You practiced helpful ways to connect with others.',
};

const initialData = {
  stars: 0,
  streak: 0,
  completed_activities: 0,
  badges_earned: 0,
  achievements: 0,
  badges: [],
  rewards: [],
};

function getMotivation(data, newUnlocks) {
  if (newUnlocks.length) return '🏅 You unlocked something special!';
  const achievementTotal = data.badges.length + data.rewards.length;
  const reachedHalfway = achievementTotal > 0 && data.achievements >= Math.ceil(achievementTotal / 2);
  if (reachedHalfway) {
    return '🔥 Wow! Look how far you’ve come!';
  }
  if (data.achievements > 0 || data.completed_activities > 0 || data.stars > 0) {
    return '⭐ You’re doing amazing! Keep going!';
  }
  return '🌱 Every small step is an achievement!';
}

function snapshotUnlocks(previous, next) {
  if (!previous) return [];
  const unlocked = [];
  const previousBadges = new Map(previous.badges.map((badge) => [badge.name, badge.earned]));
  next.badges.forEach((badge) => {
    if (badge.earned && !previousBadges.get(badge.name)) {
      unlocked.push({ name: badge.name, icon: badge.icon, type: 'badge' });
    }
  });
  const previousMilestones = new Map(previous.rewards.map((milestone) => [milestone.name, milestone.earned]));
  next.rewards.forEach((milestone) => {
    if (milestone.earned && !previousMilestones.get(milestone.name)) {
      unlocked.push({ name: milestone.name, icon: '⭐', type: 'milestone' });
    }
  });
  return unlocked;
}

function RewardModal({ badge, onClose, soundEnabled }) {
  const closeButtonRef = useRef(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]');
      const focusable = dialog?.querySelectorAll('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const earnedStatus = badge.earned ? '✓ Earned · Great job!' : '🔒 Keep practicing to unlock!';
  const earnedDate = badge.earned_at ? new Date(badge.earned_at) : null;
  const validEarnedDate = earnedDate && !Number.isNaN(earnedDate.getTime());

  return (
    <div
      className="rewards-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="rewards-modal" role="dialog" aria-modal="true" aria-labelledby="rewards-modal-title">
        <button ref={closeButtonRef} type="button" className="rewards-modal-close" aria-label="Close badge details" onClick={onClose}>×</button>
        <span className={`rewards-modal-icon ${badge.earned ? 'earned' : 'locked'}`} aria-hidden="true">
          {badge.earned ? badge.icon : '🔒'}
        </span>
        <span className="rewards-eyebrow">BADGE DETAILS</span>
        <h2 id="rewards-modal-title">{badge.name}</h2>
        <p>{badgeDescriptions[badge.name] || 'Keep exploring activities and celebrating your practice.'}</p>
        <strong className={`rewards-modal-status ${badge.earned ? 'earned' : 'locked'}`}>{earnedStatus}</strong>
        {badge.earned && (
          <small className="rewards-date-note">
            {validEarnedDate
              ? `Earned ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(earnedDate)}`
              : 'Date earned is not available.'}
          </small>
        )}
        {soundEnabled && (
          <button
            type="button"
            className="ghost-btn rewards-listen"
            onClick={() => speakText(`${badge.name}. ${badgeDescriptions[badge.name] || ''}`)}
          >
            🔊 Listen
          </button>
        )}
      </section>
    </div>
  );
}

export default function Rewards() {
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [newUnlocks, setNewUnlocks] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const previousDataRef = useRef(null);
  const badgeTriggerRef = useRef(null);

  const fetchRewards = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const rewardResponse = await api.get('/api/rewards');
      const nextData = {
        ...initialData,
        ...rewardResponse.data,
        badges: Array.isArray(rewardResponse.data.badges) ? rewardResponse.data.badges : [],
        rewards: Array.isArray(rewardResponse.data.rewards) ? rewardResponse.data.rewards : [],
      };
      const storageKey = user?.id ? `autiassist-rewards-seen-${user.id}` : '';
      let savedSnapshot = null;
      if (storageKey) {
        try {
          const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
          if (parsed && Array.isArray(parsed.badges) && Array.isArray(parsed.rewards)) savedSnapshot = parsed;
        } catch (storageError) {
          console.warn('Previously viewed reward progress could not be read.', storageError);
        }
      }
      const sameUser = previousDataRef.current?.userId === user?.id;
      const previousData = sameUser
        ? previousDataRef.current.data
        : savedSnapshot;
      const unlocked = snapshotUnlocks(previousData, nextData);
      if (unlocked.length || !sameUser) setNewUnlocks(unlocked);
      previousDataRef.current = { userId: user?.id, data: nextData };
      if (storageKey) {
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify({
            badges: nextData.badges.map(({ name, earned, icon }) => ({ name, earned, icon })),
            rewards: nextData.rewards.map(({ name, earned, stars }) => ({ name, earned, stars })),
          }));
        } catch (storageError) {
          console.warn('Current reward progress could not be saved for unlock announcements.', storageError);
        }
      }
      setData(nextData);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Rewards could not load. Please try again.'));
    } finally {
      setLoading(false);
    }

    try {
      const settingsResponse = await api.get('/api/settings');
      setSoundEnabled(settingsResponse.data.sound ?? true);
      setAnimationsEnabled(settingsResponse.data.animations ?? true);
    } catch (requestError) {
      console.warn('Reward accessibility preferences could not be loaded.', requestError);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRewards();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') fetchRewards(false);
    };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [fetchRewards, user?.id]);

  const earnedBadges = useMemo(() => data.badges.filter((badge) => badge.earned).length, [data.badges]);
  const nextMilestone = useMemo(
    () => [...data.rewards].sort((left, right) => left.stars - right.stars).find((reward) => !reward.earned),
    [data.rewards],
  );
  const priorMilestone = useMemo(() => {
    if (!nextMilestone) return 0;
    return [...data.rewards]
      .filter((reward) => reward.earned && reward.stars < nextMilestone.stars)
      .reduce((highest, reward) => Math.max(highest, reward.stars), 0);
  }, [data.rewards, nextMilestone]);
  const milestoneProgress = nextMilestone
    ? Math.min(100, Math.max(0, ((data.stars - priorMilestone) / (nextMilestone.stars - priorMilestone)) * 100))
    : 100;
  const motivation = getMotivation(data, newUnlocks);

  const closeBadgeModal = useCallback(() => setSelectedBadge(null), []);
  const closeCelebration = () => setNewUnlocks([]);

  return (
    <main className={`rewards-page ${animationsEnabled ? '' : 'rewards-sensory-friendly'}`}>
      <header className="rewards-hero-header">
        <div>
          <span className="rewards-eyebrow">YOUR PRACTICE IS SHINING</span>
          <h1 className="page-title">🏆 My Rewards</h1>
          <p className="rewards-header-lead">Look how much you’ve accomplished! Keep growing! 🌟</p>
          <p className="rewards-header-subtitle">Every little achievement counts! 💪</p>
        </div>
        <PixelBuddy
          state={newUnlocks.length ? 'celebrate' : 'wave'}
          message={newUnlocks.length ? 'You earned a new achievement!' : 'Keep growing, star collector!'}
          animationsEnabled={animationsEnabled}
          className="rewards-pixel-buddy"
        />
      </header>

      {error && (
        <div className="auth-message error rewards-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost-btn" onClick={() => fetchRewards()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="card rewards-loading" role="status">Loading your real achievements…</div>
      ) : (
        <>
          {newUnlocks.length > 0 && (
            <section className="rewards-unlock-banner" role="status" aria-live="polite">
              <span aria-hidden="true">🎉</span>
              <div>
                <strong>Achievement Unlocked!</strong>
                <p>{newUnlocks.map((item) => `${item.icon} ${item.name}`).join(' · ')}</p>
                <small>You did it! Keep going! ⭐</small>
              </div>
              <button type="button" className="ghost-btn" onClick={closeCelebration} aria-label="Dismiss achievement celebration">×</button>
            </section>
          )}

          <section className="rewards-stat-grid" aria-label="Your achievement summary">
            <article className="rewards-stat-card stars">
              <span aria-hidden="true">⭐</span><small>Stars</small>
              <strong>{data.stars}</strong><p>Keep shining!</p>
            </article>
            <article className="rewards-stat-card badges">
              <span aria-hidden="true">🏅</span><small>Badges</small>
              <strong>{data.badges_earned}</strong><p>You’re collecting them!</p>
            </article>
            <article className="rewards-stat-card streak">
              <span aria-hidden="true">🔥</span><small>Streak</small>
              <strong>{data.streak} <em>days</em></strong><p>Keep it going!</p>
            </article>
            <article className="rewards-stat-card activities">
              <span aria-hidden="true">🎯</span><small>Activities</small>
              <strong>{data.completed_activities}</strong><p>Great effort!</p>
            </article>
          </section>

          <section className="rewards-star-hero">
            <div className="rewards-star-copy">
              <span className="rewards-eyebrow">YOUR STAR POWER</span>
              <h2>⭐ {data.stars} Stars</h2>
              <p>{data.stars > 0 ? 'You’ve earned so many stars! 🌟' : 'Your star journey starts with your next activity! 🌱'}</p>
            </div>
            <div className="rewards-next-milestone">
              {nextMilestone ? (
                <>
                  <div className="rewards-milestone-label">
                    <span>Next milestone</span><strong>{nextMilestone.stars} ⭐</strong>
                  </div>
                  <div className="rewards-milestone-track" role="progressbar" aria-label={`Progress to ${nextMilestone.stars} star milestone`} aria-valuemin="0" aria-valuemax={nextMilestone.stars - priorMilestone} aria-valuenow={Math.min(nextMilestone.stars - priorMilestone, Math.max(0, data.stars - priorMilestone))}>
                    <span style={{ width: `${milestoneProgress}%` }} />
                  </div>
                  <small>{data.stars} / {nextMilestone.stars} stars</small>
                </>
              ) : (
                <div className="rewards-all-milestones">
                  <span>🌟</span><strong>You’ve reached all star milestones!</strong>
                  <small>Keep collecting stars as you practice.</small>
                </div>
              )}
            </div>
          </section>

          <p className="rewards-motivation" aria-live="polite">{motivation}</p>

          <section className="rewards-section-card">
            <div className="rewards-section-heading">
              <div><span className="rewards-eyebrow">YOUR COLLECTION</span><h2>🏅 Badge Collection</h2></div>
              <span className="rewards-section-count">{earnedBadges} of {data.badges.length} earned</span>
            </div>
            {data.badges.length ? (
              <div className="rewards-badge-grid">
                {data.badges.map((badge) => (
                  <button
                    type="button"
                    key={badge.name}
                    className={`rewards-badge-card ${badge.earned ? 'earned' : 'locked'}`}
                    onClick={(event) => {
                      badgeTriggerRef.current = event.currentTarget;
                      setSelectedBadge(badge);
                    }}
                    aria-label={`${badge.name}, ${badge.earned ? 'earned' : 'locked'}. View details`}
                  >
                    <span className="rewards-badge-icon" aria-hidden="true">{badge.earned ? badge.icon : '🔒'}</span>
                    <strong>{badge.name}</strong>
                    <small>{badge.earned ? '✓ Earned' : 'Keep practicing to unlock!'}</small>
                    {badge.earned && <em>Great job!</em>}
                  </button>
                ))}
              </div>
            ) : <p className="rewards-empty">Badge details will appear here when available.</p>}
          </section>

          <section className="rewards-section-card rewards-milestone-section">
            <div className="rewards-section-heading">
              <div><span className="rewards-eyebrow">ONE STAR AT A TIME</span><h2>⭐ Milestone Journey</h2></div>
            </div>
            {data.rewards.length ? (
              <ol className="rewards-milestone-path" aria-label="Star milestones">
                {[...data.rewards].sort((left, right) => left.stars - right.stars).map((milestone) => (
                  <li className={`rewards-milestone-node ${milestone.earned ? 'reached' : ''} ${milestone === nextMilestone ? 'next' : ''}`} key={milestone.name}>
                    <span className="rewards-milestone-marker" aria-hidden="true">{milestone.earned ? '✓' : '⭐'}</span>
                    <strong>{milestone.stars} ⭐</strong>
                    <small>{milestone.earned ? 'Reached' : milestone === nextMilestone ? 'NEXT' : `${Math.max(0, milestone.stars - data.stars)} to go`}</small>
                    {milestone === nextMilestone && <span className="rewards-node-progress">{Math.max(0, data.stars - priorMilestone)} / {milestone.stars - priorMilestone}</span>}
                  </li>
                ))}
                {!nextMilestone && <li className="rewards-milestone-node all-reached"><span className="rewards-milestone-marker" aria-hidden="true">🌟</span><strong>ALL</strong><small>Milestones reached!</small></li>}
              </ol>
            ) : <p className="rewards-empty">Complete an activity to begin your star journey.</p>}
          </section>

          <section className="rewards-recent-card">
            <span aria-hidden="true">✨</span>
            <div>
              <span className="rewards-eyebrow">RECENT ACHIEVEMENT</span>
              {data.badges_earned === 0 && data.achievements === 0 ? (
                <p>Complete an activity to unlock your first achievement! 🌟</p>
              ) : (
                <p>Your earned badges are shown in your collection. Recent reward dates aren’t available yet.</p>
              )}
            </div>
          </section>
        </>
      )}

      {selectedBadge && (
        <RewardModal
          badge={selectedBadge}
          onClose={() => {
            closeBadgeModal();
            if (badgeTriggerRef.current?.isConnected) badgeTriggerRef.current.focus();
          }}
          soundEnabled={soundEnabled}
        />
      )}
    </main>
  );
}
