import { useEffect, useState } from 'react';
import MissionActivityLayout from '../components/MissionActivityLayout';
import MissionProgress from '../components/MissionProgress';
import MissionResult from '../components/MissionResult';
import api from '../services/api';
import { completeMission, getTodayMission } from '../services/mission';
import { formatApiError } from '../utils/apiError';

const rounds = [
  { target: 'red', label: 'RED', choices: ['red', 'blue', 'yellow', 'green'] },
  { target: 'blue', label: 'BLUE', choices: ['yellow', 'blue', 'purple', 'orange'] },
  { target: 'yellow', label: 'YELLOW', choices: ['green', 'pink', 'yellow', 'blue'] },
  { target: 'green', label: 'GREEN', choices: ['orange', 'green', 'red', 'purple'] },
  { target: 'purple', label: 'PURPLE', choices: ['blue', 'pink', 'purple', 'yellow'] },
];

const colourNames = {
  red: '#ff7a8b',
  blue: '#77a7ff',
  yellow: '#ffd66b',
  green: '#68d6a5',
  purple: '#b696f2',
  orange: '#ffac6b',
  pink: '#f49ac2',
};

export default function ColourMatchActivity() {
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
        const mission = status.missions?.find((item) => item.key === 'colour-match');
        if (mission?.completed) setCompleted(true);
      })
      .catch((requestError) => setError(formatApiError(requestError, 'We could not load this mission. Please try again.')))
      .finally(() => setLoading(false));
  }, []);

  const finishMission = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/games/result', {
        game_name: 'Colour Mission',
        game_type: 'mission_colour_match',
        session_id: globalThis.crypto?.randomUUID?.() || `colour-mission-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        difficulty: 'easy',
        score: 1,
        correct_answers: rounds.length,
        total_questions: rounds.length,
        completed: true,
        stars_earned: 0,
      });
      const result = await completeMission('colour-match');
      setStarsEarned(result.new_stars_earned ?? (result.status === 'saved' ? result.stars_earned : 0));
      setCompleted(true);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Your result could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const chooseColour = (colour) => {
    if (saving || feedback || completed) return;
    const round = rounds[roundIndex];
    if (colour !== round.target) {
      setFeedback('Almost! Try again 😊');
      window.setTimeout(() => setFeedback(''), 700);
      return;
    }

    setFeedback('Great match! ⭐');
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex === rounds.length - 1) {
        finishMission();
      } else {
        setRoundIndex((current) => current + 1);
      }
    }, 650);
  };

  if (loading) return <MissionActivityLayout eyebrow="🎨 COLOUR PLAY" title="Match 5 Colours" description="Loading your colour mission..."><p>Getting the colours ready...</p></MissionActivityLayout>;
  if (completed) return <MissionActivityLayout eyebrow="🎨 COLOUR PLAY" title="Match 5 Colours" description="Bright colours and brilliant matching."><MissionResult starsEarned={starsEarned} title="🎉 Colour mission complete!" /></MissionActivityLayout>;

  const round = rounds[roundIndex];

  return (
    <MissionActivityLayout eyebrow="🎨 COLOUR PLAY" title="Match 5 Colours" description="Find the colour that matches the target.">
      <MissionProgress current={roundIndex + 1} total={rounds.length} label="Colour mission" />
      <div className="colour-target-panel">
        <span>Find this colour</span>
        <div className="colour-target" style={{ backgroundColor: colourNames[round.target] }} aria-label={`Target colour ${round.label}`} />
        <strong>{round.label}</strong>
      </div>
      <div className="colour-choice-grid" aria-label="Colour choices">
        {round.choices.map((colour) => (
          <button key={colour} type="button" className="colour-choice" onClick={() => chooseColour(colour)} aria-label={`Choose ${colour}`}>
            <span style={{ backgroundColor: colourNames[colour] }} />
            {colour}
          </button>
        ))}
      </div>
      <p className={`mission-feedback ${feedback.startsWith('Great') ? 'success' : ''}`} aria-live="polite">{feedback || 'Take your time. You can try again.'}</p>
      {saving && <p className="mission-status">Saving your mission result...</p>}
      {error && <div className="auth-message error"><span>{error}</span><button type="button" className="ghost-btn" onClick={finishMission}>Retry save</button></div>}
    </MissionActivityLayout>
  );
}
