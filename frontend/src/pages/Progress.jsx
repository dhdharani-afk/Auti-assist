import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useEffect, useState } from 'react';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function Progress() {
  const [data, setData] = useState({
    labels: [],
    weekly_learning_progress: [],
    activity_completion: [],
    game_scores: [],
    routine_completion: [],
    communication_progress: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await api.get('/api/progress');
        setData(response.data);
      } catch (error) {
        console.error('Progress fetch failed:', error);
        setError('Progress could not load. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const labels = data.labels || [];
  const hasActivity = (data.learning_count || 0) + (data.game_count || 0) + (data.routine_count || 0) + (data.communication_count || 0) + (data.emotion_count || 0) > 0;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100 },
    },
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">My Progress</h1>
          <p className="subtle">Child-friendly learning and activity progress.</p>
        </div>
      </div>

      {loading && <div className="card">Loading your progress...</div>}
      {error && <div className="auth-message error">{error}</div>}
      {!loading && !error && !hasActivity && <div className="card progress-empty">Your charts will grow as you complete activities. Choose one to get started.</div>}

      {!loading && !error && hasActivity && <div className="grid grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="card">
          <h3>Learning Progress</h3>
          <Line data={{ labels, datasets: [{ data: data.weekly_learning_progress, borderColor: '#6b8cff', backgroundColor: 'rgba(107,140,255,0.2)', tension: 0.35, fill: true }] }} options={chartOptions} />
        </div>
        <div className="card">
          <h3>Activity Completion</h3>
          <Bar data={{ labels, datasets: [{ data: data.activity_completion, backgroundColor: ['#6b8cff', '#9d7bff', '#46c4b5', '#ffcb6b', '#ff8e8e', '#6b8cff', '#9d7bff'] }] }} options={chartOptions} />
        </div>
        <div className="card">
          <h3>Game Performance</h3>
          <Line data={{ labels, datasets: [{ data: data.game_scores, borderColor: '#46c4b5', backgroundColor: 'rgba(70,196,181,0.2)', tension: 0.4, fill: true }] }} options={chartOptions} />
        </div>
        <div className="card">
          <h3>Routine Progress</h3>
          <Bar data={{ labels, datasets: [{ data: data.routine_completion, backgroundColor: '#9d7bff' }] }} options={chartOptions} />
        </div>
        <div className="card">
          <h3>Communication Practice</h3>
          <Line data={{ labels, datasets: [{ data: data.communication_progress, borderColor: '#ff9d6c', backgroundColor: 'rgba(255,157,108,0.18)', tension: 0.35, fill: true }] }} options={chartOptions} />
        </div>
      </div>}
    </div>
  );
}
