import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SocialCommunicationPractice from '../components/SocialCommunicationPractice';
import SocialScenarioScene from '../components/SocialScenarioScene';
import SocialVisualChoice from '../components/SocialVisualChoice';
import api from '../services/api';
import { socialScenarioFallback } from '../data/socialScenarioFallback';
import { formatApiError } from '../utils/apiError';
import { speakText, speechSupported, stopSpeaking } from '../services/speech';
import PixelBuddy from '../components/PixelBuddy';

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

const emptyProgress = {
  scenarios_attempted: 0,
  scenarios_completed: 0,
  categories_practiced: 0,
  stars_earned: 0,
  progress: 0,
  responses_selected: 0,
  communication_practices: 0,
  speech_practices: 0,
  aac_practices: 0,
  scenario_completions: {},
};

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function SocialSituationSimulator() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [progress, setProgress] = useState(emptyProgress);
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState('picture');
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [responseIds, setResponseIds] = useState([]);
  const [message, setMessage] = useState('');
  const [interactionNotice, setInteractionNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [progressUnavailable, setProgressUnavailable] = useState(true);
  const [completion, setCompletion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sensoryFriendly, setSensoryFriendly] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const recognitionRef = useRef(null);
  const saveGuardRef = useRef(false);
  const answerGuardRef = useRef(false);

  const refreshProgress = useCallback(async () => {
    const response = await api.get('/api/social-simulator/progress');
    setProgress({ ...emptyProgress, ...response.data });
    setProgressUnavailable(false);
  }, []);

  const stopRecognition = useCallback((updateState = true) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognitionRef.current = null;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch (error) {
      console.warn('Speech recognition was already stopped.', error);
    }
    if (updateState) setListening(false);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/api/social-simulator/scenarios');
      const fetchedScenarios = response.data.scenarios || [];
      setScenarios(fetchedScenarios);
      try {
        window.sessionStorage.setItem('autiassist-social-scenarios', JSON.stringify(fetchedScenarios));
      } catch (error) {
        console.warn('Social situation data could not be cached; the live response is still available.', error);
      }
    } catch (error) {
      let cachedScenarios = [];
      try {
        cachedScenarios = JSON.parse(window.sessionStorage.getItem('autiassist-social-scenarios') || '[]');
      } catch (cacheError) {
        console.warn('Cached social situations could not be read; using the built-in practice set.', cacheError);
        cachedScenarios = [];
      }
      console.warn('The social situations API is unavailable; using saved practice content.', error);
      const usableScenarios = Array.isArray(cachedScenarios) && cachedScenarios.length
        ? cachedScenarios
        : socialScenarioFallback;
      setScenarios(usableScenarios);
      setMessage(
        Array.isArray(cachedScenarios) && cachedScenarios.length
          ? 'The practice service is offline. You can keep practicing with situations loaded earlier; progress may not save.'
          : 'The practice service is offline. You can still explore these saved practice situations; progress may not save.',
      );
    }

    try {
      await refreshProgress();
    } catch {
      setProgressUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [refreshProgress]);

  useEffect(() => {
    loadData();
    return () => {
      stopRecognition(false);
      stopSpeaking();
    };
  }, [loadData, stopRecognition]);

  const categories = useMemo(() => ['All', ...new Set(scenarios.map((scenario) => scenario.category))], [scenarios]);
  const visibleScenarios = useMemo(() => {
    const filtered = category === 'All' ? scenarios : scenarios.filter((scenario) => scenario.category === category);
    if (progress.scenarios_completed < 1) return filtered;
    return [...filtered].sort((left, right) => (
      (progress.scenario_completions?.[left.id] || 0) - (progress.scenario_completions?.[right.id] || 0)
    ));
  }, [category, progress.scenario_completions, progress.scenarios_completed, scenarios]);
  const currentStep = selected?.steps?.[stepIndex];
  const recognitionAvailable = Boolean(getSpeechRecognition());

  const recordInteraction = async (phrase, kind, spoken = false) => {
    try {
      await api.post('/api/communication', {
        phrase,
        category: `social-simulator:${kind}`,
        spoken,
      });
      setProgress((current) => ({
        ...current,
        ...(kind === 'attempt' ? { scenarios_attempted: current.scenarios_attempted + 1 } : {}),
        ...(kind === 'response' ? { responses_selected: current.responses_selected + 1 } : {}),
        ...(['speech', 'aac', 'listen'].includes(kind)
          ? { communication_practices: current.communication_practices + 1 }
          : {}),
        ...(kind === 'speech' ? { speech_practices: current.speech_practices + 1 } : {}),
        ...(kind === 'aac' ? { aac_practices: current.aac_practices + 1 } : {}),
      }));
      setInteractionNotice('');
      return true;
    } catch (error) {
      setInteractionNotice(formatApiError(error, 'This practice could not be saved just now.'));
      return false;
    }
  };

  const chooseScenario = (scenario) => {
    setSelected(scenario);
    saveGuardRef.current = false;
    answerGuardRef.current = false;
    setStepIndex(0);
    setPhase('picture');
    setSelectedObjectId('');
    setSelectedOption(null);
    setFeedback(null);
    setAttempts(0);
    setResponseIds([]);
    setCompletion(null);
    setInteractionNotice('');
    setSpeechMessage('');
    setMessage('');
    void recordInteraction(scenario.title, 'attempt');
  };

  const returnToScenarios = () => {
    setSelected(null);
    setCompletion(null);
    setFeedback(null);
    setInteractionNotice('');
  };

  const readAloud = (text) => {
    if (!soundEnabled) return;
    const result = speakText(text, {
      rate: 0.9,
      pitch: 1.08,
      onError: () => setInteractionNotice('Read aloud is not available right now.'),
    });
    if (!result.started) {
      setInteractionNotice('Read aloud is not available in this browser.');
      return;
    }
    void recordInteraction(text, 'listen', true);
  };

  const chooseResponse = (option) => {
    if (!currentStep || feedback || answerGuardRef.current) return;
    answerGuardRef.current = true;
    setAttempts((current) => current + 1);
    setSelectedOption(option.id);
    void recordInteraction(option.text, 'response');
    if (option.helpful) {
      setResponseIds((current) => [...current, option.id]);
      setFeedback({
        helpful: true,
        text: `🌟 Great choice! Let’s practice it. ${currentStep.feedback}`,
      });
      setPhase('feedback');
      return;
    }
    setFeedback({ helpful: false, text: '😊 Let’s try another way. You can choose a different response.' });
    setPhase('feedback');
  };

  const continueToCommunication = () => {
    setFeedback(null);
    setSelectedOption(null);
    setSpeechMessage('');
    setPhase('communication');
  };

  const continueScenario = async () => {
    if (!selected || saving || saveGuardRef.current || completion) return;
    stopRecognition();
    if (stepIndex < selected.steps.length - 1) {
      setStepIndex((current) => current + 1);
      answerGuardRef.current = false;
      setSelectedObjectId('');
      setSelectedOption(null);
      setFeedback(null);
      setPhase('picture');
      setInteractionNotice('');
      return;
    }

    saveGuardRef.current = true;
    setSaving(true);
    setInteractionNotice('');
    try {
      const response = await api.post('/api/social-simulator/result', {
        scenario_id: selected.id,
        category: selected.category,
        attempts: Math.max(1, attempts),
        completed: true,
        response_ids: responseIds,
      });
      setCompletion(response.data);
      setPhase('complete');
      setMessage(response.data.stars_earned ? '🌟 Two practice stars added!' : '🌟 Great practice! Keep building your skills.');
      refreshProgress().catch(() => setProgressUnavailable(true));
    } catch (error) {
      setInteractionNotice(formatApiError(error, 'Your practice could not be saved. Please try again.'));
    } finally {
      saveGuardRef.current = false;
      setSaving(false);
    }
  };

  const practiceSpeech = () => {
    if (!currentStep || listening) return;
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      void recordInteraction(currentStep.practice_sentence, 'speech', false);
      setSpeechMessage('Nice practice! You can say it aloud or practice quietly.');
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setListening(true);
        setSpeechMessage('Listening… say the sentence when you are ready.');
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        void recordInteraction(currentStep.practice_sentence, 'speech', true);
        setSpeechMessage(transcript ? `I heard: “${transcript}” — nice practicing!` : 'Nice practicing your sentence!');
      };
      recognition.onerror = () => {
        setSpeechMessage('I could not hear that clearly. Try again, use AAC, or practice without a microphone.');
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
      setSpeechMessage('The microphone could not start. You can use AAC or practice without a microphone.');
    }
  };

  const confirmSpeechPractice = () => {
    if (!currentStep) return;
    void recordInteraction(currentStep.practice_sentence, 'speech', false);
    setSpeechMessage('Nice practicing! You chose to practice saying the sentence.');
  };

  const useAac = (phrase) => {
    void recordInteraction(phrase, 'aac', false);
    setSpeechMessage('Your picture-word message is ready. Nice communicating!');
  };

  if (user?.role && user.role !== 'child') {
    return <div className="card"><h2>Child practice space</h2><p>This activity is available for child profiles.</p></div>;
  }

  return (
    <div className={`social-simulator-page fade-in-up ${sensoryFriendly ? 'sensory-friendly' : ''}`}>
      <div className="topbar social-topbar">
        <div>
          <span className="social-kicker">PRACTICE, PAUSE, TRY AGAIN</span>
          <h1 className="page-title">🤝 Social Situation Simulator</h1>
          <p className="subtle">Explore everyday moments through pictures and practice at your own pace.</p>
        </div>
        <div className="social-topbar-actions">
          <button type="button" className="ghost-btn social-setting" aria-pressed={!soundEnabled} onClick={() => {
            if (soundEnabled) stopSpeaking();
            setSoundEnabled((enabled) => !enabled);
          }}>{soundEnabled ? '🔊 Sound on' : '🔇 Sound off'}</button>
          <button type="button" className="ghost-btn social-setting" aria-pressed={sensoryFriendly} onClick={() => setSensoryFriendly((enabled) => !enabled)}>
            {sensoryFriendly ? '🌿 Sensory-friendly on' : '🌿 Sensory-friendly mode'}
          </button>
          <div className="social-stars">⭐ <strong>{progress.stars_earned}</strong><small>practice stars</small></div>
        </div>
      </div>

      <div className="social-progress-strip" aria-label="Your practice progress">
        <div><span>Situations tried</span><strong>{progressUnavailable ? '—' : progress.scenarios_attempted}</strong></div>
        <div><span>Completed</span><strong>{progressUnavailable ? '—' : progress.scenarios_completed}</strong></div>
        <div><span>Responses chosen</span><strong>{progressUnavailable ? '—' : progress.responses_selected}</strong></div>
        <div><span>Communication practice</span><strong>{progressUnavailable ? '—' : progress.communication_practices}</strong></div>
        <div><span>Speech practice</span><strong>{progressUnavailable ? '—' : progress.speech_practices}</strong></div>
        <div><span>AAC practice</span><strong>{progressUnavailable ? '—' : progress.aac_practices}</strong></div>
        <div className="social-progress-meter"><span>Practice progress</span><strong>{progressUnavailable ? '—' : `${progress.progress}%`}</strong><i><b style={{ width: progressUnavailable ? '0%' : `${progress.progress}%` }} /></i></div>
      </div>
      {progressUnavailable && <p className="social-offline-note" role="status">Your saved progress is temporarily unavailable. Practice is still here.</p>}
      {message && !selected && <div className={`auth-message ${scenarios.length ? 'success' : 'error'} social-message`} role="status">{message}</div>}

      {!selected ? (
        <>
          <div className="social-section-heading">
            <div><h2>Pick a practice path</h2><p>Every answer is a chance to practice. Choose what feels comfortable today.</p></div>
          </div>
          <div className="social-category-row" aria-label="Filter situations by category">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={`social-category ${category === item ? 'active' : ''}`}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item === 'All' ? '✨' : categoryIcons[item] || '💬'} <span>{item}</span>
              </button>
            ))}
          </div>
          {loading ? (
            <div className="card" role="status">Loading practice situations…</div>
          ) : visibleScenarios.length ? (
            <div className="social-scenario-grid">
              {visibleScenarios.map((scenario, index) => (
                <article className="social-scenario-card" key={scenario.id}>
                  {progress.scenarios_completed > 0 && index === 0 && <span className="social-recommendation">Suggested to explore</span>}
                  <SocialScenarioScene scenario={scenario} interactive={false} />
                  <span className="social-scenario-category">{categoryIcons[scenario.category] || '💬'} {scenario.category}</span>
                  <h3>{scenario.title}</h3>
                  <small>{scenario.steps.length} {scenario.steps.length === 1 ? 'conversation step' : 'conversation steps'} · {scenario.difficulty}</small>
                  <button type="button" className="social-start" onClick={() => chooseScenario(scenario)}>Practice this situation →</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="card social-empty-state">
              <span aria-hidden="true">🌱</span>
              <h2>Practice situations are taking a pause</h2>
              <p>Your saved progress stays safe. Reconnect to load the situations, or try again.</p>
              <button type="button" className="primary-btn" onClick={loadData}>Try again</button>
            </div>
          )}
        </>
      ) : (
        <div className="social-practice-layout">
          <button type="button" className="ghost-btn social-back" onClick={returnToScenarios}>← Back to situations</button>
          <div className="social-practice-card">
            <div className="social-practice-heading">
              <div><span className="social-scenario-category">{categoryIcons[selected.category] || '💬'} {selected.category} · {selected.difficulty}</span><h2>{selected.title}</h2></div>
              {phase !== 'complete' && <span className="social-step-count">Step {stepIndex + 1} of {selected.steps.length}</span>}
            </div>
            {phase !== 'complete' && <div className="social-step-dots" aria-label={`Step ${stepIndex + 1} of ${selected.steps.length}`}>
              {selected.steps.map((_, index) => <span key={index} className={index <= stepIndex ? 'active' : ''} />)}
            </div>}
            <PixelBuddy
              state={phase === 'complete' ? 'happy' : phase === 'feedback' && feedback?.helpful ? 'happy' : phase === 'picture' ? 'wave' : 'idle'}
              message={phase === 'complete' ? 'We practiced that together!' : 'Let’s explore this situation together.'}
              sensoryFriendly={sensoryFriendly}
              className="social-pixel-buddy"
            />

            {phase === 'picture' && (
              <div className="social-stage">
                <p className="social-stage-label">1 · LOOK AT THE PICTURE</p>
                <SocialScenarioScene
                  scenario={selected}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={(object) => setSelectedObjectId(object.id)}
                  interactive
                />
                <p className="social-stage-prompt" aria-live="polite">
                  {selectedObjectId
                    ? `You noticed the ${(selected.objects?.find((item) => item.id === selectedObjectId) || selected.characters?.find((item) => item.id === selectedObjectId))?.label}.`
                    : 'Tap a person or object to explore the picture, or continue when you are ready.'}
                </p>
                <button type="button" className="primary-btn" onClick={() => setPhase('understand')}>Look closer →</button>
              </div>
            )}

            {phase === 'understand' && currentStep && (
              <div className="social-stage">
                <p className="social-stage-label">2 · UNDERSTAND THE SITUATION</p>
                <div className="social-situation">
                  <div className="social-emotion-cue" aria-label={`Feeling illustration: ${selected.emotion.label}`}>
                    <span aria-hidden="true">{selected.emotion?.icon || '🙂'}</span><small>{selected.emotion?.label || 'Feeling'}</small>
                  </div>
                  <div><span>💭 THE SITUATION</span><p>{currentStep.situation}</p></div>
                  {soundEnabled && <button type="button" className="ghost-btn" onClick={() => readAloud(`${currentStep.situation} ${currentStep.question}`)}>🔊 Read aloud</button>}
                </div>
                <p className="social-safe-note">People can feel different things in the same situation. This picture is one way to explore it.</p>
                <button type="button" className="primary-btn" onClick={() => setPhase('choose')}>Choose a response →</button>
              </div>
            )}

            {phase === 'choose' && currentStep && (
              <div className="social-stage">
                <p className="social-stage-label">3 · CHOOSE A RESPONSE</p>
                <h3>{currentStep.question}</h3>
                <div className="social-options">
                  {currentStep.options.map((option) => (
                    <SocialVisualChoice
                      key={option.id}
                      option={option}
                      selected={selectedOption === option.id}
                      disabled={Boolean(feedback)}
                      soundEnabled={soundEnabled}
                      onListen={() => readAloud(option.text)}
                      onClick={() => chooseResponse(option)}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === 'feedback' && feedback && currentStep && (
              <div className="social-stage">
                <p className="social-stage-label">4 · VISUAL FEEDBACK</p>
                <div className={`social-feedback ${feedback.helpful ? 'helpful' : 'try-again'}`} role="status" aria-live="polite">
                  <span className="social-feedback-emoji" aria-hidden="true">{feedback.helpful ? '🌟' : '🌱'}</span>
                  <strong>{feedback.text}</strong>
                </div>
                {feedback.helpful ? (
                  <button type="button" className="primary-btn" onClick={continueToCommunication}>Great choice! Let’s practice it →</button>
                ) : (
                  <button type="button" className="primary-btn" onClick={() => { answerGuardRef.current = false; setFeedback(null); setSelectedOption(null); setPhase('choose'); }}>Try another way</button>
                )}
              </div>
            )}

            {phase === 'communication' && currentStep && (
              <div className="social-stage">
                <p className="social-stage-label">5 · COMMUNICATION PRACTICE</p>
                <SocialCommunicationPractice
                  sentence={currentStep.practice_sentence || currentStep.options.find((option) => option.helpful)?.text || ''}
                  onListen={() => readAloud(currentStep.practice_sentence)}
                  onPracticeSpeech={practiceSpeech}
                  speechAvailable={recognitionAvailable}
                  listening={listening}
                  onUseAac={useAac}
                  onContinue={continueScenario}
                  message={speechMessage || interactionNotice}
                />
                {interactionNotice && speechMessage && <p className="social-practice-status" role="status">{interactionNotice}</p>}
                {saving && <p className="social-practice-status" role="status">Saving your practice…</p>}
                <button type="button" className="ghost-btn social-confirm-speech" onClick={confirmSpeechPractice}>I practiced without a microphone</button>
              </div>
            )}

            {phase === 'complete' && (
              <div className="social-complete-panel" role="status" aria-live="polite">
                <span aria-hidden="true">🎉</span>
                <p className="social-stage-label">6 · SCENARIO COMPLETE</p>
                <h3>You practiced a new situation!</h3>
                <p>{message || 'Every practice is a step forward.'}</p>
                {completion?.stars_earned > 0 && <strong className="social-earned-stars">⭐ +{completion.stars_earned} stars</strong>}
                <button type="button" className="primary-btn" onClick={returnToScenarios}>Choose another situation</button>
              </div>
            )}

            {interactionNotice && phase !== 'communication' && <p className="social-practice-status" role="status">{interactionNotice}</p>}
          </div>
        </div>
      )}
      <p className="social-safe-note">This is an educational practice activity. There are many ways to communicate, and you can always choose what feels right for you.</p>
    </div>
  );
}
