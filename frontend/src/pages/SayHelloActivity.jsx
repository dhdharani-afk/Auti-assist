import { useEffect, useRef, useState } from 'react';
import MissionActivityLayout from '../components/MissionActivityLayout';
import MissionResult from '../components/MissionResult';
import api from '../services/api';
import { completeMission, getTodayMission } from '../services/mission';
import { formatApiError } from '../utils/apiError';
import { speakText, speechSupported, stopSpeaking } from '../services/speech';

export default function SayHelloActivity() {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSpeechAvailable(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
    getTodayMission()
      .then((status) => {
        const mission = status.missions?.find((item) => item.key === 'say-hello');
        if (mission?.completed) setCompleted(true);
      })
      .catch((requestError) => setError(formatApiError(requestError, 'We could not load this mission. Please try again.')))
      .finally(() => setLoading(false));

    return () => recognitionRef.current?.stop();
  }, []);

  const finishMission = async (spoken) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/communication', {
        phrase: 'Hello!',
        category: 'mission-say-hello',
        spoken,
      });
      const result = await completeMission('say-hello');
      setStarsEarned(result.new_stars_earned ?? (result.status === 'saved' ? result.stars_earned : 0));
      setCompleted(true);
      setFeedback('Nice speaking! ⭐');
    } catch (requestError) {
      setError(formatApiError(requestError, 'Your greeting could not be saved. Please try again.'));
    } finally {
      setSaving(false);
      setListening(false);
    }
  };

  const hearHello = () => {
    const result = speakText('Hello!', {
      onError: () => setError('Speech playback could not start. You can still use the manual button.'),
    });
    if (!result.started) setError('Speech playback is not available in this browser. You can still use the manual button.');
  };

  const startListening = () => {
    if (!speechAvailable || saving || completed) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setError(''); setFeedback('Listening... say Hello!'); };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim().toLowerCase() || '';
      if (transcript.includes('hello')) finishMission(true);
      else setFeedback('I heard something different. Try saying Hello! or use I said it!');
    };
    recognition.onerror = () => {
      setListening(false);
      setError('I could not hear that clearly. Try again or use I said it!');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  if (loading) return <MissionActivityLayout eyebrow="👋 SPEAK & CONNECT" title="Practice Saying Hello" description="Loading your communication mission..."><p>Getting ready to practice...</p></MissionActivityLayout>;
  if (completed) return <MissionActivityLayout eyebrow="👋 SPEAK & CONNECT" title="Practice Saying Hello" description="A warm hello is a wonderful way to connect."><MissionResult starsEarned={starsEarned} title="🎉 Hello mission complete!" /></MissionActivityLayout>;

  return (
    <MissionActivityLayout eyebrow="👋 SPEAK & CONNECT" title="Practice Saying Hello" description="This is a friendly speaking practice, not a clinical speech assessment.">
      <div className="hello-activity-panel">
        <div className="hello-emoji" aria-hidden="true">👋</div>
        <h2>Let’s practice saying Hello! 👋</h2>
        <p>When you are ready, say:</p>
        <strong className="hello-phrase">“Hello!”</strong>
      </div>
      <div className="hello-actions">
        <button type="button" className="secondary-btn" onClick={hearHello} disabled={saving}>🔊 Hear</button>
        {speechAvailable && <button type="button" className="primary-btn" onClick={startListening} disabled={listening || saving}>{listening ? '🎤 Listening...' : '🎤 Speak'}</button>}
        <button type="button" className="ghost-btn" onClick={() => finishMission(false)} disabled={saving}>I said it!</button>
      </div>
      <p className="mission-feedback" aria-live="polite">{feedback || 'There is no rush. Choose the way that feels comfortable.'}</p>
      {!speechAvailable && <p className="mission-status">Speech recognition is not available here, so the manual button is ready for you.</p>}
      {saving && <p className="mission-status">Saving your greeting...</p>}
      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={() => finishMission(false)}>Retry save</button></div>}
    </MissionActivityLayout>
  );
}
