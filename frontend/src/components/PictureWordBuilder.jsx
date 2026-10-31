export default function PictureWordBuilder({
  cards,
  sentence,
  onWord,
  onListen,
  onClear,
  onSubmit,
  selectedKeys,
  title = 'Build your own sentence',
  eyebrow = '🖼️ Picture Words',
  submitLabel = 'Use this message',
  className = '',
}) {
  const selected = selectedKeys !== undefined;
  return (
    <section className={`card communication-free-builder ${className}`}>
      <div className="communication-section-heading">
        <div><span className="dashboard-eyebrow">{eyebrow}</span><h2>{title}</h2></div>
        <button type="button" className="ghost-btn" onClick={() => onListen(sentence)}>🔊 Listen</button>
      </div>
      <div className="free-sentence-display" aria-live="polite">
        {sentence || 'Tap picture words below.'}
      </div>
      {cards.length ? (
        <div className="communication-card-grid" aria-label="Picture words">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`communication-word-card ${selected && selectedKeys.includes(card.key) ? 'selected' : ''}`}
              aria-pressed={selected ? selectedKeys.includes(card.key) : undefined}
              onClick={() => onWord(card)}
            >
              <span>{card.emoji}</span><strong>{card.label}</strong>
            </button>
          ))}
        </div>
      ) : <p>Picture words are unavailable until the service reconnects.</p>}
      <div className="picture-word-actions">
        <button type="button" className="ghost-btn" onClick={onClear} disabled={!sentence}>🔄 Clear</button>
        {onSubmit && <button type="button" className="primary-btn" onClick={onSubmit}>{submitLabel}</button>}
      </div>
    </section>
  );
}
