import { useMemo, useState } from 'react';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function ShapeVisual({ value }) {
  return <span className={`game-shape-visual shape-${value}`} aria-hidden="true" />;
}

export default function GameRoundEngine({ rounds, gameName, difficulty, onFinish }) {
  const session = useMemo(() => shuffle(rounds || []), [rounds]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const round = session[roundIndex];
  const choices = useMemo(() => round ? shuffle(round.choices || []) : [], [round]);
  const isCorrect = feedback === 'Great job! ⭐';

  const choose = (choice) => {
    if (selected || !round) return;
    setSelected(choice.value);
    if (choice.value === round.answer) {
      setCorrectCount((value) => value + 1);
      setFeedback('Great job! ⭐');
    } else {
      setFeedback('Almost! Try again 😊');
    }
  };

  const retry = () => {
    setSelected('');
    setFeedback('');
  };

  const continueRound = () => {
    if (!isCorrect) return;
    if (roundIndex === session.length - 1) {
      onFinish(correctCount, session.length, Math.round((Date.now() - startTime) / 1000), `🎉 You completed all ${session.length} rounds!`);
      return;
    }
    setRoundIndex((value) => value + 1);
    setSelected('');
    setFeedback('');
  };

  if (!round) return <div className="card game-empty">No rounds are available for this game.</div>;

  return (
    <div className="question-panel">
      <div className="mini-topline">
        <span>{gameName} · {difficulty}</span>
        <strong>Round {roundIndex + 1}/{session.length}</strong>
      </div>
      <div className="game-round-progress" role="progressbar" aria-valuemin="0" aria-valuemax={session.length} aria-valuenow={roundIndex}>
        <span style={{ width: `${(roundIndex / session.length) * 100}%` }} />
      </div>
      {round.visual && <div className="game-round-visual" aria-hidden="true">{round.visual}</div>}
      <div className="prompt-text">{round.prompt}</div>
      <div className={`choice-grid ${round.kind === 'colour' ? 'colours-grid' : round.kind === 'shape' ? 'shaped-grid' : round.kind === 'visual' ? 'attention-row' : 'number-grid'}`}>
        {choices.map((choice, index) => (
          <button
            key={`${round.id}-${choice.value}-${index}`}
            type="button"
            className={`choice-btn ${round.kind === 'colour' ? 'colour-choice' : round.kind === 'shape' ? 'shape-choice' : round.kind === 'visual' ? 'attention-btn' : 'number-choice'}`}
            onClick={() => choose(choice)}
            style={round.kind === 'colour' ? { backgroundColor: choice.swatch } : undefined}
            aria-label={`Choose ${choice.label}`}
            disabled={Boolean(selected)}
          >
            {round.kind === 'shape' ? <><ShapeVisual value={choice.value} /><span>{choice.label}</span></> : round.kind === 'colour' ? <span>{choice.label}</span> : choice.label}
          </button>
        ))}
      </div>
      <div className="game-round-actions" aria-live="polite">
        <strong className={isCorrect ? 'success' : ''}>{feedback || 'Take your time and choose an answer.'}</strong>
        {feedback && !isCorrect && <button type="button" className="secondary-btn" onClick={retry}>Try again</button>}
        {isCorrect && <button type="button" className="primary-btn" onClick={continueRound}>{roundIndex === session.length - 1 ? 'Finish Game' : 'Next Round'}</button>}
      </div>
    </div>
  );
}
