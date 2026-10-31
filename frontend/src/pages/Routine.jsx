import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';
import PixelBuddy from '../components/PixelBuddy';

const taskDetails = {
  'Wake Up': { icon: '🌅', description: 'Good morning! A fresh day is waiting for you! ☀️' },
  'Brush Teeth': { icon: '🪥', description: 'Keep that smile shining! 😁✨' },
  Breakfast: { icon: '🍎', description: "Let’s fuel up for a great day! 💪" },
  School: { icon: '🎒', description: 'Ready to learn something amazing? 🌟' },
  Study: { icon: '📚', description: 'Every little step helps you grow! 🧠⭐' },
  Play: { icon: '🎮', description: 'Time for some fun! You earned it! 🎉' },
  Dinner: { icon: '🍽️', description: 'Time to recharge and enjoy! ❤️' },
  Sleep: { icon: '🌙', description: 'You did great today. Time to rest! 🌙💤' },
};

function getMotivation(completion) {
  if (completion === 100) return '🎉 Amazing! You completed your whole routine today!';
  if (completion >= 76) return '🚀 Almost there! Finish your adventure!';
  if (completion >= 51) return '🔥 Wow! You’re more than halfway there!';
  if (completion >= 26) return '⭐ You’re making great progress! Keep going!';
  return '🌱 Every journey starts with one small step!';
}

