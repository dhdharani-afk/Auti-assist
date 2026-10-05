import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

export default function Routine() {
  const [tasks, setTasks] = useState([]);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState('');
  const [error, setError] = useState('');

  const fetchRoutine = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/routine');
      setTasks(response.data.tasks || []);
      setCompletion(response.data.completion || 0);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Routine could not load. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutine(); }, []);

  const toggleTask = async (taskName) => {
    const currentTask = tasks.find((task) => task.name === taskName);
    if (!currentTask || savingTask) return;
    const nextCompleted = !currentTask.completed;
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

  return (
    <div>
      <div className="topbar">
        <div><h1 className="page-title">My Routine</h1><p className="subtle">Track the day and celebrate progress.</p></div>
      </div>

      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={fetchRoutine}>Retry</button></div>}
      <div className="card">
        <div className="section-header"><h2 style={{ margin: 0 }}>Routine Completion</h2><strong>{completion}%</strong></div>
        <div className="progress-track"><div className="progress-bar" style={{ width: `${completion}%` }} /></div>
        {loading ? <p className="routine-empty">Loading today’s routine...</p> : tasks.length === 0 ? <p className="routine-empty">No routine steps are available.</p> : (
          <div className="routine-task-grid">
            {tasks.map((task) => (
              <button key={task.name} type="button" className={`routine-task ${task.completed ? 'done' : ''}`} onClick={() => toggleTask(task.name)} disabled={Boolean(savingTask)} aria-pressed={task.completed}>
                <span className="routine-task-icon" aria-hidden="true">{task.icon}</span>
                <span className="routine-task-copy"><strong>{task.name}</strong><small>{task.time}</small></span>
                <span aria-hidden="true">{savingTask === task.name ? '…' : task.completed ? '✓' : '○'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
