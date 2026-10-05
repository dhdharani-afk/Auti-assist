import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const categoryIcons = {
  Greetings: '👋',
  School: '🏫',
  'Making Friends': '🧑‍🤝‍🧑',
  Conversation: '💬',
  'Asking for Help': '🙏',
  'Sharing & Taking Turns': '🧸',
  Disagreement: '🤝',
  'Everyday Situations': '🛒',
  'Personal Boundaries': '🚪',
};

export default function SocialSituationSimulator() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [progress, setProgress] = useState({ scenarios_attempted: 0, scenarios_completed: 0, categories_practiced: 0, stars_earned: 0, progress: 0 });
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
    const [responseIds, setResponseIds] = useState([]);
  const [message, setMessage] = useState('Choose a situation to begin practicing.');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scenarioResponse, progressResponse] = await Promise.all([
        api.get('/api/social-simulator/scenarios'),
        api.get('/api/social-simulator/progress'),
      ]);
      setScenarios(scenarioResponse.data.scenarios || []);
      setProgress(progressResponse.data);
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'We could not load the practice space. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const categories = useMemo(() => ['All', ...new Set(scenarios.map((scenario) => scenario.category))], [scenarios]);
  const visibleScenarios = category === 'All' ? scenarios : scenarios.filter((scenario) => scenario.category === category);
  const currentStep = selected?.steps?.[stepIndex];

  const readAloud = (text) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  };

  const chooseScenario = (scenario) => {
    setSelected(scenario);
    setStepIndex(0);
    setFeedback(null);
    setAttempts(0);
    setResponseIds([]);
    setMessage('Take your time. There is no rush.');
  };

  const chooseResponse = (option) => {
    setAttempts((value) => value + 1);
    if (option.helpful) setResponseIds((current) => [...current, option.id]);
    const bestOption = currentStep.options.find((item) => item.helpful);
    setFeedback({ helpful: option.helpful, text: option.helpful ? `🌟 Nice choice! ${currentStep.feedback}` : `😊 Let’s try another way. You could say “${bestOption.text}”` });
  };

  const continueScenario = async () => {
    if (!selected || !feedback) return;
    if (!feedback.helpful) return;
    if (stepIndex < selected.steps.length - 1) {
      setStepIndex((value) => value + 1);
      setFeedback(null);
      setMessage('Here comes the next part of the conversation.');
      return;
    }

    try {
      await api.post('/api/social-simulator/result', {
        scenario_id: selected.id,
        category: selected.category,
        attempts: Math.max(1, attempts),
        completed: true,
        response_ids: responseIds,
      });
      await loadData();
      setSelected(null);
      setFeedback(null);
      setMessage('🎉 Great practice! ⭐ +2 Stars');
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Your practice could not be saved. Please try again.');
    }
  };

  if (user?.role && user.role !== 'child') return <div className="card"><h2>Child practice space</h2><p>This activity is available for child profiles.</p></div>;

  return (
    <div className="social-simulator-page fade-in-up">
      <div className="topbar social-topbar">
        <div><span className="social-kicker">PRACTICE, PAUSE, TRY AGAIN</span><h1 className="page-title">🤝 Social Situation Simulator</h1><p className="subtle">Practice everyday conversations in a safe space.</p></div>
        <div className="social-stars">⭐ <strong>{progress.stars_earned}</strong><small>practice stars</small></div>
      </div>

      <div className="social-progress-strip">
        <div><span>Situations tried</span><strong>{progress.scenarios_attempted}</strong></div>
        <div><span>Completed</span><strong>{progress.scenarios_completed}</strong></div>
        <div><span>Categories</span><strong>{progress.categories_practiced}</strong></div>
        <div className="social-progress-meter"><span>Practice progress</span><strong>{progress.progress}%</strong><i><b style={{ width: `${progress.progress}%` }} /></i></div>
      </div>

      {!selected ? (
        <>
          <div className="social-section-heading"><div><h2>Pick a practice path</h2><p>Every answer is a chance to practice. Choose what feels comfortable today.</p></div></div>
          <div className="social-category-row">{categories.map((item) => <button type="button" key={item} className={`social-category ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>{item === 'All' ? '✨' : categoryIcons[item]} <span>{item}</span></button>)}</div>
          <div className="social-scenario-grid">{loading ? <div className="card">Loading practice situations...</div> : visibleScenarios.map((scenario) => <button type="button" className="social-scenario-card" key={scenario.id} onClick={() => chooseScenario(scenario)}><span className="social-scenario-icon">{categoryIcons[scenario.category]}</span><span className="social-scenario-category">{scenario.category}</span><strong>{scenario.title}</strong><small>{scenario.steps.length} {scenario.steps.length === 1 ? 'conversation step' : 'conversation steps'} · {scenario.difficulty}</small><span className="social-start">Practice →</span></button>)}</div>
        </>
      ) : (
        <div className="social-practice-layout">
          <button type="button" className="ghost-btn social-back" onClick={() => setSelected(null)}>← Back to situations</button>
          <div className="social-practice-card">
            <div className="social-practice-heading"><div><span className="social-scenario-category">{categoryIcons[selected.category]} {selected.category}</span><h2>{selected.title}</h2></div><span className="social-step-count">Step {stepIndex + 1} of {selected.steps.length}</span></div>
            <div className="social-step-dots">{selected.steps.map((_, index) => <span key={index} className={index <= stepIndex ? 'active' : ''} />)}</div>
            <div className="social-situation"><span>💭 SITUATION</span><p>{currentStep.situation}</p><button type="button" className="ghost-btn" onClick={() => readAloud(`${currentStep.situation} ${currentStep.question}`)}>🔊 Read aloud</button></div>
            <h3>{currentStep.question}</h3>
            <div className="social-options">{currentStep.options.map((option) => <button type="button" key={option.id} className={`social-option ${feedback ? 'answered' : ''}`} disabled={Boolean(feedback)} onClick={() => chooseResponse(option)}><b>{option.id.toUpperCase()}</b><span>{option.text}</span></button>)}</div>
            {feedback && <div className={`social-feedback ${feedback.helpful ? 'helpful' : 'try-again'}`}><strong>{feedback.text}</strong>{feedback.helpful ? <button type="button" className="primary-btn" onClick={continueScenario}>{stepIndex < selected.steps.length - 1 ? 'Next situation →' : 'Finish practice ✨'}</button> : <button type="button" className="primary-btn" onClick={() => setFeedback(null)}>Try again</button>}</div>}
          </div>
        </div>
      )}
      <p className="social-safe-note">This is an educational practice activity. There are many ways to communicate, and you can always choose what feels right for you.</p>
      {message && !selected && <div className="auth-message success social-message">{message}</div>}
    </div>
  );
}