export default function Routine() {
  const [tasks, setTasks] = useState([]);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState('');
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sensoryFriendly, setSensoryFriendly] = useState(false);

  const fetchRoutine = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/routine');
      const routineTasks = response.data.tasks || [];
      setTasks(routineTasks);
      setCompletion(typeof response.data.completion === 'number' ? response.data.completion : 0);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Routine could not load. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutine();
    api.get('/api/settings')
      .then((response) => {
        setSoundEnabled(response.data.sound ?? true);
        setSensoryFriendly(response.data.animations === false);
      })
      .catch((requestError) => {
        console.warn('Routine preferences could not be loaded.', requestError);
      });
  }, [fetchRoutine]);

  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);
  const nextTask = useMemo(() => tasks.find((task) => !task.completed), [tasks]);
  const motivation = getMotivation(completion);
  const isComplete = tasks.length > 0 && completedCount === tasks.length;

  const toggleTask = async (taskName, completedOverride) => {
    const currentTask = tasks.find((task) => task.name === taskName);
    if (!currentTask || savingTask) return;
    const nextCompleted = typeof completedOverride === 'boolean' ? completedOverride : !currentTask.completed;
    const previousTasks = tasks;
    const nextTasks = tasks.map((task) => task.name === taskName ? { ...task, completed: nextCompleted } : task);
    setTasks(nextTasks);
    setCompletion(Math.round((nextTasks.filter((task) => task.completed).length / Math.max(1, nextTasks.length)) * 100));
    setSavingTask(taskName);
    setError('');

    try {
      const response = await api.post('/api/routine/complete', { task_name: taskName, completed: nextCompleted });
      if (typeof response.data?.completion === 'number') setCompletion(response.data.completion);
    } catch (requestError) {
      setTasks(previousTasks);
      setCompletion(Math.round((previousTasks.filter((task) => task.completed).length / Math.max(1, previousTasks.length)) * 100));
      setError(formatApiError(requestError, 'That routine step could not be saved. Please try again.'));
    } finally {
      setSavingTask('');
    }
  };

  const toggleSound = async () => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    try {
      await api.put('/api/settings', { sound: nextSound });
    } catch (requestError) {
      setSoundEnabled(!nextSound);
      setError(formatApiError(requestError, 'Your sound setting could not be saved.'));
    }
  };

  return (
    <main className={`routine-page ${sensoryFriendly ? 'routine-sensory-friendly' : ''}`}>
      <header className="routine-hero">
        <div className="routine-hero-copy">
          <span className="routine-eyebrow">A LITTLE ADVENTURE, ONE STEP AT A TIME</span>
          <h1 className="page-title">🌞 My Daily Adventure</h1>
          <p>Let’s make today a great day! One step at a time! 🌈</p>
          <p className="routine-motivation" aria-live="polite">{motivation}</p>
        </div>
        <div className="routine-hero-controls">
          <button
            type="button"
            className="ghost-btn routine-setting"
            aria-pressed={!soundEnabled}
            onClick={toggleSound}
          >
            {soundEnabled ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
          <button
            type="button"
            className="ghost-btn routine-setting"
            aria-pressed={sensoryFriendly}
            onClick={() => setSensoryFriendly((enabled) => !enabled)}
          >
            {sensoryFriendly ? '🌿 Sensory-friendly on' : '🌿 Sensory-friendly mode'}
          </button>
        </div>
      </header>

      {error && (
        <div className="auth-message error routine-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost-btn" onClick={fetchRoutine}>Retry</button>
        </div>
      )}

      <section className="routine-summary card" aria-label="Today's real routine completion">
        <div
          className="routine-progress-ring"
          role="progressbar"
          aria-label="Routine completion"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={completion}
          style={{ '--routine-progress': `${completion}%` }}
        >
          <div className="routine-progress-ring-inner">
            <span>⭐</span>
            <strong>{loading ? '—' : `${completion}%`}</strong>
            <small>Complete</small>
          </div>
        </div>
        <div className="routine-summary-copy">
          <span className="routine-eyebrow">TODAY’S ADVENTURE</span>
          <h2>{loading ? 'Getting your day ready…' : isComplete ? 'Your whole routine is complete!' : 'Every step is a win!'}</h2>
          <p>{loading ? 'Checking your saved activities.' : `${completedCount} of ${tasks.length} activities completed`}</p>
          <div className="routine-progress-track" aria-hidden="true">
            <span style={{ width: loading ? '0%' : `${completion}%` }} />
          </div>
          {!loading && tasks.length > 0 && <small>{motivation}</small>}
        </div>
      </section>

      {!loading && nextTask && (
        <section className="routine-next-card" aria-label="Up next">
          <div className="routine-next-badge">👉 UP NEXT</div>
          <div className="routine-next-main">
            <span className="routine-next-icon" aria-hidden="true">{taskDetails[nextTask.name]?.icon || nextTask.icon || '✨'}</span>
            <div>
              <h2>{nextTask.name}</h2>
              <p>{nextTask.time}</p>
            </div>
          </div>
          <p className="routine-next-message">Ready for the next step? You’ve got this! 💪✨</p>
          <button
            type="button"
            className="primary-btn routine-next-button"
            onClick={() => toggleTask(nextTask.name, true)}
            disabled={Boolean(savingTask)}
          >
            {savingTask === nextTask.name ? 'Saving…' : `Complete ${nextTask.name} ✓`}
          </button>
        </section>
      )}

      {isComplete && !loading && (
        <section className="routine-celebration" role="status" aria-live="polite">
          <span className="routine-celebration-icon" aria-hidden="true">🎉</span>
          <div>
            <span className="routine-eyebrow">AMAZING!</span>
            <h2>You completed your whole day!</h2>
            <p>🌟 You should be proud of yourself!</p>
          </div>
        </section>
      )}

      <section className="routine-timeline-section">
        <div className="routine-section-heading">
          <div>
            <span className="routine-eyebrow">YOUR DAY, YOUR PACE</span>
            <h2>Today’s adventure steps</h2>
          </div>
          <div className="routine-timeline-heading-actions">
            {!loading && tasks.length > 0 && <span className="routine-step-count">{completedCount}/{tasks.length} done</span>}
            <PixelBuddy
              state={isComplete ? 'celebrate' : nextTask ? 'walk' : 'idle'}
              message={isComplete ? 'You did it! Your day is complete!' : 'One step at a time!'}
              animationsEnabled={!sensoryFriendly}
              sensoryFriendly={sensoryFriendly}
              className="routine-pixel-buddy"
            />
          </div>
        </div>

        {loading ? (
          <div className="routine-loading card" role="status">Loading today’s activities…</div>
        ) : tasks.length === 0 ? (
          <div className="routine-loading card">No routine steps are available right now.</div>
        ) : (
          <ol className="routine-timeline">
            {tasks.map((task, index) => {
              const done = Boolean(task.completed);
              const current = !done && nextTask?.name === task.name;
              const detail = taskDetails[task.name] || { icon: task.icon || '✨', description: 'Take this step at your own pace.' };
              return (
                <li
                  key={task.name}
                  className={`routine-timeline-item ${done ? 'completed' : ''} ${current ? 'current' : 'upcoming'}`}
                >
                  <span className="routine-timeline-rail" aria-hidden="true">
                    <span className="routine-timeline-marker">{done ? '✓' : detail.icon}</span>
                  </span>
                  <button
                    type="button"
                    className="routine-timeline-card"
                    onClick={() => toggleTask(task.name)}
                    disabled={Boolean(savingTask)}
                    aria-pressed={done}
                    aria-label={`${done ? 'Mark incomplete' : 'Complete'} ${task.name}, ${task.time}`}
                  >
                    <span className="routine-task-status">
                      {savingTask === task.name ? 'Saving…' : done ? '✓ Great job! 🎉' : current ? '✨ 👉 Up Next' : '○ Coming up'}
                    </span>
                    <span className="routine-timeline-heading">
                      <span className="routine-task-icon" aria-hidden="true">{detail.icon}</span>
                      <span className="routine-task-title">{task.name}</span>
                      <time>{task.time}</time>
                    </span>
                    <span className="routine-task-description">{detail.description}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <p className="routine-safe-note">You can complete activities in any order. Every small step counts. 🌱</p>
    </main>
  );
}
