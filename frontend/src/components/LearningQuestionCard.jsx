import { useState } from 'react';

export default function LearningQuestionCard({ question, questionNumber, total, level, onAttempt, onSubmit, saving }) {
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('');
  const isCorrect = feedback === 'Great job! ⭐';

  const choose = async (choice) => {
    if (saving || isCorrect) return;
    setSelected(choice);
    setFeedback('Checking your answer...');
    const result = await onAttempt({ question, answer: choice });
    if (!result.saved) {
      setFeedback('Your answer could not be saved. Please try again.');
      return;
    }
    setFeedback(result.isCorrect ? 'Great job! ⭐' : 'Almost! Try again 😊');
  };

  const next = async () => {
    if (!selected || !isCorrect) return;
    await onSubmit();
    setSelected('');
    setFeedback('');
  };

  return (
    <div className="learning-question-card">
      <div className="learning-question-meta">
        <span>Level {level}</span>
        <strong>Question {questionNumber} of {total}</strong>
      </div>
      <div className="learning-question-progress" role="progressbar" aria-valuenow={questionNumber} aria-valuemin="1" aria-valuemax={total}>
        <span style={{ width: `${(questionNumber / total) * 100}%` }} />
      </div>
      {question.visual && <div className="learning-visual" aria-hidden="true">{question.visual}</div>}
      <p className="learning-prompt">{question.prompt}</p>
      <div className="learning-choice-grid">
        {question.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`learning-choice ${selected === choice ? 'selected' : ''} ${selected === choice && isCorrect ? 'correct' : ''}`}
            onClick={() => choose(choice)}
            disabled={saving || feedback === 'Great job! ⭐'}
          >
            {choice}
          </button>
        ))}
      </div>
      <p className={`learning-feedback ${isCorrect ? 'success' : ''}`} aria-live="polite">{feedback || 'Choose an answer to begin.'}</p>
      <button type="button" className="primary-btn learning-next-btn" onClick={next} disabled={!isCorrect || saving}>
        {saving ? 'Saving...' : questionNumber === total ? 'Finish Activity' : 'Next Question'}
      </button>
    </div>
  );
}
