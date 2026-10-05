import { useMemo } from 'react';

export default function SentenceBuilder({ exercise, selectedWords, onWord, onClear, onListen, onSubmit, submitting }) {
  const phrase = useMemo(() => selectedWords.join(' '), [selectedWords]);
  const prefix = exercise.answer.slice(0, -1);
  const displayWords = selectedWords.length ? selectedWords : prefix;

  return (
    <div className="sentence-builder-panel">
      <div className="sentence-prompt-header">
        <span>{exercise.icon}</span>
        <div>
          <small>{exercise.category}</small>
          <h2>{exercise.prompt}</h2>
        </div>
      </div>
      <div className="assembled-sentence" aria-live="polite" aria-label="Assembled sentence">
        {displayWords.length ? displayWords.map((word, index) => <span key={`${word}-${index}`}>{word}</span>) : <em>Tap words below to build your sentence.</em>}
        {!selectedWords.length && <span className="sentence-blank">___</span>}
      </div>
      <div className="sentence-builder-actions">
        <button type="button" className="secondary-btn" onClick={onListen} disabled={!phrase}>🔊 Listen</button>
        <button type="button" className="ghost-btn" onClick={onClear} disabled={!selectedWords.length}>🔄 Clear</button>
        <button type="button" className="primary-btn" onClick={onSubmit} disabled={!selectedWords.length || submitting}>✓ Submit</button>
      </div>
      <div className="sentence-word-grid" aria-label="Sentence words">
        {exercise.choices.map((word) => (
          <button key={word} type="button" className="sentence-word-card" onClick={() => onWord(word)} disabled={submitting}>
            {word}
          </button>
        ))}
      </div>
      <p className="sentence-preview">{phrase ? `“${phrase}.”` : 'Your sentence will appear here.'}</p>
    </div>
  );
}
