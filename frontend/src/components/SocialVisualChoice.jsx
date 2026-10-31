export default function SocialVisualChoice({ option, selected, onClick, onListen, soundEnabled, disabled }) {
  return (
    <div className="social-visual-choice-wrap">
      <button
        type="button"
        className={`social-visual-choice ${selected ? 'selected' : ''}`}
        aria-pressed={Boolean(selected)}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="social-choice-picture" aria-hidden="true">{option.image || '💬'}</span>
        <span className="social-choice-copy">
          <strong>{option.text}</strong>
          {option.helpful && <small>One friendly way to respond</small>}
        </span>
      </button>
      {soundEnabled && <button type="button" className="social-choice-audio" aria-label={`Listen to ${option.text}`} onClick={onListen}>🔊</button>}
    </div>
  );
}
