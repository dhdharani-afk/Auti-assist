import { useEffect, useState } from 'react';
import MissionActivityLayout from '../components/MissionActivityLayout';
import MissionProgress from '../components/MissionProgress';
import MissionResult from '../components/MissionResult';
import api from '../services/api';
import { completeMission, getTodayMission } from '../services/mission';
import { formatApiError } from '../utils/apiError';

const rounds = [
  { question: 'Which one is Happy?', answer: 'happy', choices: [{ key: 'happy', label: 'Happy', face: '😊' }, { key: 'sad', label: 'Sad', face: '😢' }, { key: 'angry', label: 'Angry', face: '😠' }] },
  { question: 'Which one is Sad?', answer: 'sad', choices: [{ key: 'angry', label: 'Angry', face: '😠' }, { key: 'sad', label: 'Sad', face: '😢' }, { key: 'happy', label: 'Happy', face: '😊' }] },
  { question: 'Which one is Angry?', answer: 'angry', choices: [{ key: 'sad', label: 'Sad', face: '😢' }, { key: 'happy', label: 'Happy', face: '😊' }, { key: 'angry', label: 'Angry', face: '😠' }] },
];

export default function EmotionMatchActivity() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodayMission()
      .then((status) => {
        const mission = status.missions?.find((item) => item.key === 'emotion-match');
        if (mission?.completed) setCompleted(true);
      })
      .catch((requestError) => setError(formatApiError(requestError, 'We could not load this mission. Please try again.')))
      .finally(() => setLoading(false));
  }, []);

  const finishMission = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/emotion/activity', {
        emotion: 'mission-complete',
        estimated: false,
        confidence: 0,
        activity: 'Educational emotion matching mission completed',
      });
      const result = await completeMission('emotion-match');
      setStarsEarned(result.new_stars_earned ?? (result.status === 'saved' ? result.stars_earned : 0));
      setCompleted(true);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Your result could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const chooseEmotion = (choice) => {
    if (saving || feedback || completed) return;
    const round = rounds[roundIndex];
    if (choice !== round.answer) {
      setFeedback('Almost! Try again 😊');
      window.setTimeout(() => setFeedback(''), 700);
      return;
    }

    setFeedback('Great choice! ⭐');
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex === rounds.length - 1) finishMission();
      else setRoundIndex((current) => current + 1);
    }, 650);
  };

  if (loading) return <MissionActivityLayout eyebrow="😊 FEELING MATCH" title="Find 3 Emotions" description="Loading your emotion matching mission..."><p>Getting the feeling cards ready...</p></MissionActivityLayout>;
  if (completed) return <MissionActivityLayout eyebrow="😊 FEELING MATCH" title="Find 3 Emotions" description="Practice noticing feelings with friendly faces."><MissionResult starsEarned={starsEarned} title="🎉 Emotion mission complete!" /></MissionActivityLayout>;

  const round = rounds[roundIndex];

  return (
    <MissionActivityLayout eyebrow="😊 FEELING MATCH" title="Find 3 Emotions" description="This is an educational matching activity. There are no right or wrong feelings to have.">
      <MissionProgress current={roundIndex + 1} total={rounds.length} label="Emotion mission" />
      <div className="emotion-question"><span>Look carefully</span><h2>{round.question}</h2></div>
      <div className="emotion-choice-grid">
        {round.choices.map((choice) => (
          <button key={choice.key} type="button" className="emotion-choice" onClick={() => chooseEmotion(choice.key)}>
            <span className="emotion-face" aria-hidden="true">{choice.face}</span>
            <strong>{choice.label}</strong>
          </button>
        ))}
      </div>
      <p className={`mission-feedback ${feedback.startsWith('Great') ? 'success' : ''}`} aria-live="polite">{feedback || 'Choose the face that matches the question.'}</p>
      {saving && <p className="mission-status">Saving your mission result...</p>}
      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={finishMission}>Retry save</button></div>}
    </MissionActivityLayout>
  );
}
