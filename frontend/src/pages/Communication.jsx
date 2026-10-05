import { useEffect, useMemo, useState } from 'react';
import SentenceBuilder from '../components/SentenceBuilder';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';
import { speakText, speechSupported } from '../services/speech';

export default function Communication() {
  const [categories, setCategories] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState([]);
  const [exerciseFeedback, setExerciseFeedback] = useState('');
  const [scenarioFeedback, setScenarioFeedback] = useState({});
  const [freeSentence, setFreeSentence] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCommunication = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/communication');
      const data = response.data || {};
      setCategories(data.categories || []);
      setExercises(data.sentence_exercises || []);
      setScenarios(data.scenarios || []);
      setCards(data.cards || []);
      setAttempts(Number(data.progress?.attempts || 0));
      setCorrect(Number(data.progress?.correct || 0));
      setCompleted(Number(data.progress?.completed_activities || 0));
    } catch (requestError) {
      setError(formatApiError(requestError, 'Communication could not load. Please try again.'));
      setCategories([]);
      setExercises([]);
      setScenarios([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCommunication(); }, []);

  const visibleExercises = useMemo(
    () => selectedCategory === 'All' ? exercises : exercises.filter((exercise) => exercise.category === selectedCategory),
    [exercises, selectedCategory],
  );
  const currentExercise = visibleExercises[exerciseIndex % Math.max(visibleExercises.length, 1)];

  const chooseCategory = (category) => {
    setSelectedCategory(category);
    setExerciseIndex(0);
    setSelectedWords([]);
    setExerciseFeedback('');
  };

  const addFreeWord = async (word) => {
    const next = [...freeSentence, word];
    setFreeSentence(next);
    try {
      await api.post('/api/communication', { phrase: next.join(' '), category: 'picture-cards', spoken: false });
    } catch (requestError) {
      setError(formatApiError(requestError, 'That word could not be saved.'));
    }
  };

  const chooseExerciseWord = (word) => {
    if (!currentExercise || submitting) return;
    setSelectedWords([...currentExercise.answer.slice(0, -1), word]);
    setExerciseFeedback('');
  };

  const submitExercise = async () => {
    if (!currentExercise || submitting) return;
    setSubmitting(true);
    setAttempts((value) => value + 1);
    const phrase = selectedWords.join(' ');
    const isCorrect = JSON.stringify(selectedWords) === JSON.stringify(currentExercise.answer);
    try {
      await api.post('/api/communication', { phrase, category: `${isCorrect ? 'sentence-correct' : 'sentence-attempt'}:${currentExercise.category}`, spoken: false });
      if (isCorrect) {
        setCorrect((value) => value + 1);
        setCompleted((value) => value + 1);
        setExerciseFeedback('Great job! ⭐');
        setTimeout(() => {
          setExerciseIndex((value) => value + 1);
          setSelectedWords([]);
          setExerciseFeedback('');
        }, 650);
      } else {
        setExerciseFeedback('Almost! Try again 😊');
      }
    } catch (requestError) {
      setError(formatApiError(requestError, 'We could not save that sentence. Please retry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScenario = async (scenario, choice) => {
    const isCorrect = choice === scenario.answer;
    setScenarioFeedback((current) => ({ ...current, [scenario.id]: isCorrect ? 'Great job! ⭐' : 'Almost! Try again 😊' }));
    try {
      await api.post('/api/communication', { phrase: choice, category: `${isCorrect ? 'scenario-correct' : 'scenario-attempt'}:${scenario.id}`, spoken: false });
      if (isCorrect) setCompleted((value) => value + 1);
    } catch (requestError) {
      setError(formatApiError(requestError, 'We could not save that practice answer.'));
    }
  };

  const listen = (text) => {
    if (!speechSupported()) {
      setError('Read Aloud is not available in this browser.');
      return;
    }
    speakText(text, { onError: () => setError('Read Aloud could not start. Please try again.') });
  };

  return (
    <div className="communication-page">
      <div className="topbar">
        <div><p className="dashboard-kicker">EXPRESS, CONNECT, GROW</p><h1 className="page-title">Communication</h1><p className="subtle">Build sentences and practice everyday words at your own pace.</p></div>
        <div className="communication-stats"><strong>{completed}</strong><small>activities completed</small><strong>{correct}</strong><small>correct choices</small></div>
      </div>

      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={loadCommunication}>Retry</button></div>}

      <div className="card communication-exercise-card">
        <div className="communication-section-heading"><div><span className="dashboard-eyebrow">🧩 Sentence Builder</span><h2>Choose the missing words</h2></div><span className="communication-attempts">Attempts: {attempts}</span></div>
        <div className="communication-category-row" aria-label="Sentence categories">
          <button type="button" className={`communication-category ${selectedCategory === 'All' ? 'active' : ''}`} onClick={() => chooseCategory('All')}>✨ All</button>
          {categories.map((item) => <button key={item.name} type="button" className={`communication-category ${selectedCategory === item.name ? 'active' : ''}`} onClick={() => chooseCategory(item.name)}>{item.icon} {item.name}</button>)}
        </div>
        {loading ? <p>Loading sentence activities...</p> : currentExercise ? (
          <>
            <SentenceBuilder exercise={currentExercise} selectedWords={selectedWords} onWord={chooseExerciseWord} onClear={() => { setSelectedWords([]); setExerciseFeedback(''); }} onListen={() => listen(selectedWords.join(' '))} onSubmit={submitExercise} submitting={submitting} />
            <p className={`learning-feedback ${exerciseFeedback === 'Great job! ⭐' ? 'success' : ''}`} aria-live="polite">{exerciseFeedback || 'Tap a word to complete the sentence.'}</p>
          </>
        ) : <p>{error ? 'Sentence activities are unavailable until the service reconnects.' : 'No sentence activities are available yet.'}</p>}
      </div>

      <div className="card communication-scenario-card">
        <div className="communication-section-heading"><div><span className="dashboard-eyebrow">💬 Everyday Practice</span><h2>What can I say?</h2></div><small>Choose a helpful sentence.</small></div>
        <div className="communication-scenario-grid">
          {!loading && scenarios.length === 0 && <p>{error ? 'Everyday practice is unavailable until the service reconnects.' : 'No scenario activities are available yet.'}</p>}
          {scenarios.map((scenario) => <div key={scenario.id} className="communication-scenario"><div className="communication-scenario-title"><span>{scenario.icon}</span><strong>{scenario.prompt}</strong></div><div className="communication-scenario-choices">{scenario.choices.map((choice) => <button key={choice} type="button" className="communication-scenario-choice" onClick={() => handleScenario(scenario, choice)}>{choice}</button>)}</div><p className={`learning-feedback ${scenarioFeedback[scenario.id] === 'Great job! ⭐' ? 'success' : ''}`}>{scenarioFeedback[scenario.id] || 'Pick one.'}</p></div>)}
        </div>
      </div>

      <div className="card communication-free-builder">
        <div className="communication-section-heading"><div><span className="dashboard-eyebrow">🖼️ Picture Words</span><h2>Build your own sentence</h2></div><button type="button" className="ghost-btn" onClick={() => listen(freeSentence.join(' ') || 'I want water.')}>🔊 Listen</button></div>
        <div className="free-sentence-display">{freeSentence.length ? freeSentence.join(' ') : 'Tap picture words below.'}</div>
        {cards.length ? <div className="communication-card-grid">{cards.map((card) => <button key={card.key} type="button" className="communication-word-card" onClick={() => addFreeWord(card.label.toLowerCase())}><span>{card.emoji}</span><strong>{card.label}</strong></button>)}</div> : <p>Picture words are unavailable until the service reconnects.</p>}
        <button type="button" className="ghost-btn" onClick={() => setFreeSentence([])} disabled={!freeSentence.length}>🔄 Clear</button>
      </div>
    </div>
  );
}
