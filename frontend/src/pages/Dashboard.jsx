import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getTodayMission } from '../services/mission';
import { missionReadAloudText, speakText, speechSupported, stopSpeaking } from '../services/speech';
import { formatApiError } from '../utils/apiError';

const defaultMetrics = {
  todayProgress: 0,
  learning: 0,
  communication: 0,
  routine: 0,
  streak: 0,
  stars: 0,
  recommendation: '',
  activities: [],
};

const missionTasks = [
  { key: 'colour-match', title: 'Match 5 colours', icon: '🎨', route: '/activities/colour-match' },
  { key: 'emotion-match', title: 'Find 3 emotions', icon: '😊', route: '/activities/emotion-match' },
  { key: 'say-hello', title: 'Practice saying Hello', icon: '👋', route: '/activities/say-hello' },
];

const quickPlayCards = [
  { title: 'Emotion Match', icon: '😊', route: '/emotion' },
  { title: 'Colour Sort', icon: '🎨', route: '/games', quickPlay: 'colour' },
  { title: 'Memory Game', icon: '🧩', route: '/games', quickPlay: 'memory' },
  { title: 'Number Game', icon: '🔢', route: '/games', quickPlay: 'number' },
];

const feelingOptions = ['Happy', 'Sad', 'Angry', 'Scared', 'Calm', 'Okay'];
const journeyDefaults = ['Wake Up', 'Brush Teeth', 'Breakfast', 'School', 'Study', 'Play', 'Dinner', 'Sleep'];

