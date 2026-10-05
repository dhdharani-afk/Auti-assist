import { useEffect, useMemo, useState } from 'react';
import LearningQuestionCard from '../components/LearningQuestionCard';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

const categoryIcons = { Alphabet: '🔤', Numbers: '🔢', Colours: '🎨', Shapes: '🔺', Animals: '🐶', Fruits: '🍎' };

function chooseSession(questions, level) {
  const available = questions.filter((question) => question.level <= level);
  return [...(available.length >= 10 ? available : questions)].sort(() => Math.random() - 0.5).slice(0, 10);
}

export default function Learning() {
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [category, setCategory] = useState('Colours');
  const [level, setLevel] = useState(1);
  const [performance, setPerformance] = useState({ attempts: 0, correct: 0, accuracy: 0 });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [sessionStars, setSessionStars] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLearning = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/learning');
      const data = response.data || {};
      setCategories(data.categories || []);
      setQuestions(data.activities || []);
      setLevel(data.level || 1);
      setPerformance(data.recent_performance || { attempts: 0, correct: 0, accuracy: 0 });
    } catch (requestError) {
      setError(formatApiError(requestError, 'Learning could not load. Please try again.'));
      setCategories([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLearning(); }, []);

  const categoryQuestions = useMemo(() => {
    const all = questions.filter((question) => question.category === category);
    return all.filter((question) => question.level <= level);
  }, [questions, category, level]);
  const currentQuestion = categoryQuestions[questionIndex];

  const selectCategory = (newCategory) => {
    setCategory(newCategory);
    setQuestionIndex(0);
    setCorrectAnswers(0);
    setSessionStars(0);
    setAttempted(0);
    setSessionComplete(false);
  };

  const startFreshSession = () => {
    const session = chooseSession(categoryQuestions, level);
    setQuestions((current) => [...current.filter((question) => question.category !== category), ...session]);
    setQuestionIndex(0);
    setCorrectAnswers(0);
    setSessionStars(0);
    setAttempted(0);
    setSessionComplete(false);
  };

  const handleAttempt = async ({ question, answer }) => {
    setSaving(true);
    try {
      const response = await api.post('/api/learning/result', {
        question: question.prompt,
        answer,
        is_correct: false,
        score: 0,
        category: question.category,
        difficulty: question.level === 1 ? 'beginner' : question.level === 2 ? 'intermediate' : 'challenge',
      });
      const isCorrect = Boolean(response.data?.is_correct);
      setAttempted((value) => value + 1);
      if (isCorrect) {
        setCorrectAnswers((value) => value + 1);
        setSessionStars((value) => value + Number(response.data?.stars_earned || 0));
      }
      return { saved: true, isCorrect };
    } catch (requestError) {
      setError(formatApiError(requestError, 'We could not save that answer. Please retry.'));
      return { saved: false, isCorrect: false };
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (questionIndex >= categoryQuestions.length - 1 || questionIndex >= 9) setSessionComplete(true);
    else setQuestionIndex((value) => value + 1);
  };

  const categoryLabel = categories.find((item) => item.name === category);

  return (
    <div className="learning-page">
      <div className="topbar">
        <div><p className="dashboard-kicker">PLAY, PRACTICE, GROW</p><h1 className="page-title">Learning</h1><p className="subtle">Choose a path and enjoy a 5–10 question activity.</p></div>
        <div className="learning-level-badge">⭐ Level {level}<small>{performance.attempts ? `${performance.accuracy}% recent accuracy` : 'Starting gently'}</small></div>
      </div>

      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={loadLearning}>Retry</button></div>}

      <div className="learning-category-strip card" aria-label="Learning categories">
        <div className="learning-category-heading"><h2>Choose a category</h2><span>{categoryLabel?.question_count || categoryQuestions.length || 0} questions ready</span></div>
        <div className="learning-category-grid">
          {(categories.length ? categories : Object.keys(categoryIcons).map((name) => ({ name, icon: categoryIcons[name] }))).map((item) => (
            <button key={item.name} type="button" className={`learning-category ${category === item.name ? 'active' : ''}`} onClick={() => selectCategory(item.name)}><span>{item.icon || categoryIcons[item.name]}</span><strong>{item.name}</strong></button>
          ))}
        </div>
      </div>

      {loading ? <div className="card learning-loading">Loading your learning adventure...</div> : sessionComplete ? (
        <div className="card learning-complete" role="status"><div className="learning-complete-icon">🎉</div><h2>Great work!</h2><p>{correctAnswers}/{Math.min(10, categoryQuestions.length)} completed correctly</p><strong>⭐ Stars earned: {sessionStars}</strong><button type="button" className="primary-btn" onClick={startFreshSession}>Try another set</button></div>
      ) : currentQuestion ? (
        <div className="card learning-session-card"><LearningQuestionCard key={`${category}-${currentQuestion.id}-${questionIndex}`} question={currentQuestion} questionNumber={questionIndex + 1} total={Math.min(10, categoryQuestions.length)} level={level} onAttempt={handleAttempt} onSubmit={handleSubmit} saving={saving} /><div className="learning-session-summary">Questions attempted: {attempted} · Correct: {correctAnswers}</div></div>
      ) : <div className="card learning-empty"><h2>No questions are ready yet.</h2><button type="button" className="primary-btn" onClick={loadLearning}>Reload activities</button></div>}
    </div>
  );
}