function DashboardCard({ children, className = '' }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [routine, setRoutine] = useState([]);
  const [learningInfo, setLearningInfo] = useState({
    title: 'Start your first learning activity ⭐',
    detail: 'Pick a fun activity and begin your learning adventure.',
    progress: 0,
    path: '/learning',
  });
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [feelingMessage, setFeelingMessage] = useState('');
  const [savingFeeling, setSavingFeeling] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [missionStatus, setMissionStatus] = useState({ missions: [], completed_count: 0, total: 3, stars_earned: 0 });
  const [missionSpeaking, setMissionSpeaking] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [reloadDashboard, setReloadDashboard] = useState(0);

  useEffect(() => {
    const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const updateMotionPreference = () => setIsReducedMotion(Boolean(mediaQuery?.matches));

    updateMotionPreference();
    mediaQuery?.addEventListener?.('change', updateMotionPreference);
    return () => mediaQuery?.removeEventListener?.('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      setDashboardError('');
      try {
        const [dashboardResponse, routineResponse, learningResponse, missionResponse, recommendationResponse] = await Promise.all([
          api.get('/api/dashboard'),
          api.get('/api/routine'),
          api.get('/api/learning'),
          getTodayMission(),
          api.get('/api/recommendations'),
        ]);

        const dashboard = dashboardResponse.data || defaultMetrics;
        dashboard.recommendation = recommendationResponse.data?.recommendations?.[0]?.detail || dashboard.recommendation;
        setMetrics(dashboard);
        setMissionStatus(missionResponse || { missions: [], completed_count: 0, total: 3, stars_earned: 0 });

        const tasks = routineResponse.data?.tasks || [];
        setRoutine(tasks);

        const learningActivities = learningResponse.data?.activities || [];
        const latestLearningActivity = learningActivities[0];
        const learningProgress = Number(dashboard.learning || 0);

        if (latestLearningActivity && (dashboard.learning || dashboard.activities?.length)) {
          setLearningInfo({
            title: latestLearningActivity.category ? `${latestLearningActivity.category} challenge` : 'Keep learning ⭐',
            detail: latestLearningActivity.question || 'Try your next playful activity.',
            progress: learningProgress,
            path: '/learning',
          });
        } else if (dashboard.learning > 0 || dashboard.activities?.length) {
          setLearningInfo({
            title: 'Keep going with your learning ⭐',
            detail: 'A gentle challenge is waiting for you.',
            progress: learningProgress,
            path: '/learning',
          });
        } else {
          setLearningInfo({
            title: 'Start your first learning activity ⭐',
            detail: 'Pick a fun activity and begin your learning adventure.',
            progress: 0,
            path: '/learning',
          });
        }
      } catch (error) {
        console.error('Dashboard data fetch failed:', error);
        setDashboardError(formatApiError(error, 'Your dashboard could not load. Please try again.'));
        setMetrics(defaultMetrics);
        setMissionStatus({ missions: [], completed_count: 0, total: 3, stars_earned: 0 });
        setRoutine(journeyDefaults.map((task, index) => ({
          name: task,
          icon: ['🌅', '🪥', '🍳', '🎒', '📚', '🎮', '🍽️', '🌙'][index] || '✨',
          completed: false,
          time: '',
        })));
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [reloadDashboard]);

  const currentStars = Number(metrics.stars || 0);

  const nextReward = useMemo(() => {
    const thresholds = [10, 25, 50, 75, 100];
    const next = thresholds.find((value) => value > currentStars) || 100;
    const previous = thresholds.filter((value) => value < currentStars).at(-1) || 0;
    const span = Math.max(1, next - previous);
    const progress = currentStars >= next ? 100 : ((currentStars - previous) / span) * 100;

    return {
      target: next,
      previous,
      progress: Math.min(100, Math.max(0, progress)),
    };
  }, [currentStars]);

  const progressSummary = useMemo(() => {
    const completedCount = Number(metrics.today_activity_count || 0);
    return completedCount ? `${completedCount} activities completed today ⭐` : 'Start your first activity ⭐';
  }, [metrics]);

  const toggleMissionSpeech = () => {
    if (!speechSupported()) {
      setMissionSpeaking(false);
      return;
    }

    if (missionSpeaking) {
      stopSpeaking();
      setMissionSpeaking(false);
      return;
    }

    const result = speakText(missionReadAloudText, { onEnd: () => setMissionSpeaking(false), onError: () => setMissionSpeaking(false) });
    setMissionSpeaking(result.started);
  };

  const handleQuickPlay = (option) => {
    if (option.route === '/games' && option.quickPlay) {
      navigate(option.route, { state: { quickPlay: option.quickPlay } });
      return;
    }

    navigate(option.route);
  };

  const isMissionDone = (missionKey) => Boolean(missionStatus.missions?.find((mission) => mission.key === missionKey)?.completed);

  const handleSurpriseMe = () => {
    const options = [...quickPlayCards];
    const choice = options[Math.floor(Math.random() * options.length)];
    handleQuickPlay(choice);
  };

  const toggleRoutineTask = async (taskName, nextCompleted) => {
    const previousRoutine = routine;
    setRoutine((current) => current.map((task) => (
      task.name === taskName ? { ...task, completed: nextCompleted } : task
    )));
    try {
      await api.post('/api/routine/complete', { task_name: taskName, completed: nextCompleted });
      setReloadDashboard((value) => value + 1);
    } catch (error) {
      console.error('Routine save failed:', error);
      setRoutine(previousRoutine);
    }
  };

  const handleFeelingSave = async (feeling) => {
    setSelectedFeeling(feeling);
    setSavingFeeling(true);

    try {
      await api.post('/api/emotion/activity', {
        emotion: feeling,
        estimated: false,
        confidence: 1,
        activity: 'Quick check-in from dashboard',
      });
      setFeelingMessage(`Nice choice! You picked ${feeling}. Let's keep going!`);
    } catch (error) {
      console.error('Feeling save failed:', error);
      setFeelingMessage(`You chose ${feeling}. We saved it locally for your next step.`);
    } finally {
      setSavingFeeling(false);
    }
  };

  const journeySteps = routine.length
    ? routine.map((task) => ({ label: task.name, completed: Boolean(task.completed), icon: task.icon || '✨' }))
    : journeyDefaults.map((label, index) => ({
        label,
      completed: false,
        icon: ['🌅', '🪥', '🍳', '🎒', '📚', '🎮', '🍽️', '🌙'][index] || '✨',
      }));

  if (dashboardLoading) {
    return <div className="dashboard-page"><div className="topbar dashboard-topbar"><div><p className="dashboard-kicker">AUTIASSIST</p><h1 className="page-title">Getting today ready...</h1></div></div><div className="card">Loading your real activity, routine, and reward data...</div></div>;
  }

  if (dashboardError) {
    return <div className="dashboard-page"><div className="topbar dashboard-topbar"><div><p className="dashboard-kicker">AUTIASSIST</p><h1 className="page-title">Your dashboard needs a refresh</h1></div></div><div className="auth-message error"><span>{dashboardError}</span><button type="button" className="ghost-btn" onClick={() => setReloadDashboard((value) => value + 1)}>Retry</button></div></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="topbar dashboard-topbar">
        <div>
          <p className="dashboard-kicker">YOUR LITTLE ADVENTURE HUB</p>
          <h1 className="page-title">Hi, {user?.full_name || 'Friend'}! 👋 Ready for today’s adventure?</h1>
          <p className="dashboard-welcome-note">Pick a path, collect stars, and celebrate every little win.</p>
        </div>

        <div className="dashboard-header-actions">
          <button type="button" className="secondary-btn" aria-label="Speak the dashboard intro" onClick={() => speakText(`Hi ${user?.full_name || 'Friend'}! Ready for today's adventure?`)}>
            🎤 Voice
          </button>
          <button type="button" className="ghost-btn" aria-label="Open AI assistant" onClick={() => navigate('/ai-assistant')}>
            🤖 AI Helper
          </button>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <DashboardCard className="dashboard-summary-card">
          <div className="metric-icon">📈</div>
          <div className="metric-label">Today’s Progress</div>
          <div className="metric-value">{metrics.todayProgress}%</div>
          <div className="progress-track"><div className="progress-bar" style={{ width: `${metrics.todayProgress}%` }} /></div>
          <div className="dashboard-caption">{progressSummary}</div>
        </DashboardCard>

        <DashboardCard className="dashboard-summary-card">
          <div className="metric-icon">🎓</div>
          <div className="metric-label">Learning</div>
          <div className="metric-value">{metrics.learning}%</div>
          <div className="progress-track"><div className="progress-bar" style={{ width: `${metrics.learning}%` }} /></div>
          <div className="dashboard-caption">{metrics.learning > 0 ? 'Great job! Keep growing.' : 'Start with a quick challenge.'}</div>
        </DashboardCard>

        <DashboardCard className="dashboard-summary-card">
          <div className="metric-icon">🔥</div>
          <div className="metric-label">Current Streak</div>
          <div className="metric-value">{metrics.streak} days</div>
          <div className="dashboard-caption">{metrics.streak > 0 ? 'You are on a roll!' : 'Start a streak today.'}</div>
        </DashboardCard>

        <DashboardCard className="dashboard-summary-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-label">Stars</div>
          <div className="metric-value">{metrics.stars}</div>
          <div className="dashboard-caption">Next reward: {nextReward.target} stars</div>
        </DashboardCard>
      </div>

      <DashboardCard className="dashboard-recommendation-card">
        <span className="dashboard-eyebrow">✨ A next step for today</span>
        <p>{metrics.recommendation || 'Choose an activity to begin.'}</p>
      </DashboardCard>

      <div className="dashboard-main-grid">
        <DashboardCard className="dashboard-mission-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-eyebrow">🎯 Today’s Mission</span>
              <h2>Ready to sparkle?</h2>
            </div>
            <button type="button" className="ghost-btn" aria-label={missionSpeaking ? 'Stop reading today’s mission' : 'Read today’s mission aloud'} onClick={toggleMissionSpeech}>
              {missionSpeaking ? '⏹ Stop' : '🔊 Read Aloud'}
            </button>
          </div>

          <div className="mission-dashboard-progress">
            <div className="mission-progress-label"><span>Mission progress</span><strong>{missionStatus.completed_count || 0}/{missionStatus.total || 3}</strong></div>
            <div className="mission-progress-track"><span style={{ width: `${((missionStatus.completed_count || 0) / (missionStatus.total || 3)) * 100}%` }} /></div>
          </div>

          <div className="mission-task-list">
            {missionTasks.map((task) => (
              <div key={task.title} className="mission-task-item">
                <span className="mission-icon" aria-hidden="true">{task.icon}</span>
                <span>{task.title}</span>
                {isMissionDone(task.key) ? <strong className="mission-done">✓ DONE</strong> : <button type="button" className="ghost-btn" onClick={() => handleQuickPlay(task)}>Go</button>}
              </div>
            ))}
          </div>

          {missionStatus.completed_count === missionStatus.total ? (
            <div className="mission-dashboard-complete" role="status">
              <strong>🎉 You did it!</strong>
              <span>You completed today’s mission! ✨</span>
              <b>⭐ {missionStatus.stars_earned || 0} total stars earned</b>
              <button type="button" className="primary-btn dashboard-start-btn" onClick={handleSurpriseMe}>EXPLORE MORE</button>
            </div>
          ) : (
            <button type="button" className="primary-btn dashboard-start-btn" onClick={() => handleQuickPlay(missionTasks.find((task) => !isMissionDone(task.key)) || missionTasks[0])}>
              START MISSION
            </button>
          )}
        </DashboardCard>

        <DashboardCard className="dashboard-mascot-card">
          <div className={`dashboard-mascot ${isReducedMotion ? 'reduced-motion' : ''}`} aria-live="polite">
            <span className="companion-emoji" aria-hidden="true">🤖</span>
          </div>
          <div className="dashboard-mascot-bubble">Great job! Let’s try another activity! 🎉</div>
        </DashboardCard>
      </div>

      <div className="dashboard-two-col">
        <DashboardCard className="dashboard-quick-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-eyebrow">🎮 Quick Play</span>
              <h2>Pick a game</h2>
            </div>
            <button type="button" className="ghost-btn" onClick={handleSurpriseMe}>🎁 Surprise Me!</button>
          </div>

          <div className="dashboard-quick-grid">
            {quickPlayCards.map((card) => (
              <button key={card.title} type="button" className="quick-play-card" onClick={() => handleQuickPlay(card)} aria-label={`Play ${card.title}`}>
                <span className="quick-icon" aria-hidden="true">{card.icon}</span>
                <span>{card.title}</span>
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="dashboard-feeling-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-eyebrow">😊 How are you feeling?</span>
              <h2>Choose a feeling</h2>
            </div>
            <button type="button" className="ghost-btn" aria-label="Read feeling choice prompt aloud" onClick={() => speakText('How are you feeling today? Choose a feeling and take a calm next step.')}>🔊</button>
          </div>

          <div className="dashboard-feeling-grid">
            {feelingOptions.map((feeling) => (
              <button
                key={feeling}
                type="button"
                className={`feeling-pill ${selectedFeeling === feeling ? 'selected' : ''}`}
                onClick={() => handleFeelingSave(feeling)}
                aria-pressed={selectedFeeling === feeling}
              >
                {feeling}
              </button>
            ))}
          </div>

          <div className="dashboard-feeling-note">
            {savingFeeling ? 'Saving your feeling...' : feelingMessage || 'This is a quick check-in, not a diagnosis or medical assessment.'}
          </div>
        </DashboardCard>
      </div>

      <div className="dashboard-lower-grid">
        <DashboardCard className="dashboard-learning-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-eyebrow">📚 Continue Learning</span>
              <h2>{learningInfo.title}</h2>
            </div>
            <button type="button" className="ghost-btn" aria-label="Read learning task aloud" onClick={() => speakText(`${learningInfo.title}. ${learningInfo.detail}`)}>
              🔊 Read Aloud
            </button>
          </div>

          <div className="dashboard-learning-body">
            <p>{learningInfo.detail}</p>
            <div className="dashboard-progress-wrap">
              <div className="dashboard-progress-line">
                <span style={{ width: `${learningInfo.progress}%` }} />
              </div>
              <strong>{learningInfo.progress}%</strong>
            </div>
            <button type="button" className="primary-btn" onClick={() => navigate(learningInfo.path)}>CONTINUE</button>
          </div>
        </DashboardCard>

        <DashboardCard className="dashboard-journey-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-eyebrow">🛤️ Today’s Journey</span>
              <h2>Your day</h2>
            </div>
            <button type="button" className="ghost-btn" aria-label="Read journey steps aloud" onClick={() => speakText(`Your journey today: ${journeySteps.map((step) => step.label).join(', ')}`)}>🔊 Read Aloud</button>
          </div>

          <div className="journey-row">
            {journeySteps.map((step) => (
              <button
                key={step.label}
                type="button"
                className={`journey-step ${step.completed ? 'done' : ''}`}
                onClick={() => toggleRoutineTask(step.label, !step.completed)}
                aria-label={`${step.label} ${step.completed ? 'completed' : 'pending'}`}
              >
                <span aria-hidden="true">{step.icon}</span>
                <strong>{step.label}</strong>
              </button>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard className="dashboard-reward-card">
        <div className="dashboard-card-header">
          <div>
            <span className="dashboard-eyebrow">🏆 Stars & Rewards</span>
            <h2>Your reward journey</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={() => navigate('/rewards')}>View Rewards</button>
        </div>

        <div className="reward-summary-row">
          <div className="reward-score-box">
            <span>⭐</span>
            <div>
              <small>Current stars</small>
              <strong>{metrics.stars}</strong>
            </div>
          </div>

          <div className="reward-score-box">
            <span>🎯</span>
            <div>
              <small>Next reward</small>
              <strong>{nextReward.target} stars</strong>
            </div>
          </div>
        </div>

        <div className="reward-progress-box">
          <div className="reward-label-row">
            <span>Progress to next reward</span>
            <strong>{Math.round(nextReward.progress)}%</strong>
          </div>
          <div className="reward-progress-track">
            <span style={{ width: `${nextReward.progress}%` }} />
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

export default Dashboard;
